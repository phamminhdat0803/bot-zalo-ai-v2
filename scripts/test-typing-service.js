/**
 * Typing service smoke tests (no Zalo login required).
 * Run: node scripts/test-typing-service.js
 */
process.env.ZALO_TYPING_ENABLED = "true";
process.env.ZALO_TYPING_DELAY_MS = "50";
process.env.ZALO_TYPING_INTERVAL_MS = "200";
process.env.ZALO_TYPING_MAX_MS = "2000";
process.env.ZALO_TYPING_LOG = "false";

// Reload env module after setting env
delete require.cache[require.resolve("../src/config/env")];
delete require.cache[require.resolve("../src/modules/zalo/zalo.client")];
delete require.cache[require.resolve("../src/modules/zalo/typing.service")];

const zaloClient = require("../src/modules/zalo/zalo.client");
const typing = require("../src/modules/zalo/typing.service");

let sendCount = 0;
const mockApi = {
  sendTypingEvent: async (...args) => {
    sendCount += 1;
    return { status: 0 };
  },
};

zaloClient.setZaloApi(mockApi, "bot-test");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("OK:", msg);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  typing._resetForTests();
  sendCount = 0;

  assert(typing.isTypingEnabled(), "typing enabled via ENV");

  process.env.ZALO_TYPING_ENABLED = "false";
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/modules/zalo/typing.service")];
  const typingOff = require("../src/modules/zalo/typing.service");
  assert(!typingOff.isTypingEnabled(), "typing disabled via ENV");
  process.env.ZALO_TYPING_ENABLED = "true";
  delete require.cache[require.resolve("../src/config/env")];
  delete require.cache[require.resolve("../src/modules/zalo/typing.service")];

  const t = require("../src/modules/zalo/typing.service");
  t._resetForTests();
  sendCount = 0;

  let aiRan = false;
  await t.withTyping({ threadId: "thread-a", threadType: "user" }, async () => {
    await sleep(650);
    aiRan = true;
    throw new Error("ai fail");
  }).catch(() => {});

  assert(aiRan, "withTyping runs fn even on error");
  assert(t._getActiveThreadIds().length === 0, "typing cleared after AI error");
  assert(sendCount >= 2, `heartbeat during AI delay (pulses=${sendCount})`);

  t._resetForTests();
  sendCount = 0;
  t.startTyping("thread-g", "group");
  t.startTyping("thread-g", "group");
  await sleep(120);
  assert(t._getActiveThreadIds().length === 1, "single interval per thread (debounce/ref)");
  t.stopTyping("thread-g");
  t.stopTyping("thread-g");
  assert(t._getActiveThreadIds().length === 0, "refCount stop clears once");

  const noApi = require("../src/modules/zalo/typing.service");
  zaloClient.setZaloApi({ sendTypingEvent: undefined }, "x");
  const res = await noApi.sendTypingPulse("t1", "user");
  assert(res.reason === "not_supported", "guard when sendTypingEvent missing");

  zaloClient.setZaloApi(mockApi, "bot-test");
  console.log("\nAll typing tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});