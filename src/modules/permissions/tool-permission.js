/**
 * Tool Permission — group/user-aware policy for tool invocation.
 *
 * Source of truth:
 *   - data/prompts/groups.json (allowedTools + tool-specific blocks)
 *   - data/prompts/users.json (per-user override)
 *   - env.PROMPT_ADMIN_ENABLED + ZALO_ADMIN_USER_IDS (admin bypass)
 *
 * Defaults:
 *   - If group missing allowedTools → only legacy actions allowed.
 *   - Risky tools (mysql_readonly_query) → must be explicitly listed.
 */

const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const {
  loadPromptRegistry,
  loadUserPromptRegistry,
} = require("../ai/prompt-loader");

const DEFAULT_LEGACY_TOOLS = new Set(["noop", "send_message", "react_message"]);

let groupsCache = null;
let usersCache = null;
let cacheStamp = 0;

const REGISTRY_TTL_MS = 30_000;

async function getRegistries({ forceReload = false } = {}) {
  const now = Date.now();
  if (
    !forceReload &&
    groupsCache &&
    usersCache &&
    now - cacheStamp < REGISTRY_TTL_MS
  ) {
    return { groups: groupsCache, users: usersCache };
  }
  const [g, u] = await Promise.all([
    loadPromptRegistry(),
    loadUserPromptRegistry(),
  ]);
  groupsCache = g;
  usersCache = u;
  cacheStamp = now;
  return { groups: g, users: u };
}

function isAdmin(senderId) {
  if (!env.PROMPT_ADMIN_ENABLED) return false;
  if (!senderId) return false;
  return env.ZALO_ADMIN_USER_IDS.includes(String(senderId));
}

function getGroupEntry(groupsRegistry, ctx) {
  if (!ctx?.isGroup) return null;
  const key = ctx?.threadId ? String(ctx.threadId) : "";
  if (!key) return null;
  return groupsRegistry[key] || null;
}

function getUserEntry(usersRegistry, ctx) {
  if (!ctx?.senderId) return null;
  return usersRegistry[String(ctx.senderId)] || null;
}

function getGroupAllowedTools(groupEntry) {
  if (!groupEntry) return null;
  if (!Array.isArray(groupEntry.allowedTools)) return null;
  return new Set(groupEntry.allowedTools);
}

function getUserAllowedTools(userEntry) {
  if (!userEntry) return null;
  if (!Array.isArray(userEntry.allowedTools)) return null;
  return new Set(userEntry.allowedTools);
}

/**
 * Resolve whether a tool is allowed in the given context.
 *
 * @param {string} toolName
 * @param {{ threadId?: string, senderId?: string, isGroup?: boolean }} ctx
 * @returns {{ allowed: boolean, reason?: string, source?: string }}
 */
function isToolAllowedForContext(toolName, ctx = {}) {
  if (!toolName) {
    return { allowed: false, reason: "missing_tool_name" };
  }
  if (isAdmin(ctx.senderId)) {
    return { allowed: true, source: "admin" };
  }

  // Prefer per-call registry if provided (test isolation, dynamic context)
  const groups = ctx.groupsRegistry || groupsCache || {};
  const users = ctx.usersRegistry || usersCache || {};

  const userEntry = getUserEntry(users, ctx);
  const userAllowed = getUserAllowedTools(userEntry);
  if (userAllowed) {
    if (!userAllowed.has(toolName)) {
      return { allowed: false, reason: "user_denied", source: "users.json" };
    }
  }

  const groupEntry = getGroupEntry(groups, ctx);
  if (!groupEntry) {
    const allowed = DEFAULT_LEGACY_TOOLS.has(toolName);
    return allowed
      ? { allowed: true, source: "default_legacy" }
      : { allowed: false, reason: "no_group_registry_entry", source: "default" };
  }

  const groupAllowed = getGroupAllowedTools(groupEntry);
  if (!groupAllowed) {
    const allowed = DEFAULT_LEGACY_TOOLS.has(toolName);
    return allowed
      ? { allowed: true, source: "default_legacy" }
      : { allowed: false, reason: "no_group_allowed_tools", source: "default" };
  }

  if (!groupAllowed.has(toolName)) {
    logger.info("[ToolPermission] denied (group)", {
      tool: toolName,
      threadId: ctx.threadId,
    });
    return { allowed: false, reason: "group_denied", source: "groups.json" };
  }

  return { allowed: true, source: userAllowed ? "user+group" : "groups.json" };
}

/**
 * List tool names that are allowed for a context. Used by prompt builder.
 * @param {{ threadId?: string, senderId?: string, isGroup?: boolean }} ctx
 * @returns {string[]}
 */
function listAllowedToolsForContext(ctx = {}) {
  const all = [
    "noop",
    "send_message",
    "react_message",
    "mysql_readonly_query",
  ];
  return all.filter((n) => isToolAllowedForContext(n, ctx).allowed);
}

function clearPermissionCache() {
  groupsCache = null;
  usersCache = null;
  cacheStamp = 0;
}

module.exports = {
  isToolAllowedForContext,
  listAllowedToolsForContext,
  getRegistries,
  clearPermissionCache,
  _isAdmin: isAdmin,
};
