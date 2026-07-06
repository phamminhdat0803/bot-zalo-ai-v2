const { isActionAllowed } = require("./action-policy");
const { sendMessage, reactMessage } = require("../zalo/zalo.sender");
const { saveOutboundMessage } = require("../conversation/conversation.service");
const { logger } = require("../../config/logger");
const { resolveReactionTargets, logReactionResolve } = require("./reaction-target-resolver");
const { extractSendMessageIds } = require("../zalo/send-message-result");
const { isSyntheticMessageId } = require("./message-identity");

const REACT_NOT_FOUND_TEXT = "Mình chưa tìm thấy tin nhắn đó để thả cảm xúc.";

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
          await persistOutbound(ctx.message.threadId, ctx.message.threadType, action.params.text, res.data, ctx);
        }
        results.push({ action, ok: res.ok, data: res.data, reason: res.error });
      } else if (action.type === "react_message") {
        const resolved = resolveReactionTargets(action.params, ctx);
        logReactionResolve(action.params, resolved);
        const targets = resolved.targets.filter(Boolean);
        if (targets.length === 0) {
          if (resolved.notifyUser) {
            const notify = await sendMessage({
              threadId: ctx.message.threadId,
              threadType: ctx.message.threadType,
              text: REACT_NOT_FOUND_TEXT,
            });
            if (notify.ok) {
              await persistOutbound(
                ctx.message.threadId,
                ctx.message.threadType,
                REACT_NOT_FOUND_TEXT,
                notify.data,
                ctx
              );
            }
          }
          results.push({
            action,
            ok: false,
            reason: resolved.reason || "no_message_id",
          });
          continue;
        }
        const reactionResults = [];
        for (const target of targets) {
          if (!target?.messageId || !target?.cliMsgId) {
            logger.warn("[ActionExecutor] react_message skipped target", {
              reason: "missing_zalo_identity",
              messageId: target?.messageId,
              cliMsgId: target?.cliMsgId,
            });
            continue;
          }
          if (isSyntheticMessageId(target.messageId) || isSyntheticMessageId(target.cliMsgId)) {
            logger.warn("[ActionExecutor] react_message skipped target", {
              reason: "synthetic_message_id",
              messageId: target.messageId,
            });
            continue;
          }
          const dedupeKey = `${target.messageId}:${target.cliMsgId}`;
          if (reactedMessageIds.has(dedupeKey)) continue;
          reactedMessageIds.add(dedupeKey);
          const res = await reactMessage({
            messageId: target.messageId,
            cliMsgId: target.cliMsgId,
            threadId: target.threadId,
            threadType: target.threadType,
          });
          if (res.ok) {
            logger.info("[ActionExecutor] react_message ok", {
              messageId: target.messageId,
              cliMsgId: target.cliMsgId,
              textPreview: target.text ? String(target.text).slice(0, 80) : null,
            });
          } else {
            logger.warn("[ActionExecutor] react_message failed", {
              messageId: target.messageId,
              cliMsgId: target.cliMsgId,
              reason: res.reason || res.error,
            });
          }
          reactionResults.push({
            messageId: target.messageId,
            cliMsgId: target.cliMsgId,
            ok: res.ok,
            reason: res.reason || res.error,
          });
        }
        results.push({ action, ok: reactionResults.some((r) => r.ok), data: reactionResults });
      }
    } catch (e) {
      logger.error("[Executor] action failed", action.type, e.message);
      results.push({ action, ok: false, reason: e.message });
    }
  }
  return results;
}

async function persistOutbound(threadId, threadType, text, sendData, ctx) {
  const ids = extractSendMessageIds(sendData);
  await saveOutboundMessage({
    threadId,
    threadType,
    text,
    messageId: ids.messageId,
    cliMsgId: ids.cliMsgId,
    senderId: ctx.botOwnId || "bot",
    senderName: "Zalo AI Bot",
  });
}

module.exports = { executeActions, REACT_NOT_FOUND_TEXT };