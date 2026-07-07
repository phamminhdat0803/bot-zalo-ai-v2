/**
 * Column Policy — column-level allow / mask / deny enforcement for the
 * MySQL readonly tool.
 *
 * Source of truth resolution order:
 *   1. ctx.groupConfig.mysql.columns[table]   (preferred; passed by caller)
 *   2. groups.json[threadId].mysql.columns    (fallback)
 *   3. absence of config                      → reject (fail-closed)
 *
 * Policy shape per table:
 *   {
 *     allow: ["id", "name", ...]   // visible as-is
 *     mask:  ["phone", "email"]    // visible but value replaced with "***"
 *     deny:  ["password", "token"] // never returned
 *   }
 *
 * Rules:
 *   - allow  → pass through
 *   - mask   → replace value with literal "***"; never log raw value
 *   - deny   → drop the column entirely; log only the name (not value)
 *   - unknown column (not in any list) → dropped (filtered out)
 *   - table has NO column policy at all → reject "mysql_column_policy_missing"
 *
 * Returns:
 *   {
 *     ok: true,
 *     rows: Array<object>,            // masked/filtered
 *     fields: string[],               // visible column names, in first-seen order
 *     deniedColumns: string[],
 *     maskedColumns: string[],
 *   }
 *   OR
 *   { ok: false, error: string }
 */

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.trim().toLowerCase();
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  const out = new Set();
  for (const v of list) {
    const n = normalizeName(v);
    if (n) out.add(n);
  }
  return [...out];
}

/**
 * Resolve column policy for a single table from caller context.
 *
 * @param {string} table
 * @param {object} [ctx]
 * @returns {{ source: string|null, policy: object|null }}
 */
function resolveColumnPolicy(table, ctx = {}) {
  const tbl = normalizeName(table);
  if (!tbl) return { source: null, policy: null };

  const fromCtx = ctx?.groupConfig?.mysql?.columns;
  if (fromCtx && typeof fromCtx === "object") {
    const raw = fromCtx[tbl] || fromCtx[table];
    if (raw && typeof raw === "object") {
      return { source: "ctx.groupConfig.mysql.columns", policy: raw };
    }
  }

  const threadId = ctx?.threadId ? String(ctx.threadId) : null;
  if (threadId) {
    const groupCols = ctx?.groupsRegistry?.[threadId]?.mysql?.columns;
    if (groupCols && typeof groupCols === "object") {
      const raw = groupCols[tbl] || groupCols[table];
      if (raw && typeof raw === "object") {
        return { source: "groups.json.mysql.columns", policy: raw };
      }
    }
  }
  return { source: null, policy: null };
}

/**
 * Sanitize a raw per-table column policy.
 *
 * @param {object} raw
 * @returns {object|null}
 */
function sanitizeColumnPolicy(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    allow: normalizeList(raw.allow),
    mask: normalizeList(raw.mask),
    deny: normalizeList(raw.deny),
  };
}

/**
 * Apply column policy to rows.
 *
 * @param {string} table            Lower-cased table name.
 * @param {object} columnPolicy     Sanitized column policy for this table.
 * @param {Array<object>} rows      Raw rows from MySQL.
 * @returns {{ ok: true, rows: Array<object>, fields: string[], deniedColumns: string[], maskedColumns: string[] }}
 */
function applyColumnPolicy(table, columnPolicy, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const allowSet = new Set(columnPolicy.allow);
  const maskSet = new Set(columnPolicy.mask);
  const denySet = new Set(columnPolicy.deny);

  const visibleSet = new Set([...allowSet, ...maskSet]);
  const maskedColumns = [];
  const deniedColumns = [];
  const fieldsOrder = [];

  const out = [];
  for (const row of safeRows) {
    if (!row || typeof row !== "object") {
      out.push({});
      continue;
    }
    const newRow = {};
    for (const key of Object.keys(row)) {
      const lk = normalizeName(key);
      if (denySet.has(lk)) {
        if (!deniedColumns.includes(lk)) deniedColumns.push(lk);
        continue; // drop
      }
      if (!visibleSet.has(lk)) {
        // unknown column → drop
        continue;
      }
      if (maskSet.has(lk)) {
        newRow[key] = "***";
        if (!maskedColumns.includes(lk)) maskedColumns.push(lk);
      } else {
        newRow[key] = row[key];
      }
      if (!fieldsOrder.includes(key)) fieldsOrder.push(key);
    }
    out.push(newRow);
  }

  return {
    ok: true,
    rows: out,
    fields: fieldsOrder,
    deniedColumns,
    maskedColumns,
  };
}

/**
 * Top-level helper: resolve + sanitize + apply.
 *
 * @param {string} table
 * @param {Array<object>} rows
 * @param {object} ctx
 * @returns {{ ok: true, rows, fields, deniedColumns, maskedColumns, source: string }
 *         | { ok: false, error: string }}
 */
function enforceColumnPolicy(table, rows, ctx = {}) {
  const { source, policy: raw } = resolveColumnPolicy(table, ctx);
  if (!raw) {
    return { ok: false, error: "mysql_column_policy_missing" };
  }
  const policy = sanitizeColumnPolicy(raw);
  if (!policy) {
    return { ok: false, error: "mysql_column_policy_invalid" };
  }

  // If policy is completely empty (no allow, mask, deny) → reject fail-closed.
  if (
    policy.allow.length === 0 &&
    policy.mask.length === 0 &&
    policy.deny.length === 0
  ) {
    return { ok: false, error: "mysql_column_policy_empty" };
  }

  const result = applyColumnPolicy(table, policy, rows);
  return { ...result, source };
}

module.exports = {
  resolveColumnPolicy,
  sanitizeColumnPolicy,
  applyColumnPolicy,
  enforceColumnPolicy,
};