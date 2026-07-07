/**
 * zalo-actions.tool — wraps legacy Zalo actions as named tools.
 *
 * The new tool system is built but action-executor.js still owns the
 * actual JSON-action loop. These tool definitions are registered so the
 * registry knows the canonical names + permission keys for Zalo actions.
 *
 * Bridge to action-executor is intentionally NOT wired in Phase 2 to
 * avoid changing behaviour; safe to enable in a later phase.
 */

const { registerTool } = require("../tool-registry");
const { sendMessage, reactMessage } = require("../../zalo/zalo.sender");

registerTool({
  name: "noop",
  description: "Do nothing — no outbound effect.",
  requiredPermission: "zalo.noop",
  enabled: true,
  inputSchema: { type: "object", properties: {} },
  execute: async () => ({ ok: true, action: "noop" }),
});

registerTool({
  name: "send_message",
  description: "Send a message to current Zalo thread.",
  requiredPermission: "zalo.send_message",
  enabled: true,
  inputSchema: {
    type: "object",
    required: ["text"],
    properties: {
      threadId: { type: "string" },
      threadType: { type: "string" },
      text: { type: "string" },
    },
  },
  execute: async (input, ctx) => {
    const threadId = input.threadId || ctx?.message?.threadId;
    const threadType = input.threadType || ctx?.message?.threadType;
    if (!threadId || !threadType) {
      return { ok: false, reason: "missing_thread_identity" };
    }
    const res = await sendMessage({
      threadId,
      threadType,
      text: input.text || "",
    });
    return { ok: !!res.ok, data: res.data, reason: res.error };
  },
});

registerTool({
  name: "react_message",
  description: "React to a message in current Zalo thread.",
  requiredPermission: "zalo.react_message",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      messageId: { type: "string" },
      cliMsgId: { type: "string" },
      threadId: { type: "string" },
      threadType: { type: "string" },
    },
  },
  execute: async (input) => {
    if (!input.messageId || !input.cliMsgId) {
      return { ok: false, reason: "missing_message_identity" };
    }
    const res = await reactMessage({
      messageId: input.messageId,
      cliMsgId: input.cliMsgId,
      threadId: input.threadId,
      threadType: input.threadType,
    });
    return { ok: !!res.ok, reason: res.error || res.reason };
  },
});
