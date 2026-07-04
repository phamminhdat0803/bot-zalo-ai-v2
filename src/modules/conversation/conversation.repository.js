const fs = require("fs/promises");
const path = require("path");
const { logger } = require("../../config/logger");

let storageDir = "./data/conversations";
let storeRaw = false;

function configure(opts = {}) {
  if (opts.storageDir) storageDir = opts.storageDir;
  if (typeof opts.storeRaw === "boolean") storeRaw = opts.storeRaw;
}

function getStorageFilePath(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return path.join(storageDir, `messages-${y}-${m}-${d}.jsonl`);
}

async function ensureStorageDir() {
  try {
    await fs.mkdir(storageDir, { recursive: true });
    return { ok: true };
  } catch (e) {
    logger.error("[ConversationRepo] ensure dir failed", e.message);
    return { ok: false, error: e.message };
  }
}

async function appendMessage(message) {
  try {
    await ensureStorageDir();
    const filePath = getStorageFilePath(new Date(message.createdAt || Date.now()));
    const line = JSON.stringify(message) + "\n";
    await fs.appendFile(filePath, line, "utf8");
    return { ok: true };
  } catch (e) {
    logger.error("[ConversationRepo] append failed", e.message);
    return { ok: false, error: e.message };
  }
}

async function getRecentMessages(threadId, limit = 30) {
  const results = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const files = [getStorageFilePath(today), getStorageFilePath(yesterday)];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        if (results.length >= limit) break;
        try {
          const obj = JSON.parse(lines[i]);
          if (obj.threadId === threadId) results.push(obj);
        } catch (parseErr) {
          logger.warn("[ConversationRepo] skip bad json line", filePath, i);
        }
      }
    } catch (e) {
      // file not exist ok
    }
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

module.exports = {
  configure,
  ensureStorageDir,
  appendMessage,
  getRecentMessages,
  getStorageFilePath,
};
