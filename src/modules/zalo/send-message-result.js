/** Extract Zalo msgId/cliMsgId from zca-js sendMessage response (shape varies). */
function extractSendMessageIds(data) {
  if (!data || typeof data !== "object") return { messageId: null, cliMsgId: null };
  const unwrap = data.data && typeof data.data === "object" ? data.data : data;
  const messageId =
    unwrap.msgId ??
    unwrap.messageId ??
    unwrap.globalMsgId ??
    data.msgId ??
    data.messageId ??
    null;
  const cliMsgId = unwrap.cliMsgId ?? data.cliMsgId ?? null;
  return {
    messageId: messageId != null ? String(messageId) : null,
    cliMsgId: cliMsgId != null ? String(cliMsgId) : null,
  };
}

module.exports = { extractSendMessageIds };