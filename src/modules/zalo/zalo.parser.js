const { logger } = require("../../config/logger");
const { env } = require("../../config/env");

const SENDER_CANDIDATE_KEYS = ["uidFrom", "senderId", "fromId", "authorId", "uid"];

function pickFirstId(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return undefined;
}

/**
 * Resolve Zalo sender id from raw message. Never uses threadId as sender in group chats.
 */
function resolveSenderId(raw, data, { isGroup = false, threadId } = {}) {
  const fromData = pickFirstId(data, SENDER_CANDIDATE_KEYS);
  if (fromData) return fromData;

  const fromRaw = pickFirstId(raw, SENDER_CANDIDATE_KEYS);
  if (fromRaw) return fromRaw;

  if (!isGroup && threadId != null && String(threadId).trim() !== "") {
    return String(threadId).trim();
  }

  const rawKeys = raw && typeof raw === "object" ? Object.keys(raw) : [];
  const dataKeys = data && typeof data === "object" ? Object.keys(data) : [];
  logger.warn("[ZaloParser] could not resolve senderId", {
    threadId,
    isGroup,
    threadType: isGroup ? "group" : "user",
    rawKeys,
    dataKeys,
  });
  return undefined;
}

function parseZaloMessage(raw, botOwnId) {
  const isGroup = raw.type === 1; // ThreadType.Group = 1 in zca-js
  const data = raw.data || {};
  const threadId = raw.threadId || data.threadId;
  const text = data.content || data.msg || "";
  const mentions = (data.mentions || []).map((m) => m.uid || m.id).filter(Boolean);
  const isMentionBot = botOwnId ? mentions.includes(botOwnId) : false;
  const msgId = data.msgId ? String(data.msgId) : "";
  const cliMsgId = data.cliMsgId ? String(data.cliMsgId) : msgId;

  const senderId = resolveSenderId(raw, data, { isGroup, threadId });

  if (env.ZALO_DEBUG_MESSAGE && senderId) {
    logger.debug("[ZaloParser] resolved senderId", { senderId, threadId, isGroup });
  }

  return {
    platform: "zalo",
    threadId,
    threadType: isGroup ? "group" : "user",
    messageId: msgId || cliMsgId,
    cliMsgId,
    senderId,
    senderName: data.dName || data.senderName,
    text,
    isSelf: !!raw.isSelf,
    isGroup,
    mentions,
    isMentionBot,
    raw,
  };
}

module.exports = { parseZaloMessage, resolveSenderId };