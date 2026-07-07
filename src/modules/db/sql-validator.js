/**
 * SQL Validator — whitelist-only readonly SQL gate.
 *
 * Allowed FIRST keywords:
 *   SELECT, SHOW, DESCRIBE, DESC, EXPLAIN
 *
 * Rejected (multi-statement + DDL/DML keywords):
 *   INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE,
 *   GRANT, REVOKE, REPLACE, RENAME, LOCK, UNLOCK, CALL, LOAD,
 *   SET, USE, BEGIN, COMMIT, ROLLBACK
 *
 * Behavior:
 *   - Reject multi-statement payloads (no `;` followed by another statement).
 *   - Auto-append LIMIT if missing and the top-level is SELECT.
 *   - Clamp LIMIT to maxRows.
 *   - Strip line comments (`-- ...`) and block comments (`/* ... *\/`).
 *   - Heuristic: if the FIRST non-comment token is not in allowlist → reject.
 *
 * This validator is intentionally simple; it is meant as a second line
 * behind MySQL user-level readonly grants. Do NOT rely on it solely.
 */

const ALLOWED_KEYWORDS = new Set([
  "SELECT",
  "SHOW",
  "DESCRIBE",
  "DESC",
  "EXPLAIN",
]);

const FORBIDDEN_KEYWORDS = new Set([
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "REPLACE",
  "RENAME",
  "LOCK",
  "UNLOCK",
  "CALL",
  "LOAD",
  "SET",
  "USE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "HANDLER",
  "KILL",
  "SHUTDOWN",
  "FLUSH",
  "RESET",
  "OPTIMIZE",
  "REPAIR",
  "ANALYZE",
  "CHECKSUM",
  "BACKUP",
  "RESTORE",
  "BINLOG",
  "PURGE",
]);

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, " ")
    .replace(/--.*$/gm, " ");
}

function hasMultipleStatements(sql) {
  // crude but conservative: a `;` followed by another keyword/quote
  const s = sql.replace(/;\s*$/, "");
  return /;\s*['"`\w(]/.test(s);
}

function firstToken(sql) {
  const stripped = stripComments(sql).trim();
  if (!stripped) return null;
  const m = stripped.match(/^[\s(]*([A-Za-z_]+)/);
  return m ? m[1].toUpperCase() : null;
}

function findLimitClause(sql) {
  // match `LIMIT n[, m]` at end-ish; ignore when inside string
  return sql.match(/\bLIMIT\s+(\d+)(?:\s*,\s*(\d+))?/i);
}

function injectLimit(sql, maxRows) {
  const cleaned = sql.trim().replace(/;\s*$/, "");
  return `${cleaned} LIMIT ${Number(maxRows)}`;
}

function clampLimit(sql, maxRows) {
  const m = findLimitClause(sql);
  if (!m) return sql;
  const cap = Math.max(1, parseInt(maxRows, 10) || 100);
  const cleaned = sql.replace(
    /(\bLIMIT\s+)(\d+)(?:\s*,\s*(\d+))?/i,
    (_full, head, a, b) => {
      if (b !== undefined) {
        // LIMIT offset, count
        const count = Math.min(parseInt(b, 10) || cap, cap);
        return `${head}0,${count}`;
      }
      const v = Math.min(parseInt(a, 10) || cap, cap);
      return `${head}${v}`;
    }
  );
  return cleaned;
}

/**
 * @param {string} sql
 * @param {{ maxRows?: number, allowedDatabases?: string[], allowedTables?: string[] }} [opts]
 * @returns {{ ok: boolean, sql?: string, originalSql: string, reason?: string, autoLimit?: boolean }}
 */
function validateSql(sql, opts = {}) {
  const originalSql = (sql ?? "").toString().trim();
  if (!originalSql) {
    return { ok: false, originalSql, reason: "empty_sql" };
  }

  if (hasMultipleStatements(originalSql)) {
    return { ok: false, originalSql, reason: "multiple_statements" };
  }

  const tok = firstToken(originalSql);
  if (!tok) return { ok: false, originalSql, reason: "empty_sql" };

  if (FORBIDDEN_KEYWORDS.has(tok)) {
    return { ok: false, originalSql, reason: `forbidden_keyword:${tok}` };
  }
  if (!ALLOWED_KEYWORDS.has(tok)) {
    return {
      ok: false,
      originalSql,
      reason: `not_in_allowlist:${tok}`,
    };
  }

  // Cross-check: token-level scan for any forbidden word appearing anywhere.
  // Conservative — catches obvious "SELECT 1; DROP ..." even when ; got space-eaten.
  const body = stripComments(originalSql);
  // split by non-word to avoid matching words containing keywords
  const tokens = body
    .replace(/[^A-Za-z_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((t) => t.toUpperCase());
  for (const t of tokens) {
    if (FORBIDDEN_KEYWORDS.has(t)) {
      return { ok: false, originalSql, reason: `forbidden_keyword:${t}` };
    }
  }

  const maxRows = parseInt(opts.maxRows ?? 100, 10) || 100;
  let out = originalSql;
  let autoLimit = false;
  const isSelect = tok === "SELECT";

  if (isSelect) {
    const hasLimit = findLimitClause(out);
    if (!hasLimit) {
      out = injectLimit(out, maxRows);
      autoLimit = true;
    } else {
      out = clampLimit(out, maxRows);
    }
  }

  return { ok: true, sql: out, originalSql, autoLimit };
}

module.exports = {
  validateSql,
  ALLOWED_KEYWORDS,
  FORBIDDEN_KEYWORDS,
  hasMultipleStatements,
  findLimitClause,
  injectLimit,
  clampLimit,
};
