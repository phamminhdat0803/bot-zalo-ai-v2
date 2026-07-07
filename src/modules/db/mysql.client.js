/**
 * mysql.client — lazy wrapper around mysql2/promise pool.
 *
 * Disabled by default. Requires `mysql2` to be installed.
 * Connection details live in env (never logged).
 *
 * Use:
 *   const client = require("./mysql.client");
 *   await client.withClient(async (conn) => conn.query(...))
 */

const { env } = require("../../config/env");
const { logger } = require("../../config/logger");

let pool = null;
let mysql = null;
let loadTried = false;

function loadDriver() {
  if (loadTried) return mysql;
  loadTried = true;
  try {
    // Lazy require so missing package does not crash the bot.
    // eslint-disable-next-line global-require
    mysql = require("mysql2/promise");
  } catch (e) {
    logger.warn("[MysqlClient] mysql2 not installed — MySQL tool disabled");
    mysql = null;
  }
  return mysql;
}

function isConfigured() {
  if (!env.MYSQL_TOOL_ENABLED) return false;
  if (!env.MYSQL_HOST || !env.MYSQL_USER) return false;
  const driver = loadDriver();
  if (!driver) return false;
  return true;
}

function getPool() {
  if (!isConfigured()) return null;
  const driver = loadDriver();
  if (!driver) return null;
  if (pool) return pool;
  try {
    pool = driver.createPool({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE || undefined,
      waitForConnections: true,
      connectionLimit: 4,
      queueLimit: 0,
      connectTimeout: Math.min(env.MYSQL_QUERY_TIMEOUT_MS, 5000),
      enableKeepAlive: true,
    });
    return pool;
  } catch (e) {
    logger.warn("[MysqlClient] createPool failed", e.message);
    return null;
  }
}

/**
 * Run `fn(conn)` under connection + timeout. Always returns.
 * @template T
 * @param {(conn: any) => Promise<T>} fn
 * @returns {Promise<{ ok: boolean, data?: T, error?: string }>}
 */
async function withClient(fn) {
  const p = getPool();
  if (!p) return { ok: false, error: "mysql_not_configured" };
  let conn;
  try {
    conn = await p.getConnection();
  } catch (e) {
    return { ok: false, error: "connect_failed" };
  }
  try {
    const data = await fn(conn);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.code || "query_failed" };
  } finally {
    try {
      conn.release();
    } catch (_e) {
      /* ignore */
    }
  }
}

async function endPool() {
  if (pool) {
    try {
      await pool.end();
    } catch (_e) {
      /* ignore */
    }
    pool = null;
  }
}

module.exports = {
  withClient,
  endPool,
  isConfigured,
  getPool,
};
