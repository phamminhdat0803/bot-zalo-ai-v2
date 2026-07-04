const fs = require("fs/promises");
const path = require("path");
const { logger } = require("../../config/logger");
const { env } = require("../../config/env");

const PROMPTS_ROOT = path.resolve(process.cwd(), "data", "prompts");

/** @type {Map<string, { content: string, mtimeMs: number }>} */
const fileCache = new Map();

function clearPromptCache() {
  fileCache.clear();
}

function resolveSafePath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;
  const normalized = relativePath.replace(/\\/g, "/").trim();
  if (normalized.includes("..")) {
    logger.warn("[PromptLoader] blocked path traversal", relativePath);
    return null;
  }
  if (path.isAbsolute(normalized) || /^[a-zA-Z]:\//.test(normalized)) {
    logger.warn("[PromptLoader] blocked absolute path", relativePath);
    return null;
  }
  const full = path.resolve(PROMPTS_ROOT, normalized);
  const rel = path.relative(PROMPTS_ROOT, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    logger.warn("[PromptLoader] path outside prompts root", relativePath);
    return null;
  }
  return full;
}

async function loadPromptFile(relativePath) {
  const full = resolveSafePath(relativePath);
  if (!full) return "";

  try {
    const stat = await fs.stat(full);
    if (!stat.isFile()) return "";

    const cacheKey = full;
    if (env.PROMPT_CACHE_ENABLED) {
      const cached = fileCache.get(cacheKey);
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.content;
      }
    }

    const content = await fs.readFile(full, "utf8");
    const trimmed = content.trim();
    if (env.PROMPT_CACHE_ENABLED) {
      fileCache.set(cacheKey, { content: trimmed, mtimeMs: stat.mtimeMs });
    }
    return trimmed;
  } catch (e) {
    if (e.code === "ENOENT") {
      logger.warn("[PromptLoader] file not found", relativePath);
    } else {
      logger.warn("[PromptLoader] read failed", relativePath, e.message);
    }
    return "";
  }
}

async function loadJsonRegistry(relativeJsonPath, label) {
  const raw = await loadPromptFile(relativeJsonPath);
  if (!raw) {
    if (relativeJsonPath === "users.json") {
      logger.debug?.("[PromptLoader] users.json missing or empty — no user prompts");
    }
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (e) {
    logger.warn(`[PromptLoader] ${label} invalid JSON`, e.message);
    return {};
  }
}

async function loadPromptRegistry() {
  return loadJsonRegistry("groups.json", "groups.json");
}

async function loadUserPromptRegistry() {
  return loadJsonRegistry("users.json", "users.json");
}

module.exports = {
  loadPromptFile,
  loadPromptRegistry,
  loadUserPromptRegistry,
  clearPromptCache,
  PROMPTS_ROOT,
};