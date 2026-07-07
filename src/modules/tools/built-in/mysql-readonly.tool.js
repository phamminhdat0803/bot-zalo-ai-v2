/**
 * mysql_readonly_query — gated readonly MySQL tool.
 *
 * Gate order (Phase: Production Readiness):
 *   1. env / tool enabled
 *   2. zod validate input
 *   3. permission check
 *   4. resolve group mysql policy (raw, before any parsing)
 *   5. compute final maxRows = min(hard, env, groupPolicy, input)
 *   6. readonly SQL validator (FIRST parser)         → UPDATE/DELETE/DROP/INSERT fail here as "forbidden_keyword"
 *   7. database/table access policy                 → fail "mysql_table_not_allowed" / "mysql_database_not_allowed"
 *   8. rate limit (per thread+sender+tool)
 *   9. mysql pool/client readiness
 *  10. execute query with timeout
 *  11. column policy (mask / deny / filter)
 *  12. audit log
 *  13. return sanitized result
 *
 * Notes:
 *   - Gate 6 (validator) runs BEFORE Gate 7 (access policy) on purpose:
 *     UPDATE/DELETE must surface as `forbidden_keyword:*`, not
 *     `mysql_table_parse_failed`.
 *   - Gate 8 (rate limit) sits BEFORE any mysql client call.
 *   - Gate 11 (column policy) is applied to result rows. mask/deny are
 *     recorded in audit but raw values never leave the gate.
 */

const { z } = require("zod");
const { registerTool } = require("../tool-registry");
const { validateSql } = require("../../db/sql-validator");
const { enforceAccessPolicy } = require("../../db/sql-access-policy");
const { enforceColumnPolicy } = require("../../db/column-policy");
const { checkAndRecord: rateLimitCheck } = require("../../rate-limit/tool-rate-limit");
const mysqlClient = require("../../db/mysql.client");
const { audit } = require("../../audit/audit-logger");
const { env } = require("../../../config/env");
const { logger } = require("../../../config/logger");
const { isToolAllowedForContext } = require("../../permissions/tool-permission");

const HARD_MAX_ROWS = 500;

const MysqlReadonlyInputSchema = z.object({
  sql: z.string().min(1).max(10000),
  reason: z.string().min(1).max(1000),
  maxRows: z.number().int().min(1).max(HARD_MAX_ROWS).optional(),
});

function safeError(reason) {
  return { ok: false, error: reason };
}

function baseAudit(ctx) {
  return {
    tool: "mysql_readonly_query",
    senderId: ctx?.senderId ? String(ctx.senderId) : null,
    threadId: ctx?.threadId ? String(ctx.threadId) : null,
    isGroup: !!ctx?.isGroup,
    auditDir: env.MYSQL_AUDIT_DIR,
  };
}

async function writeAudit(entry) {
  if (env.MYSQL_AUDIT_LOG) {
    try {
      await audit(entry);
    } catch (e) {
      logger.warn("[MysqlTool] audit write failed", e.message);
    }
  }
}

function register() {
  registerTool({
    name: "mysql_readonly_query",
    description:
      "Run safe read-only MySQL queries on allowed databases/tables only. SQL is whitelist-validated first; database/table allowlist enforced; column-level allow/mask/deny applied to result rows.",
    requiredPermission: "db.mysql.readonly",
    enabled: true,
    envToggle: "MYSQL_TOOL_ENABLED",
    inputSchema: {
      type: "object",
      required: ["sql", "reason"],
      properties: {
        sql: { type: "string", minLength: 1, maxLength: 10000 },
        reason: { type: "string", minLength: 1, maxLength: 1000 },
        maxRows: { type: "integer", minimum: 1, maximum: HARD_MAX_ROWS },
      },
    },
    meta: { category: "database", readonly: true },
    execute: async (input, ctx = {}) => {
      const start = Date.now();
      const auditBase = baseAudit(ctx);

      // ----- Gate 1: env toggle -----
      if (!env.MYSQL_TOOL_ENABLED) {
        await writeAudit({
          ...auditBase,
          ok: false,
          error: "tool_disabled",
          latencyMs: Date.now() - start,
        });
        return safeError("tool_disabled");
      }

      // ----- Gate 2: zod validate input -----
      const parsed = MysqlReadonlyInputSchema.safeParse(input);
      if (!parsed.success) {
        const issueCount = parsed.error?.issues?.length || 0;
        await writeAudit({
          ...auditBase,
          ok: false,
          error: "invalid_tool_input",
          errorCount: issueCount,
          latencyMs: Date.now() - start,
        });
        logger.info("[MysqlTool] invalid_tool_input", {
          threadId: ctx?.threadId || null,
          issues: issueCount,
        });
        return safeError("invalid_tool_input");
      }
      const { sql, reason, maxRows: inputMax } = parsed.data;

      // ----- Gate 3: permission check -----
      const perm = isToolAllowedForContext("mysql_readonly_query", ctx);
      if (!perm.allowed) {
        await writeAudit({
          ...auditBase,
          sql,
          ok: false,
          error: "permission_denied",
          permReason: perm.reason,
          permSource: perm.source,
          latencyMs: Date.now() - start,
        });
        return safeError("permission_denied");
      }

      // ----- Gate 4: resolve group mysql policy (raw, before parsing) -----
      const fromCtx = ctx?.groupConfig?.mysql;
      const threadId = ctx?.threadId ? String(ctx.threadId) : null;
      const fromGroup = threadId
        ? ctx?.groupsRegistry?.[threadId]?.mysql
        : null;
      const groupPolicyRaw = (fromCtx && typeof fromCtx === "object")
        ? fromCtx
        : (fromGroup && typeof fromGroup === "object" ? fromGroup : null);

      if (!groupPolicyRaw) {
        await writeAudit({
          ...auditBase,
          sql,
          ok: false,
          error: "mysql_policy_missing",
          latencyMs: Date.now() - start,
        });
        return safeError("mysql_policy_missing");
      }

      // ----- Gate 5: compute final maxRows -----
      const policyMax = Number.isFinite(groupPolicyRaw.maxRows) && groupPolicyRaw.maxRows > 0
        ? Math.floor(groupPolicyRaw.maxRows)
        : null;
      const sources = [HARD_MAX_ROWS];
      if (Number.isFinite(env.MYSQL_MAX_ROWS) && env.MYSQL_MAX_ROWS > 0) {
        sources.push(env.MYSQL_MAX_ROWS);
      }
      if (Number.isFinite(policyMax) && policyMax > 0) {
        sources.push(policyMax);
      }
      if (Number.isFinite(inputMax) && inputMax > 0) {
        sources.push(inputMax);
      }
      const finalMaxRows = Math.max(1, Math.min(...sources));

      // ----- Gate 6: readonly SQL validator (FIRST parser) -----
      // Catches UPDATE/DELETE/DROP/INSERT/ALTER etc. before any table parsing.
      const validation = validateSql(sql, { maxRows: finalMaxRows });
      if (!validation.ok) {
        await writeAudit({
          ...auditBase,
          sql,
          ok: false,
          error: validation.reason,
          latencyMs: Date.now() - start,
        });
        logger.info("[MysqlTool] denied by sql-validator", validation.reason);
        return safeError(validation.reason);
      }
      const finalSql = validation.sql;
      const autoLimit = !!validation.autoLimit;

      // Detect LIMIT clamp.
      const originalLimitMatch = sql.match(/\bLIMIT\s+(\d+)(?:\s*,\s*(\d+))?/i);
      let clampedLimit = false;
      if (originalLimitMatch) {
        const origN = parseInt(originalLimitMatch[2] || originalLimitMatch[1], 10);
        const newMatch = finalSql.match(/\bLIMIT\s+(\d+)(?:\s*,\s*(\d+))?/i);
        const newN = newMatch ? parseInt(newMatch[2] || newMatch[1], 10) : NaN;
        if (Number.isFinite(origN) && Number.isFinite(newN) && newN < origN) {
          clampedLimit = true;
        }
      }

      // ----- Gate 7: database/table access policy -----
      const access = enforceAccessPolicy(sql, ctx);
      if (!access.ok) {
        await writeAudit({
          ...auditBase,
          sql,
          ok: false,
          error: access.error,
          source: access.source,
          details: access.details || null,
          latencyMs: Date.now() - start,
        });
        logger.info("[MysqlTool] denied by access policy", {
          error: access.error,
          threadId: ctx?.threadId || null,
        });
        return safeError(access.error);
      }

      // ----- Gate 7.5: column-policy existence pre-flight -----
      // Fail-closed: if any referenced table lacks a column policy, reject
      // BEFORE opening a mysql client. This ensures sensitive columns never
      // cross the wire to a caller that does not have explicit policy.
      const referencedTables = access.tables || [];
      for (const t of referencedTables) {
        const probe = enforceColumnPolicy(t.table, [], ctx);
        if (!probe.ok) {
          await writeAudit({
            ...auditBase,
            sql,
            ok: false,
            error: probe.error,
            table: t.table,
            latencyMs: Date.now() - start,
          });
          logger.info("[MysqlTool] denied by column policy pre-flight", {
            table: t.table,
            error: probe.error,
            threadId: ctx?.threadId || null,
          });
          return safeError(probe.error);
        }
      }

      // ----- Gate 8: rate limit (per thread+sender+tool) -----
      const rl = rateLimitCheck({
        toolName: "mysql_readonly_query",
        threadId: ctx?.threadId,
        senderId: ctx?.senderId,
      });
      if (!rl.ok) {
        await writeAudit({
          ...auditBase,
          sql: finalSql,
          ok: false,
          error: "rate_limited",
          rateLimitWindow: rl.window,
          latencyMs: Date.now() - start,
        });
        logger.info("[MysqlTool] rate_limited", {
          threadId: ctx?.threadId || null,
          window: rl.window,
        });
        return safeError("rate_limited");
      }

      // ----- Gate 9: mysql pool/client readiness -----
      if (!mysqlClient.isConfigured()) {
        await writeAudit({
          ...auditBase,
          sql: finalSql,
          ok: false,
          error: "mysql_not_configured",
          latencyMs: Date.now() - start,
        });
        return safeError("mysql_not_configured");
      }

      // ----- Gate 10: execute query with timeout -----
      let timedOut = false;
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error("timeout"));
        }, env.MYSQL_QUERY_TIMEOUT_MS);
      });

      try {
        const queryResult = await Promise.race([
          mysqlClient.withClient((conn) =>
            conn.query(finalSql).then(([rows, fields]) => ({
              rows,
              fields: (fields || []).map((f) => f && f.name).filter(Boolean),
            }))
          ),
          timeout,
        ]);

        const data = queryResult?.data || { rows: [], fields: [] };
        const rowCount = Array.isArray(data.rows) ? data.rows.length : 0;

        // ----- Gate 11: column policy (mask/deny/filter) -----
        // Existence already enforced at Gate 7.5. Here we just apply the
        // per-row mask/deny/filter.
        const tables = access.tables || [];
        const maskedColumns = [];
        const deniedColumns = [];
        let finalRows = data.rows;
        let finalFields = data.fields;

        if (tables.length > 0) {
          const fieldsSet = new Set();
          finalRows = [];
          for (const row of data.rows) {
            const merged = {};
            for (const t of tables) {
              const cp = enforceColumnPolicy(t.table, [row], ctx);
              if (cp.ok) {
                const cleaned = cp.rows[0] || {};
                Object.assign(merged, cleaned);
                for (const f of cp.fields) fieldsSet.add(f);
                for (const c of cp.maskedColumns) {
                  if (!maskedColumns.includes(c)) maskedColumns.push(c);
                }
                for (const c of cp.deniedColumns) {
                  if (!deniedColumns.includes(c)) deniedColumns.push(c);
                }
              }
            }
            finalRows.push(merged);
          }
          finalFields = [...fieldsSet];
        }

        await writeAudit({
          ...auditBase,
          sql: finalSql,
          reason,
          ok: true,
          autoLimit,
          clampedLimit,
          maxRowsRequested: inputMax || null,
          finalMaxRows,
          tables: access.tables,
          source: access.source,
          maskedColumns,
          deniedColumns,
          latencyMs: Date.now() - start,
          rows: rowCount,
        });

        return {
          ok: true,
          rows: finalRows,
          fields: finalFields,
          autoLimit,
          clampedLimit,
          finalMaxRows,
          maskedColumns,
          deniedColumns,
          truncated: false,
        };
      } catch (e) {
        const reasonOut = timedOut
          ? "timeout"
          : (e && e.message) || "query_error";
        await writeAudit({
          ...auditBase,
          sql: finalSql,
          ok: false,
          error: reasonOut,
          maxRowsRequested: inputMax || null,
          finalMaxRows,
          latencyMs: Date.now() - start,
        });
        return safeError(reasonOut);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  });
}

register();

module.exports = {
  MysqlReadonlyInputSchema,
  HARD_MAX_ROWS,
  register,
};