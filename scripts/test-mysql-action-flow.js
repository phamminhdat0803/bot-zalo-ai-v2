#!/usr/bin/env node

const path = require("path");

const state = {
  sent: [],
  reacted: [],
  invoked: [],
  toolResult: { ok: true, rows: [{ name: "A" }], fields: ["name"], rowCount: 1 },
};

function mockModule(rel, exports) {
  const p = path.resolve(__dirname, rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}

mockModule("../src/modules/zalo/zalo.sender.js", {
  sendMessage: async (params) => {
    state.sent.push(params);
    return { ok: true, data: { msgId: `m-${state.sent.length}`, cliMsgId: `c-${state.sent.length}` } };
  },
  reactMessage: async (params) => {
    state.reacted.push(params);
    return { ok: true, data: params };
  },
});
mockModule("../src/modules/conversation/conversation.service.js", {
  saveOutboundMessage: async () => ({ ok: true }),
});
mockModule("../src/modules/tools/tool-executor.js", {
  invokeTool: async (name, input, ctx) => {
    state.invoked.push({ name, input, ctx });
    return state.toolResult;
  },
});

const { executeActions } = require("../src/modules/actions/action-executor");

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

function baseCtx() {
  return {
    message: {
      threadId: "g-test",
      threadType: "group",
      senderId: "u-test",
      isGroup: true,
      messageId: "current-mid",
      cliMsgId: "current-cli",
      text: "hello",
    },
    previousMessages: [{ messageId: "prev-mid", cliMsgId: "prev-cli", threadId: "g-test", threadType: "group", text: "prev" }],
    botOwnId: "bot-test",
  };
}

async function run() {
  state.sent = [];
  let results = await executeActions([{ type: "send_message", params: { threadId: "current", text: "Hi" } }], baseCtx());
  assert(results[0].ok === true && state.sent[0]?.text === "Hi", "send_message still works");

  state.reacted = [];
  results = await executeActions([{ type: "react_message", params: { target: "previous" } }], baseCtx());
  assert(results[0].ok === true && state.reacted.length === 1, "react_message still works");

  results = await executeActions([{ type: "noop", params: {} }], baseCtx());
  assert(results[0].ok === true, "noop still works");

  state.sent = [];
  state.invoked = [];
  state.toolResult = { ok: false, reason: "permission_denied" };
  results = await executeActions([{ type: "mysql_readonly_query", params: { sql: "SELECT name FROM customers", reason: "test" } }], baseCtx());
  assert(results[0].ok === false, "mysql fail does not crash");
  assert(state.invoked.length === 1, "mysql fail still invoked tool");
  assert(state.sent[0]?.text === "Group/user chưa được cấp quyền truy vấn.", "mysql fail sends safe message");

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Crash:", e);
  process.exit(1);
});
