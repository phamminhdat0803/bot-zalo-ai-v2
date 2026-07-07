#!/usr/bin/env node
/**
 * scripts/test-mysql-readonly-tool.js
 *
 * Phase: Production Readiness — gate-order verification.
 *
 * Hardening tests for the mysql-readonly.tool with a MOCK mysql client.
 * Pre-populates require.cache so the tool resolves mysql.client / audit
 * to in-memory mocks instead of disk / network.
 *
 * Verifies gate order:
 *   - env disabled → tool_disabled, no client call
 *   - invalid zod input → invalid_tool_input, no client call
 *   - permission denied → permission_denied, no client call
 *   - policy missing → mysql_policy_missing, no client call
 *   - SQL validator fail (UPDATE/DELETE/DROP/INSERT) BEFORE access policy
 *   - access policy: bad table → mysql_table_not_allowed, no client call
 *   - access policy: bad db → mysql_database_not_allowed, no client call
 *   - rate limit exceeded → rate_limited, no client call
 *   - mysql_not_configured → no client call
 *   - valid input → client called with auto LIMIT
 *   - valid input with large LIMIT → clamped
 *   - maxRows clamp chain (hard cap → env → group → input)
 *   - column policy masks/denies applied to result rows
 *   - SELECT * does NOT leak password/token/secret when deny present
 */

const path = require("path");

// ----- mock state -----
const state = {
  calls: [],
  configured: true,
  queryResult: {
    rows: [
      {
        id: 1,
        name: "Alice",
        phone: "555-1234",
        email: "a@b.com",
        password: "RAW_PASSWORD",
        token: "RAW_TOKEN",
        secret: "RAW_SECRET",
      },
    ],
    fields: [
      { name: "id" },
      { name: "name" },
      { name: "phone" },
      { name: "email" },
      { name: "password" },
      { name: "token" },
      { name: "secret" },
    ],
  },
};

const mockExports = {
  isConfigured: () => state.configured,
  withClient: async (fn) => {
    state.calls.push({ kind: "withClient" });
    const fakeConn = {
      query: async (sql) => {
        state.calls.push({ kind: "query", sql });
        const [rows, fields] = [state.queryResult.rows, state.queryResult.fields];
        return [rows, fields];
      },
    };
    return { ok: true, data: await fn(fakeConn) };
  },
};

function setMockConfigured(v) {
  state.configured = v;
}

// ----- pre-populate require.cache with mocks -----
const mysqlPath = path.resolve(__dirname, "../src/modules/db/mysql.client.js");
const auditPath = path.resolve(__dirname, "../src/modules/audit/audit-logger.js");

require.cache[mysqlPath] = {
  id: mysqlPath,
  filename: mysqlPath,
  loaded: true,
  exports: mockExports,
};
require.cache[auditPath] = {
  id: auditPath,
  filename: auditPath,
  loaded: true,
  exports: { audit: async () => ({ ok: true }) },
};

// ----- ensure env is on for the test scope -----
process.env.MYSQL_TOOL_ENABLED = "true";
process.env.MYSQL_HOST = "localhost";
process.env.MYSQL_USER = "readonly_user";
process.env.MYSQL_PASSWORD = "x";
process.env.MYSQL_DATABASE = "crm";
process.env.MYSQL_MAX_ROWS = "100";
process.env.MYSQL_QUERY_TIMEOUT_MS = "2000";
// High limit so tests don't accidentally hit it; specific test below drops it.
process.env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = "1000";
process.env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = "10000";

// Bust env.js so it re-reads process.env (it's required transitively)
const envPath = require.resolve("../src/config/env");
delete require.cache[envPath];

// Also reset rate limit module between test groups.
const rlPath = require.resolve("../src/modules/rate-limit/tool-rate-limit");
delete require.cache[rlPath];

// ----- load modules AFTER mocks are in place -----
const { getTool, clearRegistry } = require("../src/modules/tools/tool-registry");
const rl = require("../src/modules/rate-limit/tool-rate-limit");

// Re-register the tool to be safe (clearRegistry + re-require to trigger
// the side-effect register() call).
clearRegistry();
require("../src/modules/tools/built-in/mysql-readonly.tool");

const t = getTool("mysql_readonly_query");

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

function baseCtx(extra = {}) {
  return {
    threadId: "g-test",
    senderId: "u-test",
    isGroup: true,
    groupConfig: {
      mysql: {
        enabled: true,
        allowedDatabases: ["crm"],
        allowedTables: ["customers", "orders"],
        maxRows: 50,
        columns: {
          customers: {
            allow: ["id", "name"],
            mask: ["phone", "email"],
            deny: ["password", "token", "secret"],
          },
          orders: {
            allow: ["id", "customer_id", "total", "status", "created_at"],
            mask: [],
            deny: [],
          },
        },
      },
    },
    groupsRegistry: {
      "g-test": {
        allowedTools: [
          "noop",
          "send_message",
          "react_message",
          "mysql_readonly_query",
        ],
      },
    },
    usersRegistry: {},
    ...extra,
  };
}

async function run() {
  assert(!!t, "[1] tool registered");

  // [2] valid SELECT → calls client, auto LIMIT added
  state.calls = [];
  rl._reset();
  let r = await t.execute({ sql: "SELECT * FROM customers", reason: "demo" }, baseCtx());
  assert(r.ok === true, "[2] valid SELECT ok");
  assert(
    state.calls.some(c => c.kind === "query" && /LIMIT 50/.test(c.sql)),
    "[2b] auto LIMIT inserted using group.maxRows (50)"
  );
  assert(r.autoLimit === true, "[2c] autoLimit flag true");
  assert(r.finalMaxRows === 50, "[2d] finalMaxRows = min(500, env=100, group=50) = 50");

  // [2e] column policy applied: password/token/secret must NOT appear
  const out2 = r.rows[0];
  assert(out2.id === 1 && out2.name === "Alice", "[2e] allow columns preserved");
  assert(out2.phone === "***" && out2.email === "***", "[2f] mask columns become ***");
  assert(!("password" in out2), "[2g] deny column password removed");
  assert(!("token" in out2), "[2h] deny column token removed");
  assert(!("secret" in out2), "[2i] deny column secret removed");
  // Ensure raw values never leak to caller
  const s2 = JSON.stringify(r);
  assert(!s2.includes("RAW_PASSWORD"), "[2j] no raw password in result");
  assert(!s2.includes("RAW_TOKEN"), "[2k] no raw token in result");
  assert(!s2.includes("RAW_SECRET"), "[2l] no raw secret in result");

  state.calls = [];
  rl._reset();
  // [3] valid with LIMIT smaller than max → keep LIMIT
  r = await t.execute({ sql: "SELECT * FROM customers LIMIT 10", reason: "demo" }, baseCtx());
  assert(r.ok === true, "[3] small LIMIT preserved");
  assert(
    state.calls.some(c => c.kind === "query" && /LIMIT 10/.test(c.sql)),
    "[3b] SQL has LIMIT 10"
  );
  assert(r.autoLimit === false, "[3c] no autoLimit");

  state.calls = [];
  rl._reset();
  // [4] valid with LIMIT larger than max → clamp
  r = await t.execute({ sql: "SELECT * FROM customers LIMIT 9999", reason: "demo" }, baseCtx());
  assert(r.ok === true, "[4] large LIMIT clamps ok");
  assert(
    state.calls.some(c => c.kind === "query" && /LIMIT 50/.test(c.sql)),
    "[4b] LIMIT clamped to 50"
  );
  assert(r.clampedLimit === true, "[4c] clampedLimit flag true");

  state.calls = [];
  rl._reset();
  // [5] input.maxRows respected only when smaller
  r = await t.execute(
    { sql: "SELECT * FROM customers LIMIT 9999", reason: "demo", maxRows: 20 },
    baseCtx()
  );
  assert(r.ok === true, "[5] input.maxRows participates in min");
  assert(
    state.calls.some(c => c.kind === "query" && /LIMIT 20/.test(c.sql)),
    "[5b] final clamp = min(500, env=100, group=50, input=20) = 20"
  );
  assert(r.finalMaxRows === 20, "[5c] finalMaxRows = 20");

  state.calls = [];
  rl._reset();
  // [6] input.maxRows LARGER than group → still capped by group
  r = await t.execute(
    { sql: "SELECT * FROM customers LIMIT 9999", reason: "demo", maxRows: 500 },
    baseCtx()
  );
  assert(r.ok === true, "[6] large input.maxRows capped by group");
  assert(
    state.calls.some(c => c.kind === "query" && /LIMIT 50/.test(c.sql)),
    "[6b] still clamped to 50 (group wins over input)"
  );

  state.calls = [];
  rl._reset();
  // [7] invalid zod input → no client call
  r = await t.execute({ sql: "SELECT * FROM customers" }, baseCtx()); // missing reason
  assert(r.ok === false && r.error === "invalid_tool_input", "[7] missing reason → invalid_tool_input");
  assert(!state.calls.some(c => c.kind === "withClient"), "[7b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [8] wrong type maxRows → invalid_tool_input
  r = await t.execute(
    { sql: "SELECT * FROM customers", reason: "x", maxRows: "100" },
    baseCtx()
  );
  assert(r.ok === false && r.error === "invalid_tool_input", "[8] string maxRows → invalid_tool_input");
  assert(!state.calls.some(c => c.kind === "withClient"), "[8b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [9] sql too long → invalid_tool_input
  r = await t.execute(
    { sql: "SELECT '" + "x".repeat(10001) + "'", reason: "x" },
    baseCtx()
  );
  assert(r.ok === false && r.error === "invalid_tool_input", "[9] too long → invalid_tool_input");
  assert(!state.calls.some(c => c.kind === "withClient"), "[9b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [10] permission denied
  const ctxNoPerm = baseCtx({
    groupsRegistry: {
      "g-test": { allowedTools: ["noop", "send_message", "react_message"] },
    },
  });
  r = await t.execute({ sql: "SELECT * FROM customers", reason: "x" }, ctxNoPerm);
  assert(r.ok === false && r.error === "permission_denied", "[10] perm denied → permission_denied");
  assert(!state.calls.some(c => c.kind === "withClient"), "[10b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [11a] groupId undefined resolves mysql policy by threadId from groupsRegistry
  const ctxThreadOnlyPolicy = baseCtx({
    groupConfig: undefined,
    groupId: undefined,
    threadId: "g-test",
    groupsRegistry: {
      "g-test": {
        allowedTools: ["mysql_readonly_query"],
        mysql: baseCtx().groupConfig.mysql,
      },
    },
  });
  r = await t.execute({ sql: "SELECT * FROM customers", reason: "x" }, ctxThreadOnlyPolicy);
  assert(r.ok === true, "[11a] groupId undefined resolves policy by threadId");
  assert(state.calls.some(c => c.kind === "withClient"), "[11a-b] resolved policy reaches mysql client");

  state.calls = [];
  rl._reset();
  // [11] no policy → mysql_policy_missing
  r = await t.execute(
    { sql: "SELECT * FROM customers", reason: "x" },
    { threadId: "x", senderId: "u", isGroup: true, groupsRegistry: { x: { allowedTools: ["mysql_readonly_query"] } } }
  );
  assert(r.ok === false && r.error === "mysql_policy_missing", "[11] no policy → mysql_policy_missing");
  assert(r.details?.groupKey === "x", "[11c] missing policy returns groupKey detail");
  assert(!state.calls.some(c => c.kind === "withClient"), "[11b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [11d] policy disabled → mysql_policy_disabled
  r = await t.execute(
    { sql: "SELECT * FROM customers", reason: "x" },
    baseCtx({ groupConfig: { mysql: { ...baseCtx().groupConfig.mysql, enabled: false } } })
  );
  assert(r.ok === false && r.error === "mysql_policy_disabled", "[11d] disabled policy → mysql_policy_disabled");
  assert(!state.calls.some(c => c.kind === "withClient"), "[11e] disabled policy no mysql client call");

  state.calls = [];
  rl._reset();
  // [12] policy: table not allowed → mysql_table_not_allowed
  const ctxBadTable = baseCtx({
    groupConfig: {
      mysql: {
        enabled: true,
        allowedDatabases: ["crm"],
        allowedTables: ["customers"],
        columns: {
          customers: { allow: ["id", "name"], mask: [], deny: [] },
        },
      },
    },
  });
  r = await t.execute({ sql: "SELECT * FROM users", reason: "x" }, ctxBadTable);
  assert(r.ok === false && r.error === "mysql_table_not_allowed", "[12] bad table → mysql_table_not_allowed");
  assert(!state.calls.some(c => c.kind === "withClient"), "[12b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [13] policy: db not allowed → mysql_database_not_allowed
  r = await t.execute({ sql: "SELECT * FROM otherdb.customers", reason: "x" }, baseCtx());
  assert(r.ok === false && r.error === "mysql_database_not_allowed", "[13] bad db → mysql_database_not_allowed");
  assert(!state.calls.some(c => c.kind === "withClient"), "[13b] no mysql client call");

  state.calls = [];
  rl._reset();
  // [14] GATE ORDER: SQL validator fail BEFORE access policy → UPDATE → forbidden_keyword
  r = await t.execute({ sql: "UPDATE customers SET name='x'", reason: "x" }, baseCtx());
  assert(r.ok === false, "[14] SQL UPDATE rejected");
  assert(
    /^forbidden_keyword/.test(r.error),
    "[14b] UPDATE → forbidden_keyword (validator before access policy)"
  );
  assert(!state.calls.some(c => c.kind === "withClient"), "[14c] no mysql client call");

  // [14d] DELETE → forbidden_keyword
  state.calls = [];
  rl._reset();
  r = await t.execute({ sql: "DELETE FROM customers", reason: "x" }, baseCtx());
  assert(/^forbidden_keyword/.test(r.error), "[14d] DELETE → forbidden_keyword");

  // [14e] DROP → forbidden_keyword
  state.calls = [];
  rl._reset();
  r = await t.execute({ sql: "DROP TABLE customers", reason: "x" }, baseCtx());
  assert(/^forbidden_keyword/.test(r.error), "[14e] DROP → forbidden_keyword");

  // [14f] INSERT → forbidden_keyword
  state.calls = [];
  rl._reset();
  r = await t.execute({ sql: "INSERT INTO customers (name) VALUES ('x')", reason: "x" }, baseCtx());
  assert(/^forbidden_keyword/.test(r.error), "[14f] INSERT → forbidden_keyword");

  // [14g] ALTER → forbidden_keyword
  state.calls = [];
  rl._reset();
  r = await t.execute({ sql: "ALTER TABLE customers ADD COLUMN foo INT", reason: "x" }, baseCtx());
  assert(/^forbidden_keyword/.test(r.error), "[14g] ALTER → forbidden_keyword");

  state.calls = [];
  rl._reset();
  // [15] mysql_not_configured when driver/config missing
  setMockConfigured(false);
  r = await t.execute({ sql: "SELECT * FROM customers", reason: "x" }, baseCtx());
  assert(r.ok === false && r.error === "mysql_not_configured", "[15] unconfigured → mysql_not_configured");
  assert(!state.calls.some(c => c.kind === "withClient"), "[15b] no mysql client call");
  setMockConfigured(true);

  state.calls = [];
  rl._reset();
  // [16] env disabled → tool_disabled
  const envMod = require("../src/config/env");
  const originalEnvEnabled = envMod.env.MYSQL_TOOL_ENABLED;
  envMod.env.MYSQL_TOOL_ENABLED = false;
  r = await t.execute({ sql: "SELECT * FROM customers", reason: "x" }, baseCtx());
  assert(r.ok === false && r.error === "tool_disabled", "[16] env false → tool_disabled");
  assert(!state.calls.some(c => c.kind === "withClient"), "[16b] no mysql client call");
  envMod.env.MYSQL_TOOL_ENABLED = originalEnvEnabled;

  // [17] Rate limit exceeded → rate_limited, no mysql client call
  state.calls = [];
  rl._reset();
  envMod.env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 2;
  envMod.env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = 100;
  delete require.cache[rlPath];
  const rl2 = require("../src/modules/rate-limit/tool-rate-limit");
  // First 2 calls should succeed (they will be rejected on column policy since
  // we strip columns here; but the rate limiter only runs AFTER column policy,
  // so we need a context with proper column policy. Use baseCtx).
  // Actually the rate limit sits AFTER access policy in the new gate order.
  // We need 2 calls to pass through gates 1..7 and reach gate 8.
  // Let's just ensure that the 3rd call rate-limits.
  const c1 = baseCtx();
  await t.execute({ sql: "SELECT id FROM customers LIMIT 1", reason: "x" }, c1);
  await t.execute({ sql: "SELECT id FROM customers LIMIT 1", reason: "x" }, c1);
  state.calls = []; // reset to confirm 3rd call doesn't reach client
  const r3 = await t.execute({ sql: "SELECT id FROM customers LIMIT 1", reason: "x" }, c1);
  assert(r3.ok === false && r3.error === "rate_limited", "[17] 3rd call in minute → rate_limited");
  assert(!state.calls.some(c => c.kind === "withClient"), "[17b] rate-limited call never reaches mysql client");
  // restore
  envMod.env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = 1000;
  envMod.env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = 10000;
  delete require.cache[rlPath];

  // [18] Table without column policy → mysql_column_policy_missing
  state.calls = [];
  const rl3 = require("../src/modules/rate-limit/tool-rate-limit");
  rl3._reset();
  const ctxNoCols = baseCtx({
    groupConfig: {
      mysql: {
        enabled: true,
        allowedDatabases: ["crm"],
        allowedTables: ["orders"],
        maxRows: 50,
        // no columns config at all
      },
    },
  });
  r = await t.execute({ sql: "SELECT * FROM orders", reason: "x" }, ctxNoCols);
  assert(
    r.ok === false && r.error === "mysql_column_policy_missing",
    "[18] no column policy → mysql_column_policy_missing"
  );
  assert(!state.calls.some(c => c.kind === "withClient"), "[18b] column-policy missing short-circuits before query");

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Crash:", e);
  process.exit(1);
});