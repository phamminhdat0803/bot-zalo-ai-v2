/**
 * Unit tests for react_message target resolver (no Zalo API).
 */
const { resolveReactionTargets } = require("../src/modules/actions/reaction-target-resolver");
const { filterOutCurrentMessage, isSameMessage } = require("../src/modules/actions/message-identity");

function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    return;
  }
  console.log("OK", name);
}

const thread = { threadId: "t1", threadType: "user" };

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

// Case A: matchText
{
  const current = msg("cmd", 'thả tim tin nhắn này cho tôi: sao nay ngoan rồi');
  const history = [
    current,
    msg("2", "sao nay ngoan rồi"),
    msg("1", "hello"),
  ];
  const filtered = filterOutCurrentMessage(history, current);
  const r = resolveReactionTargets(
    { target: "matched_text", matchText: "sao nay ngoan rồi", reaction: "heart" },
    { message: current, previousMessages: filtered }
  );
  assert("A matchText hits old message", r.targets.length === 1 && r.targets[0].messageId === "2");
  assert("A not current", r.targets[0].messageId !== "cmd");
}

// Case B: previous
{
  const current = msg("cmd", "thả tim tin trên");
  const history = filterOutCurrentMessage([current, msg("prev", "tin ngay trước")], current);
  const r = resolveReactionTargets({ target: "previous" }, { message: current, previousMessages: history });
  assert("B previous", r.targets[0]?.text === "tin ngay trước");
}

// Case C: matchText not found
{
  const current = msg("cmd", "thả tim tin nhắn này cho tôi: abc-not-exist");
  const history = filterOutCurrentMessage([current, msg("2", "other")], current);
  const r = resolveReactionTargets(
    { matchText: "abc-not-exist", target: "matched_text" },
    { message: current, previousMessages: history }
  );
  assert("C no targets", r.targets.length === 0);
  assert("C notify", r.notifyUser === true);
  assert("C reason", r.reason === "match_text_not_found");
}

// Case D: history contains current — resolver filters internally too
{
  const current = msg("cmd", "thả tim tin trên");
  const polluted = [current, msg("prev", "tin ngay trước")];
  const r = resolveReactionTargets(
    { target: "previous" },
    { message: current, previousMessages: polluted }
  );
  assert("D filter current from previous", r.targets[0]?.messageId === "prev");
}

assert("isSameMessage", isSameMessage(msg("1", "a"), { messageId: "1" }));

console.log(process.exitCode ? "SOME FAILED" : "DONE");