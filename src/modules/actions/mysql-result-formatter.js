const SAFE_ERROR_MESSAGES = {
  tool_disabled: "Tool MySQL đang tắt.",
  permission_denied: "Group/user chưa được cấp quyền truy vấn.",
  mysql_not_configured: "Chưa cấu hình kết nối MySQL.",
  mysql_table_not_allowed: "Bảng này chưa được cấp quyền.",
  mysql_database_not_allowed: "Database này chưa được cấp quyền.",
  mysql_column_policy_missing: "Bảng này thiếu chính sách cột an toàn.",
  rate_limited: "Truy vấn quá nhiều, vui lòng thử lại sau.",
  invalid_tool_input: "Cú pháp tool không hợp lệ.",
  mysql_policy_missing: "Group này chưa cấu hình chính sách MySQL.",
  mysql_policy_disabled: "Chính sách MySQL của group đang tắt.",
  tool_not_registered: "Tool MySQL chưa được đăng ký trong runtime.",
  tool_error: "Tool MySQL lỗi khi xử lý truy vấn.",
  timeout: "Truy vấn quá thời gian cho phép.",
};

const SENSITIVE_KEY_RE = /(password|token|secret|credential|license_number|raw)/i;
const PREVIEW_LIMIT = 10;

function safeErrorMessage(reason) {
  return SAFE_ERROR_MESSAGES[reason] || `Không truy vấn được DB: ${reason || "unknown_error"}.`;
}

function extractTableName(sql) {
  const m = String(sql || "").match(/\bfrom\s+`?([a-zA-Z0-9_]+)`?/i);
  return m ? m[1] : "DB";
}

function normalizeResult(toolResult) {
  if (!toolResult) return { ok: false, error: "unknown_error" };
  if (toolResult.ok === true && toolResult.result && typeof toolResult.result === "object") {
    return toolResult.result;
  }
  return toolResult;
}

function visibleFields(rows, fields) {
  const fromFields = Array.isArray(fields) ? fields : [];
  const set = new Set(fromFields.filter((f) => !SENSITIVE_KEY_RE.test(String(f))));
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of Object.keys(row)) {
      if (!SENSITIVE_KEY_RE.test(String(key))) set.add(key);
    }
  }
  return [...set];
}

function formatValue(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatRow(row, fields) {
  if (!row || typeof row !== "object") return formatValue(row);
  const safeFields = fields.filter((f) => Object.prototype.hasOwnProperty.call(row, f));
  if (safeFields.length === 1) return formatValue(row[safeFields[0]]);
  return safeFields.map((f) => `${f}: ${formatValue(row[f])}`).join(", ");
}

function formatMysqlResultMessage(toolResult, action = {}) {
  const result = normalizeResult(toolResult);
  const reason = result?.error || result?.reason;
  if (!result?.ok) {
    return safeErrorMessage(reason);
  }

  const rows = Array.isArray(result.rows) ? result.rows : [];
  if (rows.length === 0) {
    return "Không tìm thấy dữ liệu phù hợp.";
  }

  const fields = visibleFields(rows, result.fields);
  const table = extractTableName(action?.params?.sql);
  const total = Number.isFinite(result.rowCount) ? result.rowCount : rows.length;
  const preview = rows.slice(0, PREVIEW_LIMIT);
  const lines = [`Kết quả truy vấn ${table}:`, ""];

  preview.forEach((row, idx) => {
    lines.push(`${idx + 1}. ${formatRow(row, fields)}`);
  });

  if (rows.length > PREVIEW_LIMIT || total > PREVIEW_LIMIT) {
    lines.push(`... chỉ hiển thị ${PREVIEW_LIMIT} dòng đầu.`);
  }

  lines.push("");
  lines.push(`Tổng: ${total} dòng.`);
  return lines.join("\n");
}

module.exports = {
  PREVIEW_LIMIT,
  SAFE_ERROR_MESSAGES,
  formatMysqlResultMessage,
  normalizeResult,
  safeErrorMessage,
};
