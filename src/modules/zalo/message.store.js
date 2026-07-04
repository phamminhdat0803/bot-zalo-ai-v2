const MAX_MESSAGES_PER_THREAD = 20;

const messagesByThread = new Map();

function rememberMessage(message) {
  if (!message?.threadId || !message?.messageId) return;

  const threadMessages = messagesByThread.get(message.threadId) || [];
  threadMessages.unshift({
    messageId: message.messageId,
    cliMsgId: message.cliMsgId,
    threadId: message.threadId,
    threadType: message.threadType,
    senderId: message.senderId,
    senderName: message.senderName,
    text: message.text,
    isSelf: message.isSelf,
    createdAt: Date.now(),
  });

  messagesByThread.set(message.threadId, threadMessages.slice(0, MAX_MESSAGES_PER_THREAD));
}

function getRecentMessages(threadId, limit = 5) {
  return (messagesByThread.get(threadId) || []).slice(0, limit);
}

module.exports = { rememberMessage, getRecentMessages };