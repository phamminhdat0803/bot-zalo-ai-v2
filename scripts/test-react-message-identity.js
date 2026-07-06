/**
 * react_message Zalo identity + resolver (no API).
 */
const {
  toReactionTarget,
  isSyntheticMessageId,
  hasValidZaloReactionIdentity,
} = require("../src/modules/actions/message-identity");
const { enrichReactParamsFromUserMessage, inferReactionMatchTextFromUserText } = require("../src/modules/actions/reaction-infer");
const { resolveReactionTargets } = require("../src/modules/actions/reaction-target-resolver");

function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    return;
  }
  console.log("OK", name);
}

function msg(id, text, extra = {}) {
  return {
    messageId: String(id),
    cliMsgId: String(id),
    threadId: "t1",
    threadType: "user",
    text,
    ...extra,
  };
}

// Case 1: synthetic id must not react
{
  const synthetic = {
    id: "t1:1783152463750:e838a371",
    threadId: "t1",
    threadType: "user",
    text: "x",
  };
  assert("1 isSynthetic", isSyntheticMessageId(synthetic.id));
  const r = toReactionTarget(synthetic, { threadId: "t1", threadType: "user" });
  assert("1 no target", r.target == null);
  assert("1 reason synthetic", r.reason === "synthetic_message_id");
}

// Case 2: valid zalo ids -> target
{
  const m = msg("9055859889841854657", "sao nay ngoan rồi");
  const r = toReactionTarget(m, { threadId: "t1", threadType: "user" });
  assert("2 has target", r.target && r.target.messageId === "9055859889841854657");
  assert("2 has cliMsgId", r.target.cliMsgId === "9055859889841854657");
}

// Case 3: infer matchText from colon
{
  const inferred = inferReactionMatchTextFromUserText("thả tim tin nhắn này cho tôi: sao nay ngoan rồi");
  assert("3 infer", inferred === "sao nay ngoan rồi");
  const enriched = enrichReactParamsFromUserMessage({ target: "previous", reaction: "heart" }, {
    text: "thả tim tin nhắn này cho tôi: sao nay ngoan rồi",
    threadId: "t1",
    threadType: "user",
  });
  assert("3 enriched matchText", enriched.matchText === "sao nay ngoan rồi");
  assert("3 enriched target", enriched.target === "matched_text");
}

// Case 4: matchText resolves to correct message (not command)
{
  const current = msg("cmd", "thả tim tin nhắn này cho tôi: sao nay ngoan rồi");
  const history = [msg("2", "sao nay ngoan rồi"), msg("1", "hello")];
  const r = resolveReactionTargets(
    { reaction: "heart" },
    { message: current, previousMessages: history }
  );
  assert("4 match path", r.resolvePath === "matchText");
  assert("4 hits msg 2", r.targets[0]?.messageId === "2");
}

// Case 5: previous skips outbound without cliMsgId
{
  const current = msg("cmd", "thả tim");
  const botOutboundNoCli = {
    id: "t1:999:abc12345",
    messageId: null,
    cliMsgId: null,
    threadId: "t1",
    threadType: "user",
    text: "bot reply",
    isSelf: true,
  };
  const userPrev = msg("real", "user said hi");
  const history = [botOutboundNoCli, userPrev];
  const r = resolveReactionTargets({ target: "previous" }, { message: current, previousMessages: history });
  assert("5 previous skips bad", r.targets[0]?.messageId === "real");
  assert("5 valid identity", hasValidZaloReactionIdentity(r.targets[0]));
}

console.log(process.exitCode ? "SOME FAILED" : "DONE");