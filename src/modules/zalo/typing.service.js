const { getZaloApi } = require("./zalo.client");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");

/** @type {Map<string, { heartbeat: NodeJS.Timeout|null, maxTimer: NodeJS.Timeout|null, delayTimer: NodeJS.Timeout|null, refCount: number }>} */
const activeByThread = new Map();

let ThreadType = null;
let DestType = null;

function loadEnums() {
  if (ThreadType) return;
  try {
    const zca = require("zca-js");
    ThreadType = zca.ThreadType ?? { User: 0, Group: 1 };
    DestType = zca.DestType ?? { User: 3, Group: 1, Page: 5 };
  } catch {
    ThreadType = { User: 0, Group: 1 };
    DestType = { User: 3, Group: 1, Page: 5 };
  }
}

function isTypingEnabled() {
  return env.ZALO_TYPING_ENABLED;
}

function logTyping(...args) {
  if (env.ZALO_TYPING_LOG) logger.info("[Typing]", ...args);
}

async function sendTypingPulse(threadId, threadType) {
  if (!isTypingEnabled()) return { ok: false, reason: "disabled" };
  let api;
  try {
    api = getZaloApi();
  } catch (e) {
    logger.warn("[Typing] api not ready", e.message);
    return { ok: false, reason: "api_not_ready" };
  }
  if (typeof api.sendTypingEvent !== "function") {
    logger.warn("[Typing] sendTypingEvent not supported by SDK");
    return { ok: false, reason: "not_supported" };
  }

  loadEnums();
  const isGroup = threadType === "group";
  const type = isGroup ? ThreadType.Group : ThreadType.User;

  try {
    if (isGroup) {
      await api.sendTypingEvent(threadId, type);
    } else {
      await api.sendTypingEvent(threadId, type, DestType.User);
    }
    logTyping("pulse", threadId, threadType);
    return { ok: true };
  } catch (e) {
    logger.warn("[Typing] send failed", threadId, e.message);
    return { ok: false, error: e.message };
  }
}

function clearThreadState(threadId) {
  const state = activeByThread.get(threadId);
  if (!state) return;
  if (state.heartbeat) clearInterval(state.heartbeat);
  if (state.maxTimer) clearTimeout(state.maxTimer);
  if (state.delayTimer) clearTimeout(state.delayTimer);
  activeByThread.delete(threadId);
  logTyping("cleared", threadId);
}

/**
 * @param {string} threadId
 * @param {"group"|"user"} threadType
 */
function startTyping(threadId, threadType, options = {}) {
  if (!isTypingEnabled() || !threadId) return;

  const delayMs = options.delayMs ?? env.ZALO_TYPING_DELAY_MS;
  const intervalMs = options.intervalMs ?? env.ZALO_TYPING_INTERVAL_MS;
  const maxMs = options.maxMs ?? env.ZALO_TYPING_MAX_MS;

  let state = activeByThread.get(threadId);
  if (state) {
    state.refCount += 1;
    logTyping("reuse", threadId, "ref", state.refCount);
    return;
  }

  state = { heartbeat: null, maxTimer: null, delayTimer: null, refCount: 1 };
  activeByThread.set(threadId, state);

  const beginHeartbeat = () => {
    sendTypingPulse(threadId, threadType).catch(() => {});
    state.heartbeat = setInterval(() => {
      sendTypingPulse(threadId, threadType).catch(() => {});
    }, intervalMs);
    state.maxTimer = setTimeout(() => {
      logger.warn("[Typing] max duration reached, clearing", threadId);
      stopTyping(threadId, { force: true });
    }, maxMs);
  };

  if (delayMs > 0) {
    state.delayTimer = setTimeout(beginHeartbeat, delayMs);
  } else {
    beginHeartbeat();
  }

  logTyping("start", threadId, threadType);
}

function stopTyping(threadId, options = {}) {
  const state = activeByThread.get(threadId);
  if (!state) return;

  if (!options.force && state.refCount > 1) {
    state.refCount -= 1;
    logTyping("stop deferred", threadId, "ref", state.refCount);
    return;
  }

  clearThreadState(threadId);
}

/**
 * Wrap async work with typing for one thread. Clears typing in finally.
 * @param {{ threadId: string, threadType: "group"|"user" }} context
 * @param {() => Promise<T>} asyncFn
 * @returns {Promise<T>}
 */
async function withTyping(context, asyncFn) {
  if (!isTypingEnabled()) {
    return asyncFn();
  }
  const { threadId, threadType } = context;
  startTyping(threadId, threadType);
  try {
    return await asyncFn();
  } finally {
    stopTyping(threadId);
  }
}

/** Test helpers */
function _resetForTests() {
  for (const threadId of [...activeByThread.keys()]) {
    clearThreadState(threadId);
  }
}

function _getActiveThreadIds() {
  return [...activeByThread.keys()];
}

module.exports = {
  isTypingEnabled,
  sendTypingPulse,
  startTyping,
  stopTyping,
  withTyping,
  _resetForTests,
  _getActiveThreadIds,
};