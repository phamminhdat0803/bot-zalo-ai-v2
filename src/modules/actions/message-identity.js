/** Internal conversation row id: threadId:timestamp:uuid — not valid for Zalo addReaction */
function isSyntheticMessageId(value) {
  if (value === undefined || value === null) return false;
  const s = String(value).trim();
  if (!s) return false;
  const parts = s.split(":");
  if (parts.length < 3) return false;
  const tail = parts[parts.length - 1];
  return /^[0-9a-f]{6,12}$/i.test(tail) && /^\d+$/.test(parts[parts.length - 2]);
}

function getMessageKeys(msg) {
  if (!msg || typeof msg !== "object") return [];
  const keys = ["messageId", "cliMsgId", "msgId", "zaloMessageId", "zaloCliMsgId"];
  const out = [];
  for (const k of keys) {
    const v = msg[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      const s = String(v).trim();
      if (!isSyntheticMessageId(s)) out.push(s);
    }
  }
  return out;
}

function isSameMessage(a, b) {
  if (!a || !b) return false;
  const ka = new Set(getMessageKeys(a));
  const kb = new Set(getMessageKeys(b));
  for (const id of ka) {
    if (kb.has(id)) return true;
  }
  return false;
}

function filterOutCurrentMessage(messages, currentMessage) {
  if (!Array.isArray(messages)) return [];
  if (!currentMessage) return messages.slice();
  return messages.filter((m) => m && !isSameMessage(m, currentMessage));
}

function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function getZaloReactionIdentity(message) {
  if (!message || typeof message !== "object") return null;
  const messageId = message.messageId || message.msgId || message.zaloMessageId || null;
  if (!messageId || isSyntheticMessageId(messageId)) return null;
  const cliMsgId = message.cliMsgId || message.zaloCliMsgId || null;
  if (!cliMsgId || isSyntheticMessageId(cliMsgId)) return null;
  return { messageId: String(messageId), cliMsgId: String(cliMsgId) };
}

function hasValidZaloReactionIdentity(message) {
  return getZaloReactionIdentity(message) != null;
}

function toReactionTarget(msg, fallbackThread) {
  if (!msg) return { target: null, reason: "missing_message" };
  const id = getZaloReactionIdentity(msg);
  if (!id) {
    const rawMid = msg.messageId || msg.msgId;
    if (!rawMid && msg.id) return { target: null, reason: "synthetic_message_id" };
    if (!rawMid) return { target: null, reason: "missing_message_id" };
    if (isSyntheticMessageId(rawMid) || isSyntheticMessageId(msg.id)) {
      return { target: null, reason: "synthetic_message_id" };
    }
    if (!msg.cliMsgId && !msg.zaloCliMsgId) {
      return { target: null, reason: "missing_cli_msg_id" };
    }
    return { target: null, reason: "target_found_but_missing_zalo_identity" };
  }
  const threadId = msg.threadId || fallbackThread?.threadId;
  const threadType = msg.threadType || fallbackThread?.threadType || "user";
  const text = typeof msg.text === "string" ? msg.text : msg.text != null ? String(msg.text) : null;
  return {
    target: {
      messageId: id.messageId,
      cliMsgId: id.cliMsgId,
      threadId,
      threadType,
      text,
    },
    reason: null,
  };
}

module.exports = {
  getMessageKeys,
  isSameMessage,
  filterOutCurrentMessage,
  normalizeText,
  toReactionTarget,
  isSyntheticMessageId,
  getZaloReactionIdentity,
  hasValidZaloReactionIdentity,
};