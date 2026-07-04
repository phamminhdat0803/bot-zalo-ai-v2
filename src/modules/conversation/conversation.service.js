const { appendMessage, getRecentMessages: repoGetRecent, configure: repoConfigure } = require("./conversation.repository");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { randomUUID } = require("crypto");

let enabled = true;
let storeRaw = false;
let recentLimit = 30;
let saveNonWhitelist = false;

function configureFromEnv() {
  enabled = (process.env.CONVERSATION_STORAGE_ENABLED ?? "true") !== "false";
  storeRaw = (process.env.CONVERSATION_STORE_RAW ?? "false") === "true";
  recentLimit = parseInt(process.env.CONVERSATION_RECENT_LIMIT || "30", 10);
  saveNonWhitelist = (process.env.CONVERSATION_SAVE_NON_WHITELIST ?? "false") === "true";
  repoConfigure({
    storageDir: process.env.CONVERSATION_STORAGE_DIR || "./data/conversations",
    storeRaw,
  });
}

function generateId(threadId) {
  return `${threadId}:${Date.now()}:${randomUUID().slice(0, 8)}`;
}

function toStoredMessage(normalizedMessage, direction = "inbound") {
  const id = normalizedMessage.messageId || generateId(normalizedMessage.threadId);
  return {
    id,
    direction,
    platform: "zalo",
    threadId: normalizedMessage.threadId,
    threadType: normalizedMessage.threadType,
    messageId: normalizedMessage.messageId || null,
    senderId: normalizedMessage.senderId || null,
    senderName: normalizedMessage.senderName || null,
    text: normalizedMessage.text || null,
    isSelf: !!normalizedMessage.isSelf,
    isGroup: !!normalizedMessage.isGroup,
    mentions: normalizedMessage.mentions || [],
    isMentionBot: !!normalizedMessage.isMentionBot,
    quote: normalizedMessage.quote || null,
    attachments: normalizedMessage.attachments || [],
    raw: storeRaw ? (normalizedMessage.raw || null) : null,
    createdAt: new Date().toISOString(),
  };
}

async function saveInboundMessage(normalizedMessage) {
  if (!enabled) return { ok: false, reason: "disabled" };

  const stored = toStoredMessage(normalizedMessage, "inbound");
  const res = await appendMessage(stored);
  if (res.ok && process.env.ZALO_DEBUG_MESSAGE === "true") {
    logger.debug("[Conversation] saved inbound", stored.threadId, stored.messageId);
  }
  return res;
}

async function saveOutboundMessage(outbound) {
  if (!enabled) return { ok: false, reason: "disabled" };

  const msg = {
    id: outbound.messageId || generateId(outbound.threadId),
    direction: "outbound",
    platform: "zalo",
    threadId: outbound.threadId,
    threadType: outbound.threadType,
    messageId: outbound.messageId || null,
    senderId: outbound.senderId || "bot",
    senderName: outbound.senderName || "Zalo AI Bot",
    text: outbound.text || null,
    isSelf: true,
    isGroup: outbound.threadType === "group",
    mentions: [],
    isMentionBot: false,
    quote: null,
    attachments: [],
    raw: storeRaw ? (outbound.raw || null) : null,
    createdAt: new Date().toISOString(),
  };

  const res = await appendMessage(msg);
  if (res.ok && process.env.ZALO_DEBUG_MESSAGE === "true") {
    logger.debug("[Conversation] saved outbound", msg.threadId);
  }
  return res;
}

async function getRecentThreadMessages(threadId, limit) {
  if (!enabled) return [];
  const l = limit || recentLimit;
  return repoGetRecent(threadId, l);
}

module.exports = {
  configureFromEnv,
  saveInboundMessage,
  saveOutboundMessage,
  getRecentThreadMessages,
  toStoredMessage,
};
