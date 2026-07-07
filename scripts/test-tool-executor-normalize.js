#!/usr/bin/env node

process.env.TOOL_REGISTRY_ENABLED = "true";
process.env.MYSQL_TOOL_ENABLED = "true";

const { clearRegistry, registerTool } = require("../src/modules/tools/tool-registry");
const { invokeTool } = require("../src/modules/tools/tool-executor");

clearRegistry();
registerTool({
  name: "mysql_readonly_query",
  description: "test tool",
  enabled: true,
  execute: async () => ({ ok: false, error: "mysql_policy_missing" }),
});

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

async function run() {
  const r = await invokeTool("mysql_readonly_query", { sql: "SELECT 1", reason: "test" }, {
    threadId: "g-test",
    groupId: "g-test",
    senderId: "u-test",
    isGroup: true,
    groupsRegistry: { "g-test": { allowedTools: ["mysql_readonly_query"] } },
    usersRegistry: {},
  });

  assert(r.ok === false, "tool executor preserves ok:false");
  assert(r.error === "mysql_policy_missing", "tool executor preserves error");
  assert(!("result" in r), "tool executor does not wrap tool result under result");

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Crash:", e);
  process.exit(1);
});
