const fs = require("fs/promises");
const path = require("path");
const { logger } = require("../../config/logger");

async function cleanupOldConversationFiles(daysToKeep = 30, storageDir = "./data/conversations") {
  try {
    const files = await fs.readdir(storageDir);
    const cutoff = Date.now() - daysToKeep * 86400000;
    let deleted = 0;

    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      const match = f.match(/messages-(\d{4})-(\d{2})-(\d{2})\.jsonl$/);
      if (!match) continue;

      const fileDate = new Date(`${match[1]}-${match[2]}-${match[3]}`).getTime();
      if (fileDate < cutoff) {
        await fs.unlink(path.join(storageDir, f));
        deleted++;
      }
    }
    if (deleted > 0) logger.info("[ConversationRetention] deleted old files", deleted);
    return { ok: true, deleted };
  } catch (e) {
    logger.warn("[ConversationRetention] cleanup error", e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { cleanupOldConversationFiles };
