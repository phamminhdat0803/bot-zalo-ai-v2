#!/usr/bin/env node
/**
 * scripts/test-mysql-access-policy.js
 *
 * Verifies fail-closed behavior of sql-access-policy.
 *
 * Cases:
 *  - Allowed tables / databases pass
 *  - Disallowed table → mysql_table_not_allowed
 *  - Disallowed database → mysql_database_not_allowed
 *  - empty allowedTables → reject all
 *  - allowedTables: ["*"] → only db allowlist enforced
 *  - ambiguous db (no prefix, multi-db allowlist) → reject
 *  - SQL patterns: SELECT, JOIN, EXPLAIN, DESCRIBE, DESC, SHOW COLUMNS/INDEX/KEYS, SHOW TABLES FROM
 *  - Unknown pattern → mysql_table_parse_failed
 *  - No policy → mysql_policy_missing
 *  - Multi-statement → fail
 */

const policy = require("../src/modules/db/sql-access-policy");

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

const baseCtx = (extra = {}) => ({
  threadId: "g-test",
  groupConfig: {
    mysql: {
      enabled: true,
      allowedDatabases: ["crm"],
      allowedTables: ["customers", "orders"],
      maxRows: 100,
    },
  },
  ...extra,
});

// --- extractTables unit ---
{
  const r = policy.extractTables("SELECT * FROM customers");
  assert(r.ok && r.tables[0].table === "customers", "[1] SELECT FROM customers");
}
{
  const r = policy.extractTables("SELECT c.id FROM customers c");
  assert(r.ok && r.tables[0].table === "customers", "[2] alias FROM customers");
}
{
  const r = policy.extractTables("SELECT * FROM crm.customers");
  assert(r.ok && r.tables[0].database === "crm" && r.tables[0].table === "customers", "[3] db.table");
}
{
  const r = policy.extractTables(
    "SELECT * FROM customers c JOIN orders o ON o.customer_id = c.id"
  );
  assert(
    r.ok && r.tables.length === 2 && r.tables.some(t => t.table === "customers") && r.tables.some(t => t.table === "orders"),
    "[4] JOIN extracts both"
  );
}
{
  const r = policy.extractTables("EXPLAIN SELECT * FROM customers");
  assert(r.ok && r.tables[0].table === "customers", "[5] EXPLAIN SELECT");
}
{
  const r = policy.extractTables("DESCRIBE customers");
  assert(r.ok && r.tables[0].table === "customers", "[6] DESCRIBE");
}
{
  const r = policy.extractTables("DESC customers");
  assert(r.ok && r.tables[0].table === "customers", "[7] DESC");
}
{
  const r = policy.extractTables("SHOW COLUMNS FROM customers");
  assert(r.ok && r.tables[0].table === "customers", "[8] SHOW COLUMNS");
}
{
  const r = policy.extractTables("SHOW FULL COLUMNS FROM customers");
  assert(r.ok && r.tables[0].table === "customers", "[9] SHOW FULL COLUMNS");
}
{
  const r = policy.extractTables("SHOW INDEX FROM customers");
  assert(r.ok && r.tables[0].table === "customers", "[10] SHOW INDEX");
}
{
  const r = policy.extractTables("SHOW KEYS FROM customers");
  assert(r.ok && r.tables[0].table === "customers", "[11] SHOW KEYS");
}
{
  const r = policy.extractTables("SHOW TABLES FROM crm");
  assert(r.ok, "[12] SHOW TABLES FROM db ok");
}
{
  const r = policy.extractTables("SELECT * FROM customers; DROP TABLE customers");
  assert(!r.ok, "[13] multi-statement rejected");
}
{
  const r = policy.extractTables("USE otherdb");
  assert(!r.ok && r.error === "mysql_table_parse_failed", "[14] USE rejected");
}
{
  const r = policy.extractTables("SHOW DATABASES");
  assert(!r.ok && r.error === "mysql_table_parse_failed", "[15] SHOW DATABASES rejected");
}
{
  const r = policy.extractTables("SELECT 1");
  assert(!r.ok && r.error === "mysql_table_parse_failed", "[16] SELECT without FROM rejected");
}

// --- enforceAccessPolicy: positive ---
{
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", baseCtx());
  assert(v.ok === true, "[17] policy: allowed customers");
}
{
  const v = policy.enforceAccessPolicy("SELECT * FROM crm.customers", baseCtx());
  assert(v.ok === true, "[18] policy: allowed db.table");
}
{
  const v = policy.enforceAccessPolicy("SELECT * FROM orders", baseCtx());
  assert(v.ok === true, "[19] policy: allowed orders");
}
{
  const v = policy.enforceAccessPolicy(
    "SELECT * FROM customers JOIN orders ON orders.customer_id = customers.id",
    baseCtx()
  );
  assert(v.ok === true, "[20] policy: JOIN both allowed");
}
{
  const v = policy.enforceAccessPolicy("EXPLAIN SELECT * FROM customers", baseCtx());
  assert(v.ok === true, "[21] policy: EXPLAIN allowed");
}
{
  const v = policy.enforceAccessPolicy("DESCRIBE customers", baseCtx());
  assert(v.ok === true, "[22] policy: DESCRIBE allowed");
}
{
  const v = policy.enforceAccessPolicy("DESC customers", baseCtx());
  assert(v.ok === true, "[23] policy: DESC allowed");
}
{
  const v = policy.enforceAccessPolicy("SHOW COLUMNS FROM customers", baseCtx());
  assert(v.ok === true, "[24] policy: SHOW COLUMNS allowed");
}
{
  const v = policy.enforceAccessPolicy("SHOW INDEX FROM customers", baseCtx());
  assert(v.ok === true, "[25] policy: SHOW INDEX allowed");
}

// --- enforceAccessPolicy: negative ---
{
  const v = policy.enforceAccessPolicy("SELECT * FROM users", baseCtx());
  assert(v.ok === false && v.error === "mysql_table_not_allowed", "[26] policy: users denied");
}
{
  const v = policy.enforceAccessPolicy(
    "SELECT * FROM customers JOIN users ON users.id = customers.id",
    baseCtx()
  );
  assert(v.ok === false && v.error === "mysql_table_not_allowed", "[27] policy: JOIN users denied");
}
{
  const v = policy.enforceAccessPolicy("SELECT * FROM otherdb.customers", baseCtx());
  assert(v.ok === false && v.error === "mysql_database_not_allowed", "[28] policy: otherdb denied");
}

// --- fail-closed: empty allowlists ---
{
  const ctx = baseCtx({
    groupConfig: {
      mysql: { enabled: true, allowedDatabases: ["crm"], allowedTables: [] },
    },
  });
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", ctx);
  assert(v.ok === false && v.error === "mysql_table_not_allowed", "[29] empty allowedTables reject all");
}
{
  const ctx = baseCtx({
    groupConfig: {
      mysql: { enabled: true, allowedDatabases: [], allowedTables: ["customers"] },
    },
  });
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", ctx);
  assert(v.ok === false && v.error === "mysql_database_not_allowed", "[30] empty allowedDatabases reject all");
}

// --- allowedTables: ["*"] passes table check but enforces db ---
{
  const ctx = baseCtx({
    groupConfig: {
      mysql: { enabled: true, allowedDatabases: ["crm"], allowedTables: ["*"] },
    },
  });
  const v = policy.enforceAccessPolicy("SELECT * FROM anything", ctx);
  assert(v.ok === true, "[31] wildcard table passes");
}
{
  const ctx = baseCtx({
    groupConfig: {
      mysql: { enabled: true, allowedDatabases: ["crm"], allowedTables: ["*"] },
    },
  });
  const v = policy.enforceAccessPolicy("SELECT * FROM otherdb.anything", ctx);
  assert(v.ok === false && v.error === "mysql_database_not_allowed", "[32] wildcard table but db still checked");
}

// --- ambiguous db (no prefix, multi-db allowlist) → reject ---
{
  const ctx = baseCtx({
    groupConfig: {
      mysql: { enabled: true, allowedDatabases: ["crm", "analytics"], allowedTables: ["customers"] },
    },
  });
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", ctx);
  assert(v.ok === false && v.error === "mysql_database_not_allowed", "[33] ambiguous db bare-table rejected");
}

// --- no policy at all → reject ---
{
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", { threadId: "x" });
  assert(v.ok === false && v.error === "mysql_policy_missing", "[34] no policy rejected");
}

// --- disabled policy ---
{
  const ctx = baseCtx({
    groupConfig: {
      mysql: { enabled: false, allowedDatabases: ["crm"], allowedTables: ["customers"] },
    },
  });
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", ctx);
  assert(v.ok === false && v.error === "mysql_policy_disabled", "[35] disabled policy rejected");
}

// --- fallback to groups.json via groupsRegistry ---
{
  const v = policy.enforceAccessPolicy("SELECT * FROM customers", {
    threadId: "g-1",
    groupsRegistry: {
      "g-1": { mysql: { enabled: true, allowedDatabases: ["crm"], allowedTables: ["customers"] } },
    },
  });
  assert(v.ok === true, "[36] fallback groups.json path");
}

console.log(`\nResult: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);