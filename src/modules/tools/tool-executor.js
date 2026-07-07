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
  logger.info("[ACTION_EXECUTOR_TOOL_INVOKE]", {
    toolName: name,
    threadId: ctx.threadId,
    groupId: ctx.groupId,
    senderId: ctx.senderId,
  });
  const tool = getTool(name);
  if (!tool) {
    const out = { ok: false, reason: "tool_not_registered", tool: name };
    logger.info("[TOOL_EXECUTOR_RESULT]", {
      toolName: name,
      ok: out.ok,
      error: out.reason,
    });
    return out;
  }
  if (!isToolEnabled(name)) {
    logger.info("[ToolExecutor] denied (disabled)", name);
    const out = { ok: false, reason: "tool_disabled", tool: name };
    logger.info("[TOOL_EXECUTOR_RESULT]", {
      toolName: name,
      ok: out.ok,
      error: out.reason,
    });
    return out;
  }

  const perm = await isToolAllowedForContext(name, ctx);
  if (!perm.allowed) {
    logger.info("[ToolExecutor] denied (permission)", {
      tool: name,
      reason: perm.reason,
      threadId: ctx.threadId,
    });
    const out = { ok: false, reason: perm.reason || "permission_denied", tool: name };
    logger.info("[TOOL_EXECUTOR_RESULT]", {
      toolName: name,
      ok: out.ok,
      error: out.reason,
    });
    return out;
  }

  try {
    const result = await tool.execute(input || {}, ctx);
    const normalized = result && typeof result === "object"
      ? { tool: name, ...result }
      : { ok: true, tool: name, data: result };
    logger.info("[TOOL_EXECUTOR_RESULT]", {
      toolName: name,
      ok: normalized.ok !== false,
      error: normalized.error || normalized.reason || null,
      rowCount: Array.isArray(normalized.rows) ? normalized.rows.length : undefined,
      columns: Array.isArray(normalized.fields) ? normalized.fields : undefined,
    });
    return normalized;
  } catch (e) {
    logger.error("[ToolExecutor] error", name, e.message);
    const out = { ok: false, reason: "tool_error", error: e.message, tool: name };
    logger.info("[TOOL_EXECUTOR_RESULT]", {
      toolName: name,
      ok: out.ok,
      error: out.reason,
    });
    return out;
  }
}

module.exports = { invokeTool };
