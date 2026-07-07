#!/usr/bin/env node
/**
 * scripts/test-mysql-sandbox.js
 *
 * Phase: Production Readiness — MySQL sandbox integration test.
 *
 * Two modes:
 *   A. Env-driven: runs only if MYSQL_TEST_ENABLED=true. Connects to a real
 *      MySQL instance using MYSQL_TEST_HOST / PORT / USER / PASSWORD / DATABASE.
 *   B. Docker compose (optional): docker-compose.mysql-test.yml provisions
 *      a throwaway MySQL container. This script does NOT spawn Docker
 *      itself — that's an operator step. See README section in this file.
 *
 * Behavior:
 *   - If MYSQL_TEST_ENABLED=false (default) → SKIP, return exit 0 with a
 *     clear SKIP message. This MUST NOT fail CI.
 *   - If MYSQL_TEST_ENABLED=true but the connection fails → FAIL with the
 *     connection error so operators know the sandbox is broken.
 *
 * Required schema (provided in docker-compose.mysql-test.yml readme):
 *   CREATE DATABASE crm_test;
 *   CREATE TABLE customers (
 *     id INT PRIMARY KEY AUTO_INCREMENT,
 *     name VARCHAR(100),
 *     phone VARCHAR(30),
 *     email VARCHAR(100),
 *     password VARCHAR(100),
 *     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 *   );
 *   CREATE TABLE orders (
 *     id INT PRIMARY KEY AUTO_INCREMENT,
 *     customer_id INT,
 *     total DECIMAL(12,2),
 *     status VARCHAR(30),
 *     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 *   );
 *
 * Test cases (when sandbox is enabled):
 *   - valid SELECT * returns rows after column masking
 *   - SELECT on a non-allowlisted table fails BEFORE query
 *   - SELECT on a non-allowlisted db fails BEFORE query
 *   - SELECT on sensitive column does NOT leak (password/token/secret absent)
 *   - missing LIMIT → LIMIT injected
 *   - LIMIT > maxRows → clamped
 *   - UPDATE/DELETE/DROP/INSERT fail with forbidden_keyword BEFORE connect
 */

const path = require("path");

const ENABLED = (process.env.MYSQL_TEST_ENABLED || "false") === "true";

if (!ENABLED) {
  console.log("[MySQL-Sandbox] SKIPPED — MYSQL_TEST_ENABLED is not 'true'.");
  console.log("[MySQL-Sandbox] To run integration tests:");
  console.log("  1. Start MySQL (docker compose -f docker-compose.mysql-test.yml up -d)");
  console.log("  2. Set MYSQL_TEST_ENABLED=true and MYSQL_TEST_{HOST,PORT,USER,PASSWORD,DATABASE}");
  console.log("  3. Re-run this script.");
  process.exit(0);
}

// --- Mode A: real MySQL connection ---
const mysqlPath = path.resolve(__dirname, "../src/modules/db/mysql.client.js");
const auditPath = path.resolve(__dirname, "../src/modules/audit/audit-logger.js");

// Override env with sandbox values BEFORE mysql.client is required.
process.env.MYSQL_TOOL_ENABLED = "true";
process.env.MYSQL_HOST = process.env.MYSQL_TEST_HOST || "localhost";
process.env.MYSQL_PORT = process.env.MYSQL_TEST_PORT || "3306";
process.env.MYSQL_USER = process.env.MYSQL_TEST_USER || "readonly_user";
process.env.MYSQL_PASSWORD = process.env.MYSQL_TEST_PASSWORD || "";
process.env.MYSQL_DATABASE = process.env.MYSQL_TEST_DATABASE || "crm_test";
process.env.MYSQL_MAX_ROWS = "100";
process.env.MYSQL_QUERY_TIMEOUT_MS = "5000";
process.env.MYSQL_TOOL_RATE_LIMIT_PER_MINUTE = "1000";
process.env.MYSQL_TOOL_RATE_LIMIT_PER_HOUR = "10000";

// Bust env.js + rate limit cache so they pick up the sandbox env.
const envPath = require.resolve("../src/config/env");
delete require.cache[envPath];
const rlPath = require.resolve("../src/modules/rate-limit/tool-rate-limit");
delete require.cache[rlPath];

// Make audit a no-op so we don't fill the local audit dir.
require.cache[auditPath] = {
  id: auditPath,
  filename: auditPath,
  loaded: true,
  exports: { audit: async () => ({ ok: true }) },
};

// Boot tool and rate limiter with sandbox env.
const { getTool, clearRegistry } = require("../src/modules/tools/tool-registry");
const { register: registerMysqlTool } = require("../src/modules/tools/built-in/mysql-readonly.tool");
const rl = require("../src/modules/rate-limit/tool-rate-limit");
rl._reset();
clearRegistry();
registerMysqlTool();
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
    threadId: "g-sandbox",
    senderId: "u-sandbox",
    isGroup: true,
    groupConfig: {
      mysql: {
        enabled: true,
        allowedDatabases: ["crm_test"],
        allowedTables: ["customers", "orders"],
        maxRows: 50,
        columns: {
          customers: {
            allow: ["id", "name", "created_at"],
            mask: ["phone", "email"],
            deny: ["password"],
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
      "g-sandbox": {
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
  console.log("[MySQL-Sandbox] ENABLED — running integration tests against real MySQL");
  console.log(`[MySQL-Sandbox] target = ${process.env.MYSQL_USER}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`);

  // Seed: insert a known row so SELECT * returns at least one row.
  // We use a separate raw client to seed.
  const mysql = require("../src/modules/db/mysql.client");
  const seed = await mysql.withClient(async (conn) => {
    await conn.query("DELETE FROM customers");
    await conn.query(
      "INSERT INTO customers (name, phone, email, password) VALUES ('Alice','555-SECRET','a@SECRET.com','RAW_PASSWORD')"
    );
    return conn.query("SELECT COUNT(*) AS n FROM customers");
  });
  if (!seed.ok) {
    console.error("[MySQL-Sandbox] seed failed:", seed.error);
    process.exit(1);
  }

  // [S1] valid SELECT * → rows returned, sensitive columns masked/removed
  rl._reset();
  let r = await t.execute({ sql: "SELECT * FROM customers", reason: "sandbox" }, baseCtx());
  assert(r.ok === true, "[S1] SELECT * FROM customers ok");
  if (r.ok) {
    assert(Array.isArray(r.rows) && r.rows.length > 0, "[S1b] got >=1 row");
    const out = r.rows[0];
    assert(out.id !== undefined && out.name === "Alice", "[S1c] allow columns preserved");
    assert(out.phone === "***", "[S1d] phone masked");
    assert(out.email === "***", "[S1e] email masked");
    assert(!("password" in out), "[S1f] password removed");
    const s = JSON.stringify(r);
    assert(!s.includes("555-SECRET"), "[S1g] raw phone not in result");
    assert(!s.includes("a@SECRET.com"), "[S1h] raw email not in result");
    assert(!s.includes("RAW_PASSWORD"), "[S1i] raw password not in result");
  }

  // [S2] SELECT on non-allowlisted table fails BEFORE query
  r = await t.execute({ sql: "SELECT * FROM users", reason: "x" }, baseCtx());
  assert(
    r.ok === false && r.error === "mysql_table_not_allowed",
    "[S2] bad table → mysql_table_not_allowed"
  );

  // [S3] SELECT on non-allowlisted db fails BEFORE query
  r = await t.execute({ sql: "SELECT * FROM otherdb.customers", reason: "x" }, baseCtx());
  assert(
    r.ok === false && r.error === "mysql_database_not_allowed",
    "[S3] bad db → mysql_database_not_allowed"
  );

  // [S4] missing LIMIT → LIMIT injected (autoLimit=true)
  rl._reset();
  r = await t.execute({ sql: "SELECT id, name FROM customers", reason: "x" }, baseCtx());
  assert(r.ok && r.autoLimit === true, "[S4] missing LIMIT → autoLimit=true");

  // [S5] LIMIT > maxRows → clamped
  r = await t.execute({ sql: "SELECT id FROM customers LIMIT 9999", reason: "x" }, baseCtx());
  assert(r.ok && r.clampedLimit === true, "[S5] LIMIT 9999 clamped");
  assert(r.finalMaxRows === 50, "[S5b] finalMaxRows = 50");

  // [S6] UPDATE/DELETE/DROP/INSERT fail with forbidden_keyword BEFORE connect
  for (const sql of [
    "UPDATE customers SET name='x'",
    "DELETE FROM customers",
    "DROP TABLE customers",
    "INSERT INTO customers (name) VALUES ('x')",
  ]) {
    r = await t.execute({ sql, reason: "x" }, baseCtx());
    assert(/^forbidden_keyword/.test(r.error), `[S6] ${sql} → forbidden_keyword`);
  }

  // Cleanup: clear seeded row.
  await mysql.withClient(async (conn) => {
    await conn.query("DELETE FROM customers");
    return { ok: true };
  });
  await mysql.endPool();

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error("[MySQL-Sandbox] crash:", e && e.message ? e.message : e);
  process.exit(1);
});