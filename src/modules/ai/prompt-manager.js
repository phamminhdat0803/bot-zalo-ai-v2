const crypto = require("crypto");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { buildPhase1Prompt } = require("./prompt-builder");
const { loadPromptFile, loadPromptRegistry, loadUserPromptRegistry } = require("./prompt-loader");

const JSON_EXAMPLE_SUFFIX = `
Trả JSON:
{
  "actions": [
    {
      "type": "send_message",
      "reason": "Trả lời user",
      "params": { "threadId": "current", "text": "Nội dung" }
    },
    {
      "type": "react_message",
      "reason": "Thả cảm xúc vào tin nhắn trên",
      "params": { "target": "previous" }
    },
    {
      "type": "react_message",
      "reason": "Thả cảm xúc vào tất cả tin nhắn gần đây ở trên",
      "params": { "target": "all_previous" }
    }
  ]
}`;

function truncateText(text, maxChars, label) {
  if (!text || text.length <= maxChars) return text;
  logger.warn("[PromptManager] truncated", label, "before", text.length, "after", maxChars);
  return text.slice(0, maxChars) + "\n... [truncated]";
}

/** @typedef {{ key: string, level: string, content: string, priority: number }} LayerBlock */

function assembleSystemPromptWithBudget(blocks, maxChars) {
  const mandatory = blocks.filter((b) => b.priority >= 100);
  // Keep push order: identity → domain → group → user → runtime (truncate from end: runtime first)
  const optional = blocks.filter((b) => b.priority < 100);

  const kept = [];
  let total = 0;
  const truncatedLayers = [];

  for (const b of mandatory) {
    kept.push(b);
    total += b.content.length + 2;
  }

  for (const b of optional) {
    const add = b.content.length + 2;
    if (total + add <= maxChars) {
      kept.push(b);
      total += add;
      continue;
    }
    const room = maxChars - total;
    if (room > 80) {
      const cut = truncateText(b.content, room - 40, b.level);
      kept.push({ ...b, content: cut });
      truncatedLayers.push(b.level);
      total = maxChars;
    } else {
      truncatedLayers.push(b.level);
    }
    break;
  }

  const before = blocks.reduce((s, b) => s + b.content.length, 0);
  const systemPrompt = kept.map((b) => b.content).join("\n\n");
  if (truncatedLayers.length > 0 || systemPrompt.length < before) {
    logger.warn("[PromptManager] system prompt budget", {
      beforeChars: before,
      afterChars: systemPrompt.length,
      maxChars,
      truncatedLayers,
    });
  }
  return { systemPrompt, truncatedLayers };
}

function slicePreviousMessages(previousMessages, limit) {
  if (!Array.isArray(previousMessages)) return [];
  return previousMessages.slice(0, limit);
}

function sanitizeMessageForPayload(normalizedMessage) {
  if (!normalizedMessage || typeof normalizedMessage !== "object") return {};
  const { previousMessages: _p, raw, ...rest } = normalizedMessage;
  const out = { ...rest };
  if (raw != null) {
    out.hasRaw = true;
  }
  return out;
}

function buildUserPayload(normalizedMessage, previousMessages) {
  const limit = env.CONVERSATION_RECENT_LIMIT;
  const { previousMessages: _drop } = normalizedMessage || {};
  const history = slicePreviousMessages(previousMessages ?? _drop, limit);

  const payload = {
    message: sanitizeMessageForPayload(normalizedMessage),
    previousMessages: history,
  };

  return payload;
}

function shouldApplyUserPrompt(normalizedMessage, userEntry) {
  if (!userEntry || userEntry.enabled === false) return false;
  const isGroup = !!normalizedMessage?.isGroup;
  if (isGroup && userEntry.applyInGroups === false) return false;
  if (!isGroup && userEntry.applyInPrivate === false) return false;
  return true;
}

function hashPromptContext(parts, meta) {
  const payload = JSON.stringify({
    parts: parts.map((p) => ({ level: p.level, source: p.source, enabled: p.enabled, chars: p.chars })),
    meta,
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function loadLayer(relativePath, level, parts, opts = {}) {
  const content = await loadPromptFile(relativePath);
  if (!content) {
    if (!opts.silent && relativePath && !relativePath.endsWith("groups.json")) {
      logger.warn("[PromptManager] empty or missing prompt layer", level, relativePath);
    }
    return "";
  }
  parts.push({
    level,
    source: `data/prompts/${relativePath.replace(/\\/g, "/")}`,
    enabled: true,
    chars: content.length,
  });
  return content;
}

async function composeSystemLayers(normalizedMessage, runtimePrompt, parts) {
  const threadId = normalizedMessage?.threadId;
  const isGroup = !!normalizedMessage?.isGroup;

  const core = await loadLayer("core.md", "core", parts);
  const identity = await loadLayer("identity.md", "identity", parts);
  const capability = await loadLayer("capabilities/action-planner.md", "capability", parts);

  let domainKey = "default";
  let groupEntry = null;

  if (isGroup && threadId) {
    const registry = await loadPromptRegistry();
    groupEntry = registry[threadId];
    if (groupEntry?.enabled === false) groupEntry = null;
    if (groupEntry?.domain) domainKey = groupEntry.domain;
  }

  const domainPath = `domains/${domainKey}.md`;
  let domain = await loadLayer(domainPath, "domain", parts);
  if (!domain && domainKey !== "default") {
    domain = await loadLayer("domains/default.md", "domain", parts);
  }

  let userEntry = null;
  const senderId = normalizedMessage?.senderId ? String(normalizedMessage.senderId) : "";

  if (runtimePrompt && String(runtimePrompt).trim()) {
    parts.push({
      level: "runtime",
      source: "runtime",
      enabled: true,
      chars: 0,
    });
  } else {
    parts.push({
      level: "runtime",
      source: "placeholder",
      enabled: false,
      chars: 0,
    });
  }

  const blocks = [];
  if (core) blocks.push({ key: "core", level: "core", content: core, priority: 100 });
  if (identity) blocks.push({ key: "identity", level: "identity", content: identity, priority: 50 });
  if (capability) blocks.push({ key: "capability", level: "capability", content: capability, priority: 100 });
  if (domain) blocks.push({ key: "domain", level: "domain", content: domain, priority: 25 });

  if (isGroup && groupEntry && groupEntry.enabled !== false) {
    const groupFile = groupEntry.promptFile || `groups/${threadId}.md`;
    const groupContent = await loadLayer(groupFile, "group", parts, { silent: true });
    if (!groupContent) {
      logger.warn("[PromptManager] group prompt missing", threadId, groupFile);
    } else {
      blocks.push({ key: "group", level: "group", content: groupContent, priority: 22 });
    }
  }

  if (env.PROMPT_USER_ENABLED && senderId) {
    const usersRegistry = await loadUserPromptRegistry();
    userEntry = usersRegistry[senderId] || null;
    if (userEntry && shouldApplyUserPrompt(normalizedMessage, userEntry)) {
      const userFile = userEntry.promptFile || `users/${senderId}.md`;
      const userContent = await loadLayer(userFile, "user", parts, { silent: true });
      if (!userContent) {
        logger.warn("[PromptManager] user prompt missing", senderId, userFile);
        parts.push({
          level: "user",
          source: `data/prompts/${userFile.replace(/\\/g, "/")}`,
          enabled: false,
          chars: 0,
        });
      } else {
        const userPriority = Number(userEntry.priority) || 18;
        blocks.push({
          key: "user",
          level: "user",
          content: userContent,
          priority: userPriority < 100 ? userPriority : 18,
        });
      }
    } else {
      parts.push({ level: "user", source: "placeholder", enabled: false, chars: 0 });
    }
  } else {
    parts.push({
      level: "user",
      source: senderId ? "disabled_or_no_registry" : "no_sender_id",
      enabled: false,
      chars: 0,
    });
  }

  if (runtimePrompt && String(runtimePrompt).trim()) {
    const rt = String(runtimePrompt).trim();
    const rtPart = truncateText(rt, env.PROMPT_MAX_RUNTIME_CHARS, "runtime");
    blocks.push({ key: "runtime", level: "runtime", content: rtPart, priority: 8 });
    const rtIdx = parts.findIndex((p) => p.level === "runtime" && p.source === "runtime");
    if (rtIdx >= 0) parts[rtIdx].chars = rtPart.length;
  }

  blocks.push({
    key: "json_example",
    level: "capability",
    content: JSON_EXAMPLE_SUFFIX.trim(),
    priority: 100,
  });

  const { systemPrompt } = assembleSystemPromptWithBudget(blocks, env.PROMPT_MAX_SYSTEM_CHARS);
  return { systemPrompt, groupEntry, domainKey, userEntry };
}

function buildLegacyParts() {
  return [{ level: "legacy", source: "prompt-builder.js", enabled: true, chars: 0 }];
}

async function buildPromptContext(options = {}) {
  const normalizedMessage = options.normalizedMessage || {};
  const previousMessages = options.previousMessages ?? normalizedMessage.previousMessages;
  const runtimePrompt = options.runtimePrompt;

  const userPayload = buildUserPayload(normalizedMessage, previousMessages);
  const threadId = normalizedMessage.threadId;
  const isGroup = !!normalizedMessage.isGroup;

  if (!env.PROMPT_USE_FILES) {
    const legacyNormalized = {
      ...sanitizeMessageForPayload(normalizedMessage),
      previousMessages: userPayload.previousMessages,
    };
    const legacyPrompt = buildPhase1Prompt(legacyNormalized);
    const parts = buildLegacyParts();
    parts[0].chars = legacyPrompt.length;
    const versionHash = hashPromptContext(parts, {
      mode: "legacy",
      threadId,
      model: env.OPENAI_MODEL,
    });
    logPromptDebug({
      threadId,
      isGroup,
      senderId: normalizedMessage.senderId,
      parts,
      versionHash,
      totalChars: legacyPrompt.length,
      hasGroupPrompt: false,
      domain: null,
      groupPromptEnabled: false,
      systemPrompt: legacyPrompt,
    });
    return {
      systemPrompt: legacyPrompt,
      userPayload,
      parts,
      versionHash,
      legacySingleUserPrompt: legacyPrompt,
      meta: { domain: null, groupPromptEnabled: false, groupEntry: null },
    };
  }

  const parts = [];
  const { systemPrompt, groupEntry, domainKey, userEntry } = await composeSystemLayers(
    normalizedMessage,
    runtimePrompt,
    parts
  );

  const versionHash = hashPromptContext(parts, {
    mode: "layered",
    threadId,
    isGroup,
    senderId: normalizedMessage.senderId,
    model: env.OPENAI_MODEL,
  });

  const totalChars = parts.reduce((s, p) => s + (p.chars || 0), 0) + systemPrompt.length;
  const hasGroupPrompt = parts.some((p) => p.level === "group" && p.enabled && p.chars > 0);
  const groupPromptEnabled = !!(groupEntry && groupEntry.enabled !== false);
  const hasUserPrompt = parts.some((p) => p.level === "user" && p.enabled && p.chars > 0);
  const userPromptEnabled = hasUserPrompt;

  logPromptDebug({
    threadId,
    isGroup,
    senderId: normalizedMessage.senderId,
    parts,
    versionHash,
    totalChars,
    hasGroupPrompt,
    hasUserPrompt,
    domain: domainKey,
    groupPromptEnabled,
    userPromptEnabled,
    systemPrompt,
  });

  const legacySingleUserPrompt =
    systemPrompt +
    "\n\nNormalized message:\n" +
    JSON.stringify(
      {
        ...sanitizeMessageForPayload(normalizedMessage),
        previousMessages: userPayload.previousMessages,
      },
      null,
      2
    );

  return {
    systemPrompt,
    userPayload,
    parts,
    versionHash,
    legacySingleUserPrompt,
    meta: {
      domain: domainKey,
      groupPromptEnabled,
      groupEntry: groupEntry || null,
      userPromptEnabled,
      hasUserPrompt,
      userEntry: userEntry || null,
    },
  };
}

function logPromptDebug(ctx) {
  if (!env.PROMPT_DEBUG) return;
  const entry = {
    threadId: ctx.threadId,
    isGroup: ctx.isGroup,
    senderId: ctx.senderId,
    versionHash: ctx.versionHash,
    parts: ctx.parts,
    totalChars: ctx.totalChars,
    hasGroupPrompt: ctx.hasGroupPrompt,
    hasUserPrompt: ctx.hasUserPrompt,
    domain: ctx.domain,
    groupPromptEnabled: ctx.groupPromptEnabled,
    userPromptEnabled: ctx.userPromptEnabled,
  };
  logger.debug("[PromptManager] built prompt", entry);
  if (env.PROMPT_DEBUG_FULL && ctx.systemPrompt) {
    const safe = ctx.systemPrompt.slice(0, 12000);
    logger.debug("[PromptManager] full system prompt (capped)", safe);
  }
}

function formatPromptDebugReply(promptContext) {
  const meta = promptContext.meta || {};
  const lines = [
    "Prompt debug:",
    `- groupId: ${promptContext.userPayload?.message?.threadId ?? "n/a"}`,
    `- senderId: ${promptContext.userPayload?.message?.senderId ?? "n/a"}`,
    `- isGroup: ${!!promptContext.userPayload?.message?.isGroup}`,
    `- domain: ${meta.domain ?? "n/a"}`,
    `- groupPrompt: ${meta.groupPromptEnabled ? "enabled" : "disabled"}`,
    `- userPrompt: ${meta.userPromptEnabled ? "enabled" : "disabled"}`,
    `- versionHash: ${promptContext.versionHash}`,
    "- parts:",
  ];
  let idx = 0;
  promptContext.parts.forEach((p) => {
    if (p.level === "user" && p.enabled === false && p.chars === 0) return;
    if (p.level === "runtime" && p.source === "placeholder" && !p.chars) return;
    idx += 1;
    const off = p.enabled === false ? " (off)" : "";
    lines.push(`  ${idx}. ${p.level}: ${p.source}${p.chars ? ` (${p.chars} chars)` : ""}${off}`);
  });
  return lines.join("\n");
}

function isPromptAdmin(senderId) {
  if (!env.PROMPT_ADMIN_ENABLED) return false;
  if (!senderId) return false;
  return env.ZALO_ADMIN_USER_IDS.includes(String(senderId));
}

module.exports = {
  buildPromptContext,
  formatPromptDebugReply,
  isPromptAdmin,
  buildUserPayload,
};