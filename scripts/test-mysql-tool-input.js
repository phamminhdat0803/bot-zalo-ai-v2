#!/usr/bin/env node
/**
 * scripts/test-mysql-tool-input.js
 *
 * Verifies zod input validation for mysql-readonly.tool.
 * Tests ONLY the schema contract; no DB, no registry side-effects beyond
 * requiring the tool module.
 */

const { MysqlReadonlyInputSchema, HARD_MAX_ROWS } = require("../src/modules/tools/built-in/mysql-readonly.tool");

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

// Missing sql
{
  const r = MysqlReadonlyInputSchema.safeParse({ reason: "test" });
  assert(!r.success, "[1] missing sql → fails");
}
// Missing reason
{
  const r = MysqlReadonlyInputSchema.safeParse({ sql: "SELECT 1" });
  assert(!r.success, "[2] missing reason → fails");
}
// maxRows wrong type
{
  const r = MysqlReadonlyInputSchema.safeParse({ sql: "SELECT 1", reason: "x", maxRows: "100" });
  assert(!r.success, "[3] maxRows string → fails");
}
// maxRows out of range
{
  const r = MysqlReadonlyInputSchema.safeParse({ sql: "SELECT 1", reason: "x", maxRows: 0 });
  assert(!r.success, "[4] maxRows=0 → fails");
}
{
  const r = MysqlReadonlyInputSchema.safeParse({ sql: "SELECT 1", reason: "x", maxRows: HARD_MAX_ROWS + 1 });
  assert(!r.success, "[5] maxRows > hard cap → fails");
}
// sql too long
{
  const r = MysqlReadonlyInputSchema.safeParse({
    sql: "SELECT '" + "x".repeat(10001) + "'",
    reason: "y",
  });
  assert(!r.success, "[6] sql > 10000 chars → fails");
}
// reason too long
{
  const r = MysqlReadonlyInputSchema.safeParse({
    sql: "SELECT 1",
    reason: "x".repeat(1001),
  });
  assert(!r.success, "[7] reason > 1000 chars → fails");
}
// valid input
{
  const r = MysqlReadonlyInputSchema.safeParse({
    sql: "SELECT * FROM customers",
    reason: "lookup",
  });
  assert(r.success, "[8] minimal valid → passes");
}
// valid with maxRows
{
  const r = MysqlReadonlyInputSchema.safeParse({
    sql: "SELECT * FROM customers",
    reason: "lookup",
    maxRows: 50,
  });
  assert(r.success, "[9] valid with maxRows → passes");
}
// null / undefined
{
  const r = MysqlReadonlyInputSchema.safeParse(null);
  assert(!r.success, "[10] null input → fails");
}
{
  const r = MysqlReadonlyInputSchema.safeParse(undefined);
  assert(!r.success, "[11] undefined input → fails");
}
// empty strings
{
  const r = MysqlReadonlyInputSchema.safeParse({ sql: "", reason: "x" });
  assert(!r.success, "[12] empty sql → fails");
}
{
  const r = MysqlReadonlyInputSchema.safeParse({ sql: "SELECT 1", reason: "" });
  assert(!r.success, "[13] empty reason → fails");
}

console.log(`\nResult: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);