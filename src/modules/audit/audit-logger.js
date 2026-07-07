/**
 * Audit logger — JSONL append-only log for sensitive operations
 * (MySQL readonly tool calls today, more tools tomorrow).
 *
 * Hard rules:
 *   - Never log passwords / connection secrets.
 *   - Never block caller on disk I/O errors; log fallback.
 */

const fs = require("fs/promises");
const path = require("path");
const { logger } = require("../../config/logger");

const DEFAULT_DIR = path.resolve(process.cwd(), "data", "audit");

function safeDir(dir) {
  if (!dir || typeof dir !== "string") return DEFAULT_DIR;
  if (dir.includes("..")) return DEFAULT_DIR;
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    logger.warn("[Audit] mkdir failed", dir, e.message);
  }
}

function redact(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (
      lk.includes("password") ||
      lk.includes("pass") ||
      lk.includes("secret") ||
      lk.includes("token") ||
      lk.includes("apikey")
    ) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Append one audit entry (JSONL).
 *
 * @param {object} entry
 * @returns {Promise<{ ok: boolean, line?: string, path?: string, error?: string }>}
 */
async function audit(entry) {
  if (!entry || typeof entry !== "object") {
    return { ok: false, error: "invalid_entry" };
  }
  const dir = safeDir(entry.auditDir || DEFAULT_DIR);
  await ensureDir(dir);

  const ts = entry.timestamp || new Date().toISOString();
  const line = JSON.stringify({ timestamp: ts, ...redact(entry) });
  const file = path.join(dir, `audit-${ts.slice(0, 10)}.jsonl`);

  try {
    await fs.appendFile(file, line + "\n", "utf8");
    return { ok: true, line, path: file };
  } catch (e) {
    logger.warn("[Audit] append failed", e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { audit, redact };
