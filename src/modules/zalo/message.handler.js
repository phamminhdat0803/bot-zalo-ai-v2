const { parseZaloMessage } = require("./zalo.parser");
const { filterOutCurrentMessage } = require("../actions/message-identity");
const { planActions } = require("../ai/ai.service");
const { executeActions } = require("../actions/action-executor");
const { withTyping } = require("./typing.service");
const { getRecentMessages, rememberMessage } = require("./message.store");
const { saveInboundMessage, getRecentThreadMessages } = require("../conversation/conversation.service");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { sendMessage } = require("./zalo.sender");
const {
  buildPromptContext,
  formatPromptDebugReply,
  isPromptAdmin,
} = require("../ai/prompt-manager");

async function handleZaloMessage(raw, botOwnId) {
  try {
    const msg = parseZaloMessage(raw, botOwnId);

    // save inbound early (respect whitelist + saveNonWhitelist)
    if (msg.isGroup && env.ZALO_ALLOWED_GROUP_IDS.length > 0 && !env.ZALO_ALLOWED_GROUP_IDS.includes(msg.threadId)) {
      if (!env.CONVERSATION_SAVE_NON_WHITELIST) {
        // skip save + skip processing
        return;
      }
      // else: save even if non-whitelist (saveNonWhitelist=true)
    }
    await saveInboundMessage(msg);

    if (msg.isSelf) {
      logger.debug?.("[Handler] ignored self message", msg.threadId);
      return;
    }
    if (msg.isGroup && env.ZALO_ALLOWED_GROUP_IDS.length > 0 && !env.ZALO_ALLOWED_GROUP_IDS.includes(msg.threadId)) {
      logger.debug?.("[Handler] ignored non-whitelist group", msg.threadId);
      return;
    }
    if (env.ZALO_DEBUG_MESSAGE) logger.debug("[RAW]", JSON.stringify(raw).slice(0, 300));

    // prefer persistent recent, fallback in-memory
    let previousMessages = [];
    try {
      previousMessages = await getRecentThreadMessages(msg.threadId, env.CONVERSATION_RECENT_LIMIT);
    } catch (_) {}
    if (!previousMessages || previousMessages.length === 0) {
      previousMessages = getRecentMessages(msg.threadId, env.CONVERSATION_RECENT_LIMIT);
    }
    previousMessages = filterOutCurrentMessage(previousMessages, msg);

    rememberMessage(msg);

    const textTrimmed = (msg.text || "").trim();

    if (textTrimmed === "/prompt debug" || textTrimmed.startsWith("/prompt debug ")) {
      if (!env.PROMPT_ADMIN_ENABLED || !isPromptAdmin(msg.senderId)) {
        logger.debug?.("[Handler] prompt debug denied", msg.senderId);
        return;
      }
      const ctx = await buildPromptContext({
        normalizedMessage: msg,
        previousMessages,
      });
      const reply = formatPromptDebugReply(ctx);
      await sendMessage({
        threadId: msg.threadId,
        threadType: msg.threadType,
        text: reply,
      });
      return;
    }

    if (msg.isGroup && env.ZALO_REPLY_ONLY_WHEN_MENTIONED && !msg.isMentionBot) {
      logger.debug?.("[Handler] ignored non-mention group", msg.threadId);
      return;
    }

    if (!env.OPENAI_API_KEY) {
      logger.debug?.("[Handler] no OPENAI_API_KEY — skip AI reply");
      return;
    }

    const ctx = { message: msg, previousMessages, botOwnId };
    const results = await withTyping(
      { threadId: msg.threadId, threadType: msg.threadType },
      async () => {
        const plan = await planActions({ ...msg, previousMessages });
        return executeActions(plan.actions || [], ctx);
      },
    );

    logger.info("[Handler] done", msg.threadId, results.map(r => r.action.type));
  } catch (e) {
    logger.error("[Handler] crash prevented", e.message);
  }
}

module.exports = { handleZaloMessage };