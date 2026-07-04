const { logger } = require("../../config/logger");

function isActionAllowed(action) {
  if (action.type === "noop") return { allowed: true };
  if (action.type === "send_message") {
    if (action.params.threadId === "current") return { allowed: true };
    logger.warn("[Policy] send_message blocked - only current thread allowed", action.params);
    return { allowed: false, reason: "thread_not_current" };
  }
  if (action.type === "react_message") return { allowed: true };
  logger.warn("[Policy] unknown action blocked", action.type);
  return { allowed: false, reason: "unknown_action" };
}

module.exports = { isActionAllowed };