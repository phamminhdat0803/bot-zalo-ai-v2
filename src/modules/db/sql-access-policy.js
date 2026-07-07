/**
 * SQL Access Policy — fail-closed database / table allowlist for the MySQL
 * readonly tool.
 *
 * Source of truth resolution order:
 *   1. ctx.groupConfig.mysql            (preferred; passed by caller)
 *   2. groups.json[threadId].mysql      (fallback)
 *   3. absence of clear config          → reject (no fail-open)
 *
 * Policy shape:
 *   {
 *     enabled: true,
 *     allowedDatabases: ["crm"],
 *     allowedTables: ["customers", "orders"] | ["*"],
 *     maxRows: 100
 *   }
 *
 * Hard guarantees:
 *   - allowedDatabases empty / undefined → reject all
 *   - allowedTables empty / undefined    → reject all tables
 *   - allowedTables: ["*"]                → table check skipped, db still checked
 *   - If table extraction fails            → reject (never guess)
 *   - Case-insensitive match for identifiers, but canonical lower-case compare.
 */

const { logger } = require("../../config/logger");

function normalizeIdentifier(name) {
  if (typeof name !== "string") return "";
  // strip MySQL backticks and whitespace
  return name.replace(/`/g, "").trim().toLowerCase();
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeIdentifier).filter(Boolean);
}

/**
 * Strip line + block comments and collapse whitespace.
 */
function stripComments(sql) {
  if (typeof sql !== "string") return "";
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, " ")
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve policy from caller context.
 * Priority:
 *   1. ctx.groupConfig.mysql
 *   2. groups.json[threadId].mysql
 *   3. null (caller must reject)
 *
 * @param {object} [ctx]
 * @returns {{ source: string|null, policy: object|null }}
 */
function resolvePolicy(ctx = {}) {
  const fromCtx = ctx?.groupConfig?.mysql;
  if (fromCtx && typeof fromCtx === "object") {
    return { source: "ctx.groupConfig.mysql", policy: fromCtx };
  }
  const threadId = ctx?.threadId ? String(ctx.threadId) : null;
  if (threadId) {
    const groupEntry = ctx?.groupsRegistry?.[threadId];
    const fromGroup = groupEntry?.mysql;
    if (fromGroup && typeof fromGroup === "object") {
      return { source: "groups.json.mysql", policy: fromGroup };
    }
  }
  return { source: null, policy: null };
}

/**
 * Validate policy shape. Returns sanitized policy or null.
 */
function sanitizePolicy(raw) {
  if (!raw || typeof raw !== "object") return null;
  const enabled = raw.enabled !== false; // default true when object present
  const allowedDatabases = normalizeList(raw.allowedDatabases);
  const allowedTablesRaw = Array.isArray(raw.allowedTables) ? raw.allowedTables : [];
  const allowedTables = normalizeList(allowedTablesRaw);
  const allowAllTables = allowedTables.length === 1 && allowedTables[0] === "*";
  const maxRows = Number.isFinite(raw.maxRows) && raw.maxRows > 0
    ? Math.floor(raw.maxRows)
    : null;
  return {
    enabled,
    allowedDatabases,
    allowedTables,
    allowAllTables,
    maxRows,
  };
}

/**
 * Extract tables referenced by safe SQL patterns.
 *
 * Supported top-level statements:
 *   - SELECT ... FROM <tbl> [JOIN <tbl> ...]
 *   - SELECT ... FROM <db>.<tbl>
 *   - EXPLAIN <anything that follows>
 *   - DESCRIBE <tbl> / DESC <tbl>
 *   - SHOW [FULL] COLUMNS FROM <tbl>
 *   - SHOW [FULL] INDEX FROM <tbl>
 *   - SHOW [FULL] KEYS  FROM <tbl>
 *   - SHOW TABLES [{FROM | IN} <db>]
 *
 * Anything else → { ok: false, error: "mysql_table_parse_failed" }
 *
 * @param {string} sql
 * @returns {{
 *   ok: true,
 *   tables: Array<{ database: string|null, table: string }>,
 *   statement: string,
 * } | { ok: false, error: string }}
 */
function extractTables(sql) {
  const stripped = stripComments(sql);
  if (!stripped) return { ok: false, error: "mysql_table_parse_failed" };

  // Reject obvious multi-statement first (defence in depth; sql-validator already
  // rejects, but policy layer should be independently safe).
  if (/;\s*\S/.test(stripped.replace(/;\s*$/, ""))) {
    return { ok: false, error: "mysql_table_parse_failed" };
  }

  const upper = stripped.toUpperCase();
  const tokens = upper.split(/\s+/);
  const first = tokens[0] || "";

  const tables = [];

  function pushRef(rawTbl, rawDb) {
    const tbl = normalizeIdentifier(rawTbl);
    if (!tbl) return;
    const db = rawDb ? normalizeIdentifier(rawDb) : null;
    // skip alias-only tokens (a single alpha used as alias); caller already
    // stripped FROM/JOIN so this is unlikely, but defence in depth.
    if (!/^[a-z_][a-z0-9_]*$/.test(tbl)) return;
    tables.push({ database: db, table: tbl });
  }

  // Helper: walk body, collect FROM/JOIN targets.
  function scanFromJoin(body) {
    // Patterns (case-insensitive): FROM [db.]tbl  |  JOIN [db.]tbl
    // Stop on WHERE / GROUP / ORDER / HAVING / LIMIT / OFFSET / UNION / INTO
    const re = /\b(?:FROM|JOIN)\s+(`?)([a-z_][a-z0-9_]*)(?:\.(`?)([a-z_][a-z0-9_]*))?\1/gi;
    let m;
    while ((m = re.exec(body)) !== null) {
      // Skip INTO immediately following (e.g. INTO ... ) — not used in read-only.
      const prev = body.slice(Math.max(0, m.index - 5), m.index).toUpperCase();
      if (/\bINTO$/.test(prev)) continue;
      if (m[4]) {
        pushRef(m[4], m[2]);
      } else {
        pushRef(m[2], null);
      }
    }
  }

  if (first === "SELECT") {
    scanFromJoin(stripped);
    if (tables.length === 0) return { ok: false, error: "mysql_table_parse_failed" };
    return { ok: true, tables, statement: "SELECT" };
  }

  if (first === "EXPLAIN") {
    // Accept any readable EXPLAIN target as long as it is a SELECT-shape; we
    // recurse by stripping EXPLAIN keyword and re-running.
    const inner = stripped.replace(/^EXPLAIN\s+/i, "");
    const innerUpper = inner.toUpperCase().trim();
    if (!innerUpper) return { ok: false, error: "mysql_table_parse_failed" };
    const innerFirst = innerUpper.split(/\s+/)[0];
    if (innerFirst !== "SELECT") {
      return { ok: false, error: "mysql_table_parse_failed" };
    }
    scanFromJoin(inner);
    if (tables.length === 0) return { ok: false, error: "mysql_table_parse_failed" };
    return { ok: true, tables, statement: "EXPLAIN" };
  }

  if (first === "DESCRIBE" || first === "DESC") {
    // DESCRIBE [db.]tbl | DESC tbl
    const m = stripped.match(/^(?:DESCRIBE|DESC)\s+(`?)([a-z_][a-z0-9_]*)(?:\.(`?)([a-z_][a-z0-9_]*))?\1/i);
    if (!m) return { ok: false, error: "mysql_table_parse_failed" };
    if (m[4]) pushRef(m[4], m[2]);
    else pushRef(m[2], null);
    return { ok: true, tables, statement: first };
  }

  if (first === "SHOW") {
    const rest = stripped.slice(5).trim();
    const ru = rest.toUpperCase();
    if (/^(?:FULL\s+)?(?:COLUMNS|INDEX|KEYS|INDEXES)\s+FROM\s+/i.test(rest)) {
      const m = rest.match(/(?:FROM|IN)\s+(`?)([a-z_][a-z0-9_]*)(?:\.(`?)([a-z_][a-z0-9_]*))?\1/i);
      if (!m) return { ok: false, error: "mysql_table_parse_failed" };
      if (m[4]) pushRef(m[4], m[2]);
      else pushRef(m[2], null);
      return { ok: true, tables, statement: "SHOW" };
    }
    if (/^(?:FULL\s+)?TABLES(?:\s+(?:FROM|IN)\s+([a-z_][a-z0-9_]*))?$/i.test(rest)) {
      const m = rest.match(/(?:FROM|IN)\s+([a-z_][a-z0-9_]*)/i);
      if (m) {
        pushRef(m[1], null); // table name not relevant, db only
      }
      // SHOW TABLES without explicit db is ambiguous → reject
      if (!m) return { ok: false, error: "mysql_table_parse_failed" };
      return { ok: true, tables, statement: "SHOW" };
    }
    if (/^(?:DATABASES|SCHEMAS)$/i.test(rest)) {
      // SHOW DATABASES is a schema introspection; not handled by db allowlist.
      return { ok: false, error: "mysql_table_parse_failed" };
    }
    return { ok: false, error: "mysql_table_parse_failed" };
  }

  // Anything else (USE, SET, ...) → refuse to extract, fail closed.
  return { ok: false, error: "mysql_table_parse_failed" };
}

/**
 * Check policy against extracted tables.
 *
 * @param {object} policy     sanitized policy from sanitizePolicy()
 * @param {Array}  tables     from extractTables()
 * @returns {{ ok: true, normalizedTables: Array } | { ok: false, error: string, details?: object }}
 */
function checkPolicy(policy, tables) {
  if (!policy) {
    return { ok: false, error: "mysql_policy_missing" };
  }
  if (!policy.enabled) {
    return { ok: false, error: "mysql_policy_disabled" };
  }
  if (!Array.isArray(policy.allowedDatabases) || policy.allowedDatabases.length === 0) {
    return { ok: false, error: "mysql_database_not_allowed", details: { reason: "empty_allowed_databases" } };
  }

  for (const t of tables) {
    // Database resolution: explicit reference OR fallback to policy default
    // (single-db policy may omit db prefix in SQL).
    const refDb = t.database || null;
    let dbOk = false;
    if (refDb) {
      dbOk = policy.allowedDatabases.includes(refDb);
    } else {
      // No explicit db in SQL. Only allow if exactly ONE db is whitelisted
      // (unambiguous default). Multi-db allowlist with bare table ref would
      // be ambiguous → reject fail-closed.
      if (policy.allowedDatabases.length === 1) {
        dbOk = true;
      } else {
        return {
          ok: false,
          error: "mysql_database_not_allowed",
          details: { table: t.table, reason: "ambiguous_database" },
        };
      }
    }
    if (!dbOk) {
      return {
        ok: false,
        error: "mysql_database_not_allowed",
        details: { table: t.table, database: t.database || null },
      };
    }

    if (!policy.allowAllTables) {
      if (!Array.isArray(policy.allowedTables) || policy.allowedTables.length === 0) {
        return {
          ok: false,
          error: "mysql_table_not_allowed",
          details: { table: t.table, reason: "empty_allowed_tables" },
        };
      }
      if (!policy.allowedTables.includes(t.table)) {
        return {
          ok: false,
          error: "mysql_table_not_allowed",
          details: { table: t.table },
        };
      }
    }
  }

  return { ok: true, normalizedTables: tables };
}

/**
 * Top-level helper: resolve policy + check SQL in one call.
 *
 * @param {string} sql
 * @param {object} ctx
 * @returns {{ ok: true, policy: object, tables: Array, source: string }
 *         | { ok: false, error: string, details?: object, source?: string }}
 */
function enforceAccessPolicy(sql, ctx = {}) {
  const { source, policy: raw } = resolvePolicy(ctx);
  if (!raw) {
    logger.info("[SqlAccessPolicy] rejected: no policy", {
      threadId: ctx?.threadId || null,
    });
    return { ok: false, error: "mysql_policy_missing", source: null };
  }
  const policy = sanitizePolicy(raw);
  if (!policy) {
    return { ok: false, error: "mysql_policy_invalid" };
  }

  const extracted = extractTables(sql);
  if (!extracted.ok) {
    return { ok: false, error: extracted.error, source };
  }

  const verdict = checkPolicy(policy, extracted.tables);
  if (!verdict.ok) {
    return { ok: false, error: verdict.error, details: verdict.details, source };
  }

  return {
    ok: true,
    policy,
    tables: extracted.tables,
    statement: extracted.statement,
    source,
  };
}

module.exports = {
  resolvePolicy,
  sanitizePolicy,
  extractTables,
  checkPolicy,
  enforceAccessPolicy,
  stripComments,
};