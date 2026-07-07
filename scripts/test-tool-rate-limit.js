#!/usr/bin/env node
/**
 * scripts/test-tool-rate-limit.js
 *
 * Phase: Production Readiness for MySQL readonly tool.
 * Tests the in-memory tool-rate-limit module in isolation.
 *
 * Verifies:
 *   - under limit → ok with decremented remaining counters
 *   - over per-minute → ok:false error:"rate_limited" window:"minute"
 *   - over per-hour   → ok:false error:"rate_limited" window:"hour"
 *   - peek does NOT consume
 *   - different keys (threadId/senderId) do not interfere
 *   - _reset clears buckets
 */

// IMPORTANT: env cache must be cleared BEFORE either env or rate-limit
// is required, so they share the same env reference and mutations
// propagate.
const envPath = require.resolve("../src/config/env");
delete require.cache[envPath];
const { env } = require("../src/config/env");
const rl = require("../src/modules/rate-limit/tool-rate-limit");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log("PASS:", msg);
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// Override env to make math easy.
const originalPerMin = env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE;
const originalPerHour = env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR;
env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 3;
env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = 5;
rl._reset();

function restoreEnv() {
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = originalPerMin;
  env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = originalPerHour;
}

// ----- [1] under per-minute limit → ok -----
{
  rl._reset();
  const ctx = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "u1" };
  const r1 = rl.checkAndRecord(ctx);
  const r2 = rl.checkAndRecord(ctx);
  const r3 = rl.checkAndRecord(ctx);
  assert(r1.ok && r2.ok && r3.ok, "[1] 3 calls under per-min=3 pass");
  assert(r3.remainingMinute === 0, "[1b] remainingMinute = 0 at limit");
}

// ----- [2] over per-minute → rate_limited minute -----
{
  rl._reset();
  const ctx = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "u1" };
  rl.checkAndRecord(ctx);
  rl.checkAndRecord(ctx);
  rl.checkAndRecord(ctx);
  const r4 = rl.checkAndRecord(ctx);
  assert(!r4.ok && r4.error === "rate_limited" && r4.window === "minute", "[2] 4th call in minute window → rate_limited minute");
}

// ----- [3] over per-hour → rate_limited hour (raise per-hour small) -----
{
  rl._reset();
  env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = 2;
  const ctx = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "u1" };
  rl.checkAndRecord(ctx);
  rl.checkAndRecord(ctx);
  const r3 = rl.checkAndRecord(ctx);
  assert(!r3.ok && r3.error === "rate_limited" && r3.window === "hour", "[3] 3rd call under per-hour=2 → rate_limited hour");
  // restore
  env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = 5;
}

// ----- [4] peek does NOT consume -----
{
  rl._reset();
  const ctx = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "u1" };
  rl.peek(ctx);
  rl.peek(ctx);
  rl.peek(ctx);
  const r1 = rl.checkAndRecord(ctx);
  const r2 = rl.checkAndRecord(ctx);
  const r3 = rl.checkAndRecord(ctx);
  assert(r1.ok && r2.ok && r3.ok, "[4] peek doesn't consume (3 calls still pass under per-min=3)");
  const r4 = rl.checkAndRecord(ctx);
  assert(!r4.ok && r4.window === "minute", "[4b] 4th call still rate_limited after peeks");
}

// ----- [5] different threadId keys do not interfere -----
{
  rl._reset();
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 2;
  const ctxA = { toolName: "mysql_readonly_query", threadId: "gA", senderId: "u1" };
  const ctxB = { toolName: "mysql_readonly_query", threadId: "gB", senderId: "u1" };
  rl.checkAndRecord(ctxA);
  rl.checkAndRecord(ctxA);
  const rA3 = rl.checkAndRecord(ctxA);
  assert(!rA3.ok && rA3.window === "minute", "[5] ctxA rate_limited at 3rd call");
  // ctxB still has full quota
  const rB1 = rl.checkAndRecord(ctxB);
  const rB2 = rl.checkAndRecord(ctxB);
  assert(rB1.ok && rB2.ok, "[5b] ctxB unaffected by ctxA's bucket");
  // restore
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 3;
}

// ----- [6] different senderId keys do not interfere -----
{
  rl._reset();
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 2;
  const ctxA = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "uA" };
  const ctxB = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "uB" };
  rl.checkAndRecord(ctxA);
  rl.checkAndRecord(ctxA);
  const rA3 = rl.checkAndRecord(ctxA);
  assert(!rA3.ok, "[6] ctxA (uA) rate_limited at 3rd call");
  const rB1 = rl.checkAndRecord(ctxB);
  const rB2 = rl.checkAndRecord(ctxB);
  assert(rB1.ok && rB2.ok, "[6b] ctxB (uB) unaffected");
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 3;
}

// ----- [7] _reset clears -----
{
  rl._reset();
  const ctx = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "u1" };
  rl.checkAndRecord(ctx);
  rl.checkAndRecord(ctx);
  rl.checkAndRecord(ctx);
  rl._reset();
  const r = rl.checkAndRecord(ctx);
  assert(r.ok, "[7] after _reset, bucket fresh → ok");
}

// ----- [8] limits read from env at call time -----
{
  rl._reset();
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 1;
  const ctx = { toolName: "mysql_readonly_query", threadId: "g1", senderId: "u1" };
  const r1 = rl.checkAndRecord(ctx);
  const r2 = rl.checkAndRecord(ctx);
  assert(r1.ok, "[8] first call ok when per-min=1");
  assert(!r2.ok && r2.window === "minute", "[8b] second call blocked");
  env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 3;
}

restoreEnv();
rl._reset();

console.log(`\nResult: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);