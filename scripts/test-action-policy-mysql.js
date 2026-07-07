#!/usr/bin/env node

const { isActionAllowed } = require("../src/modules/actions/action-policy");

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

function ctx() {
  return { message: { threadId: "g-test", senderId: "u-test" } };
}

function run() {
  let r = isActionAllowed({
    type: "mysql_readonly_query",
    params: { sql: "SELECT name FROM customers", reason: "test" },
  }, ctx());
  assert(r.allowed === true, "mysql_readonly_query valid -> allowed");

  r = isActionAllowed({
    type: "mysql_readonly_query",
    params: { reason: "test" },
  }, ctx());
  assert(r.allowed === false && r.reason === "invalid_mysql_action_params", "missing sql -> invalid_mysql_action_params");

  r = isActionAllowed({
    type: "mysql_readonly_query",
    params: { sql: "SELECT name FROM customers" },
  }, ctx());
  assert(r.allowed === false && r.reason === "invalid_mysql_action_params", "missing reason -> invalid_mysql_action_params");

  r = isActionAllowed({ type: "drop_database", params: {} }, ctx());
  assert(r.allowed === false && r.reason === "unknown_action", "unknown action still blocked");

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run();
