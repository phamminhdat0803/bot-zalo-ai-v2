/**
 * Tool Registry — internal catalog of backend tools the AI may invoke.
 *
 * Phase 2: registry + permission wiring. Does NOT switch the runtime to
 * OpenAI function calling yet. action-executor.js still runs JSON actions.
 *
 * Each tool contract:
 *   {
 *     name: string,                 // unique key, e.g. "send_message"
 *     description: string,
 *     inputSchema: object,          // lightweight JSON Schema-ish shape
 *     requiredPermission: string,   // e.g. "zalo.send_message"
 *     enabled: boolean,             // can be flipped at runtime via env
 *     envToggle?: string,           // env key that, when "false", disables tool
 *     execute: async (input, ctx) => any
 *   }
 *
 * Tool is registered ONCE at module load and re-used per request.
 */

const { logger } = require("../../config/logger");

/** @type {Map<string, object>} */
const registry = new Map();

function registerTool(tool) {
  if (!tool || typeof tool !== "object") {
    throw new Error("[ToolRegistry] invalid tool");
  }
  if (!tool.name || typeof tool.name !== "string") {
    throw new Error("[ToolRegistry] tool.name required");
  }
  if (typeof tool.execute !== "function") {
    throw new Error(`[ToolRegistry] tool.execute must be function (${tool.name})`);
  }
  registry.set(tool.name, {
    name: tool.name,
    description: tool.description || "",
    inputSchema: tool.inputSchema || { type: "object" },
    requiredPermission: tool.requiredPermission || tool.name,
    enabled: tool.enabled !== false,
    envToggle: tool.envToggle || null,
    execute: tool.execute,
    meta: tool.meta || {},
  });
  return registry.get(tool.name);
}

function getTool(name) {
  return registry.get(name) || null;
}

function listTools() {
  return [...registry.values()].map((t) => ({
    name: t.name,
    description: t.description,
    requiredPermission: t.requiredPermission,
    enabled: t.enabled,
    envToggle: t.envToggle,
  }));
}

function isToolEnabled(name, env = process.env) {
  const tool = registry.get(name);
  if (!tool) return false;
  if (!tool.enabled) return false;
  if (tool.envToggle && env[tool.envToggle] === "false") return false;
  return true;
}

function readBoolToggle(envToggle) {
  if (!envToggle) return true;
  const v = process.env[envToggle];
  if (v == null) return true;
  return v !== "false";
}

function clearRegistry() {
  registry.clear();
}

function getRawRegistry() {
  return registry;
}

module.exports = {
  registerTool,
  getTool,
  listTools,
  isToolEnabled,
  clearRegistry,
  getRawRegistry,
};

// Built-in tools self-register on require. Side-effect import safe in main flow.
// Lazy-register via boot() to keep order explicit.
function boot() {
  // avoid require loops: load lazily inside boot
  // eslint-disable-next-line global-require
  require("./built-in/zalo-actions.tool");
  // eslint-disable-next-line global-require
  require("./built-in/mysql-readonly.tool");
  logger.info("[ToolRegistry] booted", { toolCount: registry.size });
}

module.exports.boot = boot;
