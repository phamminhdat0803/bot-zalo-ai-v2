function parseZaloMessage(raw, botOwnId) {
  const isGroup = raw.type === 1; // ThreadType.Group = 1 in zca-js
  const data = raw.data || {};
  const text = data.content || data.msg || "";
  const mentions = (data.mentions || []).map(m => m.uid || m.id).filter(Boolean);
  const isMentionBot = botOwnId ? mentions.includes(botOwnId) : false;
  const msgId = data.msgId ? String(data.msgId) : "";
  const cliMsgId = data.cliMsgId ? String(data.cliMsgId) : msgId;

  return {
    platform: "zalo",
    threadId: raw.threadId || data.threadId,
    threadType: isGroup ? "group" : "user",
    messageId: msgId || cliMsgId,
    cliMsgId,
    senderId: data.uidFrom || data.senderId,
    senderName: data.dName || data.senderName,
    text,
    isSelf: !!raw.isSelf,
    isGroup,
    mentions,
    isMentionBot,
    raw,
  };
}

module.exports = { parseZaloMessage };