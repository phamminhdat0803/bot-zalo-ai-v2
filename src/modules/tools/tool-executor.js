/**
 * Tool Executor — uniform call entry point.
 *
 * Used when AI emits a tool-call shape (future phase) or when
 * an action-executor bridge wants to dispatch a legacy action through
 * the tool pipeline for unified permission/audit handling.
 *
 * Phase 2: safe to call manually. Flow keeps using action-executor.
 */

const { getTool, isToolEnabled } = require("./tool-registry");
const { isToolAllowedForContext } = require("../permissions/tool-permission");
const { logger } = require("../../config/logger");

/**
 * @param {string} name
 * @param {object} input
 * @param {{
 *   threadId?: string,
 *   senderId?: string,
 *   isGroup?: boolean,
 *   threadType?: string,
 *   message?: object,
 *   botOwnId?: string,
 *   groupsRegistry?: object,
 *   usersRegistry?: object,
 * }} ctx
 */
async function invokeTool(name, input, ctx = {}) {
  const tool = getTool(name);
  if (!tool) {
    return { ok: false, reason: "tool_not_registered", tool: name };
  }
  if (!isToolEnabled(name)) {
    logger.info("[ToolExecutor] denied (disabled)", name);
    return { ok: false, reason: "tool_disabled", tool: name };
  }

  const perm = isToolAllowedForContext(name, ctx);
  if (!perm.allowed) {
    logger.info("[ToolExecutor] denied (permission)", {
      tool: name,
      reason: perm.reason,
      threadId: ctx.threadId,
    });
    return { ok: false, reason: perm.reason || "permission_denied", tool: name };
  }

  try {
    const result = await tool.execute(input || {}, ctx);
    return { ok: true, tool: name, result };
  } catch (e) {
    logger.error("[ToolExecutor] error", name, e.message);
    return { ok: false, reason: "tool_error", error: e.message, tool: name };
  }
}

module.exports = { invokeTool };
