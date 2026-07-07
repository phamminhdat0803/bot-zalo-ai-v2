#!/usr/bin/env node

const path = require("path");

const state = {
  sent: [],
  invoked: [],
  toolResult: { ok: true, result: { ok: true, rows: [{ name: "A" }, { name: "B" }], fields: ["name"], rowCount: 2 } },
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
  reactMessage: async (params) => ({ ok: true, data: params }),
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
      messageId: "mid-1",
    },
    botOwnId: "bot-test",
  };
}

async function run() {
  state.sent = [];
  state.invoked = [];
  state.toolResult = { ok: true, rows: [{ name: "A" }, { name: "B" }], fields: ["name"], rowCount: 2 };
  let results = await executeActions([{ type: "mysql_readonly_query", params: { sql: "SELECT name FROM customers", reason: "test" } }], baseCtx());
  assert(state.invoked.length === 1, "mysql action calls invokeTool once");
  assert(state.invoked[0].name === "mysql_readonly_query", "invokeTool name correct");
  assert(state.invoked[0].ctx.threadId === "g-test", "tool ctx includes threadId");
  assert(state.invoked[0].ctx.groupId === "g-test", "tool ctx falls back groupId to threadId for group");
  assert(state.invoked[0].ctx.senderId === "u-test", "tool ctx includes senderId");
  assert(state.invoked[0].ctx.isGroup === true, "tool ctx includes isGroup true");
  assert(state.sent[0]?.text.includes("Kết quả truy vấn customers"), "ok result sends formatted title");
  assert(state.sent[0]?.text.includes("1. A") && state.sent[0]?.text.includes("Tổng: 2 dòng."), "ok result sends rows and total");
  assert(results[0].ok === true, "executor result ok when tool ok and send ok");

  state.sent = [];
  state.invoked = [];
  state.toolResult = { ok: false, error: "mysql_table_not_allowed" };
  results = await executeActions([{ type: "mysql_readonly_query", params: { sql: "SELECT name FROM users", reason: "test" } }], baseCtx());
  assert(state.sent[0]?.text === "Bảng này chưa được cấp quyền.", "table denied sends safe error");
  assert(results[0].ok === false, "executor result fail on tool fail");

  state.sent = [];
  state.toolResult = { ok: false, reason: "permission_denied" };
  await executeActions([{ type: "mysql_readonly_query", params: { sql: "SELECT name FROM customers", reason: "test" } }], baseCtx());
  assert(state.sent[0]?.text === "Group/user chưa được cấp quyền truy vấn.", "permission denied sends safe error");

  state.sent = [];
  state.toolResult = { ok: true, rows: [], fields: ["name"], rowCount: 0 };
  await executeActions([{ type: "mysql_readonly_query", params: { sql: "SELECT name FROM customers", reason: "test" } }], baseCtx());
  assert(state.sent[0]?.text === "Không tìm thấy dữ liệu phù hợp.", "empty rows sends no data message");

  state.sent = [];
  const many = Array.from({ length: 12 }, (_, i) => ({ name: `N${i + 1}` }));
  state.toolResult = { ok: true, rows: many, fields: ["name"], rowCount: 12 };
  await executeActions([{ type: "mysql_readonly_query", params: { sql: "SELECT name FROM customers", reason: "test" } }], baseCtx());
  assert(state.sent[0]?.text.includes("10. N10"), "many rows includes 10th preview");
  assert(!state.sent[0]?.text.includes("11. N11"), "many rows hides 11th preview");
  assert(state.sent[0]?.text.includes("chỉ hiển thị 10 dòng đầu"), "many rows notes preview limit");

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Crash:", e);
  process.exit(1);
});
