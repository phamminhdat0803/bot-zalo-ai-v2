/**
 * Tool Rate Limit — in-memory sliding-window rate limiter.
 *
 * Phase: Production Readiness for MySQL readonly tool.
 * Scope: per (threadId + senderId + toolName) bucket.
 *
 * Source of truth for limits:
 *   - env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE (default 10)
 *   - env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR   (default 100)
 *
 * Behavior:
 *   - Key: `${threadId || "_"}|${senderId || "_"}|${toolName}`
 *   - Tracks timestamps of recent calls within the longest window.
 *   - When over limit → returns { ok: false, error: "rate_limited" }
 *   - Caller MUST treat the rate-limited call as a no-op (no mysql client
 *     call, no further work).
 *
 * Production caveat (documented, NOT solved in this phase):
 *   This store is in-process. Multiple bot instances each maintain their
 *   own counters, so the effective limit scales linearly with the number
 *   of instances. For real production with multiple instances, switch to
 *   a shared store (Redis with INCR + EXPIRE or token bucket Lua script).
 */

const { env } = require("../../config/env");
const { logger } = require("../../config/logger");

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Bucketed timestamp arrays.
 * @type {Map<string, number[]>}
 */
const buckets = new Map();

function getLimits() {
  const perMinute = Number.isFinite(env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE)
    ? Math.max(0, Math.floor(env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE))
    : 10;
  const perHour = Number.isFinite(env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR)
    ? Math.max(0, Math.floor(env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR))
    : 100;
  return { perMinute, perHour };
}

function buildKey({ toolName, threadId, senderId }) {
  const t = threadId ? String(threadId) : "_";
  const s = senderId ? String(senderId) : "_";
  const n = toolName ? String(toolName) : "_";
  return `${t}|${s}|${n}`;
}

function prune(arr, cutoffMs, now) {
  let i = 0;
  while (i < arr.length && arr[i] < cutoffMs) i++;
  if (i > 0) arr.splice(0, i);
}

/**
 * Check (and record) one call against the rate limit.
 *
 * @param {{ toolName: string, threadId?: string, senderId?: string }} ctx
 * @returns {{ ok: true, remainingMinute: number, remainingHour: number }
 *         | { ok: false, error: "rate_limited", window: "minute"|"hour" }}
 */
function checkAndRecord(ctx = {}) {
  const { perMinute, perHour } = getLimits();
  const key = buildKey(ctx);
  const now = Date.now();

  let arr = buckets.get(key);
  if (!arr) {
    arr = [];
    buckets.set(key, arr);
  }

  // Prune everything older than 1 hour (longest window we track).
  prune(arr, now - HOUR_MS, now);

  // Count windows.
  const minuteCutoff = now - MINUTE_MS;
  let minuteCount = 0;
  for (const ts of arr) if (ts >= minuteCutoff) minuteCount++;

  // We have not yet pushed `now` for this call. Compare against limits.
  if (perMinute > 0 && minuteCount >= perMinute) {
    logger.info("[RateLimit] minute limit hit", {
      key,
      perMinute,
      minuteCount,
    });
    return { ok: false, error: "rate_limited", window: "minute" };
  }
  if (perHour > 0 && arr.length >= perHour) {
    logger.info("[RateLimit] hour limit hit", {
      key,
      perHour,
      hourCount: arr.length,
    });
    return { ok: false, error: "rate_limited", window: "hour" };
  }

  arr.push(now);
  return {
    ok: true,
    remainingMinute: perMinute - minuteCount - 1,
    remainingHour: perHour - arr.length,
  };
}

/**
 * Read-only check (does NOT consume).
 * @param {{ toolName: string, threadId?: string, senderId?: string }} ctx
 */
function peek(ctx = {}) {
  const { perMinute, perHour } = getLimits();
  const key = buildKey(ctx);
  const now = Date.now();
  const arr = buckets.get(key) || [];
  prune(arr, now - HOUR_MS, now);
  const minuteCutoff = now - MINUTE_MS;
  let minuteCount = 0;
  for (const ts of arr) if (ts >= minuteCutoff) minuteCount++;
  return {
    minuteCount,
    minuteLimit: perMinute,
    hourCount: arr.length,
    hourLimit: perHour,
  };
}

/** Test helper: clear all buckets. */
function _reset() {
  buckets.clear();
}

module.exports = {
  checkAndRecord,
  peek,
  _reset,
  _getLimits: getLimits,
};