#!/usr/bin/env node
/**
 * scripts/test-sql-validator.js
 *
 * Phase 4 SQL whitelist validator tests.
 */

const validator = require("../src/modules/db/sql-validator");

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

// [1] clean SELECT — no LIMIT means autoLimit applied
{
  const r = validator.validateSql("SELECT * FROM users", { maxRows: 100 });
  assert(r.ok && r.autoLimit === true, "[1] SELECT missing LIMIT -> autoLimit true");
}

// [2] stacked injection
{
  const r = validator.validateSql("SELECT * FROM users; DROP TABLE users");
  assert(!r.ok && r.reason === "multiple_statements", "[2] multi-statement rejected");
}

// [3] UPDATE
{
  const r = validator.validateSql("UPDATE users SET name='x'");
  assert(!r.ok && /forbidden_keyword/.test(r.reason), "[3] UPDATE rejected");
}

// [4] SELECT with limit below max
{
  const r = validator.validateSql("SELECT * FROM users LIMIT 5", { maxRows: 100 });
  assert(r.ok && r.autoLimit === false, "[4] SELECT with small LIMIT ok, no autoLimit");
}

// [5] SELECT with limit larger than maxRows -> clamped
{
  const r = validator.validateSql("SELECT * FROM users LIMIT 9999", { maxRows: 50 });
  assert(r.ok && r.autoLimit === false, "[5a] SELECT LIMIT 9999 ok");
  assert(/LIMIT 50/.test(r.sql), "[5b] LIMIT clamped to maxRows");
}

// [6] SELECT disguised injection - keyword DROP later
{
  const r = validator.validateSql("SELECT 1; -- look\n DROP TABLE x");
  assert(!r.ok, "[6] DROP after comment still rejected");
}

// [7] SHOW
{
  const r = validator.validateSql("SHOW TABLES");
  assert(r.ok, "[7] SHOW TABLES ok");
}

// [8] DESCRIBE
{
  const r = validator.validateSql("DESCRIBE users");
  assert(r.ok, "[8] DESCRIBE users ok");
}

// [9] EXPLAIN
{
  const r = validator.validateSql("EXPLAIN SELECT * FROM users");
  assert(r.ok, "[9] EXPLAIN ok");
}

// [10] DELETE
{
  const r = validator.validateSql("DELETE FROM users");
  assert(!r.ok, "[10] DELETE rejected");
}

// [11] INSERT
{
  const r = validator.validateSql("INSERT INTO users (a) VALUES (1)");
  assert(!r.ok, "[11] INSERT rejected");
}

// [12] GRANT
{
  const r = validator.validateSql("GRANT ALL ON *.* TO 'x'@'y'");
  assert(!r.ok, "[12] GRANT rejected");
}

// [13] USE / SET / LOCK
{
  for (const sql of [
    "USE otherdb",
    "SET @x = 1",
    "LOCK TABLES users WRITE",
    "UNLOCK TABLES",
    "CALL proc()",
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
  ]) {
    const r = validator.validateSql(sql);
    assert(!r.ok, `[13] rejected: ${sql}`);
  }
}

// [14] empty / garbage
{
  const r = validator.validateSql("");
  assert(!r.ok && r.reason === "empty_sql", "[14] empty SQL rejected");
}

// [15] SELECT with comma-limit OFFSET form
{
  const r = validator.validateSql(
    "SELECT * FROM users LIMIT 0, 9999",
    { maxRows: 50 }
  );
  assert(r.ok && /LIMIT\s+0,\s*50/.test(r.sql), "[15] LIMIT offset,count clamped");
}

console.log(`\nResult: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
