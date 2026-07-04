const { isActionAllowed } = require("./action-policy");
const { sendMessage, reactMessage } = require("../zalo/zalo.sender");
const { saveOutboundMessage } = require("../conversation/conversation.service");
const { logger } = require("../../config/logger");

function getReactionTargets(action, ctx) {
  if (["all", "all_previous", "previous_messages"].includes(action.params?.target)) return ctx.previousMessages || [];
  if (action.params?.target === "previous") return [ctx.previousMessages?.[0]];
  return [ctx.message];
}

async function executeActions(actions, ctx) {
  const results = [];
  const reactedMessageIds = new Set();
  for (const action of actions) {
    const check = isActionAllowed(action);
    if (!check.allowed) {
      results.push({ action, ok: false, reason: check.reason });
      continue;
    }
    try {
      if (action.type === "noop") {
        results.push({ action, ok: true });
      } else if (action.type === "send_message") {
        const res = await sendMessage({
          threadId: ctx.message.threadId,
          threadType: ctx.message.threadType,
          text: action.params.text,
        });
        if (res.ok) {
          await saveOutboundMessage({
            threadId: ctx.message.threadId,
            threadType: ctx.message.threadType,
            text: action.params.text,
            messageId: res.data?.messageId || null,
            senderId: ctx.botOwnId || "bot",
            senderName: "Zalo AI Bot",
          });
        }
        results.push({ action, ok: res.ok, data: res.data, reason: res.error });
      } else if (action.type === "react_message") {
        const targets = getReactionTargets(action, ctx).filter(Boolean);
        if (targets.length === 0) {
          results.push({ action, ok: false, reason: "no_message_id" });
          continue;
        }
        const reactionResults = [];
        for (const target of targets) {
          if (!target?.messageId || reactedMessageIds.has(target.messageId)) continue;
          reactedMessageIds.add(target.messageId);
          const res = await reactMessage({
            messageId: target.messageId,
            cliMsgId: target.cliMsgId,
            threadId: target.threadId,
            threadType: target.threadType,
          });
          reactionResults.push({ messageId: target.messageId, ok: res.ok, reason: res.reason || res.error });
        }
        results.push({ action, ok: reactionResults.some(r => r.ok), data: reactionResults });
      }
    } catch (e) {
      logger.error("[Executor] action failed", action.type, e.message);
      results.push({ action, ok: false, reason: e.message });
    }
  }
  return results;
}

module.exports = { executeActions };