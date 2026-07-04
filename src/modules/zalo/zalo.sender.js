const { getZaloApi } = require("./zalo.client");
const { logger } = require("../../config/logger");
const { Reactions } = require("zca-js");
const { sendTypingPulse } = require("./typing.service");

async function sendMessage(params) {
  const api = getZaloApi();
  const type = params.threadType === "group" ? 1 : 0; // ThreadType
  try {
    const res = await api.sendMessage({ msg: params.text, quote: params.quote }, params.threadId, type);
    return { ok: true, data: res };
  } catch (e) {
    logger.error("sendMessage failed", e.message);
    return { ok: false, error: e.message };
  }
}

async function reactMessage(params) {
  const api = getZaloApi();
  if (!api.addReaction) {
    logger.warn("reactMessage: SDK does not support addReaction yet");
    return { ok: false, reason: "react_not_supported" };
  }
  try {
    const msgId = String(params.messageId || "");
    const cliMsgId = String(params.cliMsgId || params.messageId || "");

    if (!msgId || !cliMsgId || !params.threadId) {
      return { ok: false, reason: "invalid_reaction_destination" };
    }

    const dest = {
      data: { msgId, cliMsgId },
      threadId: params.threadId,
      type: params.threadType === "group" ? 1 : 0,
    };
    const res = await api.addReaction(params.icon || Reactions.HEART, dest);
    return { ok: true, data: res };
  } catch (e) {
    logger.warn("reactMessage failed", e.message);
    return { ok: false, error: e.message };
  }
}

async function sendTyping(params) {
  return sendTypingPulse(params.threadId, params.threadType);
}

module.exports = { sendMessage, reactMessage, sendTyping };