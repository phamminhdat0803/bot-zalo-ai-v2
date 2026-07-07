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
 *
 * Cold-start behaviour:
 *   - Registry cache (groupsCache / usersCache) is loaded lazily inside
 *     isToolAllowedForContext() / listAllowedToolsForContext() so that
 *     the FIRST request after process start resolves against real data,
 *     not an empty fallback. Sync wrappers (`*Sync`) keep backward
 *     compatibility for callers that cannot await.
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

/**
 * Resolve registry for a context. Honours caller-provided ctx.groupsRegistry /
 * ctx.usersRegistry (used in tests / dynamic context). Otherwise loads from
 * disk via getRegistries() — guaranteeing the FIRST request after boot sees
 * real data, never an empty fallback.
 */
async function resolveRegistriesForContext(ctx = {}) {
  if (ctx.groupsRegistry || ctx.usersRegistry) {
    return {
      groups: ctx.groupsRegistry || {},
      users: ctx.usersRegistry || {},
    };
  }
  return await getRegistries({ forceReload: false });
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

function _applyPermissionLogic(toolName, ctx, groups, users) {
  if (!toolName) {
    return { allowed: false, reason: "missing_tool_name" };
  }

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
 * Resolve whether a tool is allowed in the given context. Async; lazy-loads
 * registry cache if caller did not provide one.
 *
 * @param {string} toolName
 * @param {{ threadId?: string, senderId?: string, isGroup?: boolean,
 *           groupsRegistry?: object, usersRegistry?: object }} ctx
 * @returns {{ allowed: boolean, reason?: string, source?: string }}
 */
async function isToolAllowedForContext(toolName, ctx = {}) {
  if (isAdmin(ctx.senderId)) {
    return { allowed: true, source: "admin" };
  }
  let groups;
  let users;
  try {
    const reg = await resolveRegistriesForContext(ctx);
    groups = reg.groups;
    users = reg.users;
  } catch (e) {
    logger.warn("[ToolPermission] registry load failed", e.message);
    return { allowed: false, reason: "registry_load_failed", source: "error" };
  }
  return _applyPermissionLogic(toolName, ctx, groups, users);
}

/**
 * Sync variant. Kept for backward compatibility. WARNING: when the in-process
 * cache is empty (cold-start), this falls back to default legacy tools —
 * exactly the bug we are fixing. Prefer the async variant in async contexts.
 */
function isToolAllowedForContextSync(toolName, ctx = {}) {
  if (isAdmin(ctx.senderId)) {
    return { allowed: true, source: "admin" };
  }
  const groups = ctx.groupsRegistry || groupsCache || {};
  const users = ctx.usersRegistry || usersCache || {};
  return _applyPermissionLogic(toolName, ctx, groups, users);
}

/**
 * List tool names allowed for a context. Async; awaits per-tool permission.
 * @param {{ threadId?: string, senderId?: string, isGroup?: boolean,
 *           groupsRegistry?: object, usersRegistry?: object }} ctx
 * @returns {Promise<string[]>}
 */
async function listAllowedToolsForContext(ctx = {}) {
  const all = [
    "noop",
    "send_message",
    "react_message",
    "mysql_readonly_query",
  ];
  if (isAdmin(ctx.senderId)) {
    return [...all];
  }
  let groups;
  let users;
  try {
    const reg = await resolveRegistriesForContext(ctx);
    groups = reg.groups;
    users = reg.users;
  } catch (e) {
    logger.warn("[ToolPermission] registry load failed", e.message);
    return ["noop", "send_message", "react_message"];
  }
  const out = [];
  for (const name of all) {
    const r = _applyPermissionLogic(name, ctx, groups, users);
    if (r.allowed) out.push(name);
  }
  return out;
}

/**
 * Sync variant. Backward compatible; subject to cold-start fallback.
 */
function listAllowedToolsForContextSync(ctx = {}) {
  const all = [
    "noop",
    "send_message",
    "react_message",
    "mysql_readonly_query",
  ];
  return all
    .map((n) => [n, isToolAllowedForContextSync(n, ctx)])
    .filter(([, r]) => r.allowed)
    .map(([n]) => n);
}

function clearPermissionCache() {
  groupsCache = null;
  usersCache = null;
  cacheStamp = 0;
}

module.exports = {
  isToolAllowedForContext,
  isToolAllowedForContextSync,
  listAllowedToolsForContext,
  listAllowedToolsForContextSync,
  getRegistries,
  resolveRegistriesForContext,
  clearPermissionCache,
  _isAdmin: isAdmin,
};
