const { logger } = require("../../config/logger");

function getCtxValue(ctx, key) {
  return ctx?.[key] ?? ctx?.message?.[key];
}

function decision(action, allowed, reason, ctx) {
  logger.info("[ACTION_POLICY_DECISION]", {
    type: action?.type,
    allowed,
    reason: reason || null,
    threadId: getCtxValue(ctx, "threadId"),
    senderId: getCtxValue(ctx, "senderId"),
  });
  return reason ? { allowed, reason } : { allowed };
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isActionAllowed(action, ctx = {}) {
  if (action.type === "noop") return decision(action, true, null, ctx);
  if (action.type === "send_message") {
    if (action.params.threadId === "current") return decision(action, true, null, ctx);
    logger.warn("[Policy] send_message blocked - only current thread allowed", action.params);
    return decision(action, false, "thread_not_current", ctx);
  }
  if (action.type === "react_message") return decision(action, true, null, ctx);
  if (action.type === "mysql_readonly_query") {
    if (!isNonEmptyString(action.params?.sql) || !isNonEmptyString(action.params?.reason)) {
      return decision(action, false, "invalid_mysql_action_params", ctx);
    }
    logger.info("[Policy] mysql_readonly_query allowed", {
      threadId: getCtxValue(ctx, "threadId"),
      senderId: getCtxValue(ctx, "senderId"),
    });
    return decision(action, true, null, ctx);
  }
  logger.warn("[Policy] unknown action blocked", action.type);
  return decision(action, false, "unknown_action", ctx);
}

module.exports = { isActionAllowed };