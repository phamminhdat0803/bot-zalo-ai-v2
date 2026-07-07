const crypto = require("crypto");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { buildPhase1Prompt } = require("./prompt-builder");
const {
  loadPromptFile,
  loadPromptRegistry,
  loadUserPromptRegistry,
} = require("./prompt-loader");

let toolRegistryMod = null;
let toolPermissionMod = null;

function tryLoadToolModules() {
  if (toolRegistryMod && toolPermissionMod) return;
  try {
    // eslint-disable-next-line global-require
    toolRegistryMod = require("../tools/tool-registry");
  } catch (_e) {
    toolRegistryMod = null;
  }
  try {
    // eslint-disable-next-line global-require
    toolPermissionMod = require("../permissions/tool-permission");
  } catch (_e) {
    toolPermissionMod = null;
  }
}

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

/** @typedef {{ key: string, level: string, content: string, priority: number, important?: boolean }} LayerBlock */

function assembleSystemPromptWithBudget(blocks, maxChars) {
  let working = blocks.map((b) => ({ ...b }));
  const truncatedLayers = [];
  const droppedLayers = [];

  function totalChars(list) {
    return list.reduce((s, b) => s + b.content.length + 2, 0);
  }

  while (totalChars(working) > maxChars) {
    const optionalIdx = working
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.priority < 100)
      .sort((a, b) => {
        const impA = a.b.important ? 1 : 0;
        const impB = b.b.important ? 1 : 0;
        if (impA !== impB) return impA - impB;
        return a.b.priority - b.b.priority;
      });

    if (optionalIdx.length === 0) break;
    const { b, i } = optionalIdx[0];
    const originalChars = b.content.length;

    if (b.important && b.content.length > 60) {
      const room = maxChars - (totalChars(working) - b.content.length);
      const target = Math.max(Math.min(room - 40, b.content.length), 40);
      const cut = truncateText(b.content, target, b.level);
      working[i] = { ...b, content: cut };
      truncatedLayers.push({
        layer: b.level,
        originalChars,
        truncatedChars: cut.length,
        reason: "budget",
      });
      if (cut.length >= b.content.length) break;
      continue;
    }

    working.splice(i, 1);
    droppedLayers.push(b.level);
    if (b.important) {
      userPromptDebugBudgetNote(b);
    }
    logger.warn("[PromptManager] system prompt layer dropped (budget)", {
      layer: b.level,
      originalChars,
      reason: "budget",
      maxChars,
    });
  }

  const before = blocks.reduce((s, b) => s + b.content.length, 0);
  const systemPrompt = working.map((b) => b.content).join("\n\n");
  if (truncatedLayers.length > 0 || droppedLayers.length > 0 || systemPrompt.length < before) {
    logger.warn("[PromptManager] system prompt budget", {
      beforeChars: before,
      afterChars: systemPrompt.length,
      maxChars,
      truncatedLayers,
      droppedLayers,
    });
  }
  return { systemPrompt, truncatedLayers, droppedLayers };
}

function userPromptDebugBudgetNote(block) {
  logger.warn("[PromptManager] important user layer removed by budget — check PROMPT_MAX_SYSTEM_CHARS", {
    layer: block.level,
    originalChars: block.content.length,
    reason: "prompt_budget_dropped",
  });
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

function systemPromptHash(systemPrompt) {
  if (!systemPrompt) return "";
  return crypto.createHash("sha256").update(systemPrompt).digest("hex").slice(0, 16);
}

function resolveUserPromptState(normalizedMessage, usersRegistry) {
  const threadId = normalizedMessage?.threadId;
  const isGroup = !!normalizedMessage?.isGroup;
  const senderId = normalizedMessage?.senderId ? String(normalizedMessage.senderId) : "";
  const base = {
    senderId: senderId || null,
    threadId: threadId ?? null,
    isGroup,
    userPromptEnabled: env.PROMPT_USER_ENABLED,
    userRegistryMatched: false,
    userPromptApplied: false,
    userPromptSkippedReason: null,
    userPromptFile: null,
    userPromptChars: 0,
  };

  if (!env.PROMPT_USER_ENABLED) {
    return { ...base, userPromptSkippedReason: "prompt_user_disabled" };
  }
  if (!senderId) {
    return { ...base, userPromptSkippedReason: "no_sender_id" };
  }

  const userEntry = usersRegistry[senderId] || null;
  if (!userEntry) {
    return { ...base, userPromptSkippedReason: "no_user_registry_entry" };
  }

  base.userRegistryMatched = true;
  const userFile = userEntry.promptFile || `users/${senderId}.md`;

  if (userEntry.enabled === false) {
    return { ...base, userPromptFile: userFile, userPromptSkippedReason: "user_entry_disabled" };
  }
  if (isGroup && userEntry.applyInGroups === false) {
    return { ...base, userPromptFile: userFile, userPromptSkippedReason: "disabled_in_groups" };
  }
  if (!isGroup && userEntry.applyInPrivate === false) {
    return { ...base, userPromptFile: userFile, userPromptSkippedReason: "disabled_in_private" };
  }

  return { ...base, userPromptFile: userFile, userEntry, userPromptSkippedReason: null };
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
  let userPromptDebug = resolveUserPromptState(
    normalizedMessage,
    env.PROMPT_USER_ENABLED ? await loadUserPromptRegistry() : {}
  );
  const groupPromptDebug = {
    threadId: threadId ?? null,
    isGroup,
    groupRegistryMatched: !!(isGroup && threadId && groupEntry),
    groupPromptApplied: false,
    groupPromptSkippedReason: null,
    groupPromptFile: null,
  };

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

  // Debug trackers for new optional layers (Phase 1+5)
  const layerDebug = {
    databaseSchema: {
      applied: false,
      skippedReason: null,
      file: null,
      chars: 0,
      enabled: !!groupEntry?.databaseSchemaFile || !!(groupEntry && groupEntry.databaseSchemaFile === "" ? false : !!groupEntry?.databaseSchemaFile),
    },
    businessFlow: {
      applied: false,
      skippedReason: null,
      file: null,
      chars: 0,
    },
    toolInstruction: {
      applied: false,
      skippedReason: null,
      tools: [],
      chars: 0,
    },
  };

  const blocks = [];
  if (core) blocks.push({ key: "core", level: "core", content: core, priority: 100 });
  if (identity) blocks.push({ key: "identity", level: "identity", content: identity, priority: 50 });
  if (capability) blocks.push({ key: "capability", level: "capability", content: capability, priority: 100 });
  if (domain) blocks.push({ key: "domain", level: "domain", content: domain, priority: 25 });

  if (isGroup && threadId) {
    if (!groupEntry) {
      groupPromptDebug.groupPromptSkippedReason = "no_group_registry_entry";
    } else {
      const groupFile = groupEntry.promptFile || `groups/${threadId}.md`;
      groupPromptDebug.groupPromptFile = groupFile;
      const groupContent = await loadLayer(groupFile, "group", parts, { silent: true });
      if (!groupContent) {
        groupPromptDebug.groupPromptSkippedReason = "prompt_file_missing";
        logger.warn("[PromptManager] group prompt missing", threadId, groupFile);
      } else {
        groupPromptDebug.groupPromptApplied = true;
        blocks.push({ key: "group", level: "group", content: groupContent, priority: 22 });
      }
    }
  } else if (!isGroup) {
    groupPromptDebug.groupPromptSkippedReason = "not_group_chat";
  }

  // Phase 1: optional layers per group (DB schema, business flow)
  if (groupEntry) {
    const dbFile = typeof groupEntry.databaseSchemaFile === "string"
      ? groupEntry.databaseSchemaFile
      : null;
    if (dbFile) {
      layerDebug.databaseSchema.file = dbFile;
      const dbContent = await loadLayer(dbFile, "databaseSchema", parts, { silent: true });
      if (dbContent) {
        layerDebug.databaseSchema.applied = true;
        layerDebug.databaseSchema.chars = dbContent.length;
        blocks.push({ key: "databaseSchema", level: "databaseSchema", content: dbContent, priority: 20 });
      } else {
        layerDebug.databaseSchema.skippedReason = "prompt_file_missing";
      }
    } else {
      layerDebug.databaseSchema.skippedReason = "no_database_schema_file";
    }

    const bfFile = typeof groupEntry.businessFlowFile === "string"
      ? groupEntry.businessFlowFile
      : null;
    if (bfFile) {
      layerDebug.businessFlow.file = bfFile;
      const bfContent = await loadLayer(bfFile, "businessFlow", parts, { silent: true });
      if (bfContent) {
        layerDebug.businessFlow.applied = true;
        layerDebug.businessFlow.chars = bfContent.length;
        blocks.push({ key: "businessFlow", level: "businessFlow", content: bfContent, priority: 19 });
      } else {
        layerDebug.businessFlow.skippedReason = "prompt_file_missing";
      }
    } else {
      layerDebug.businessFlow.skippedReason = "no_business_flow_file";
    }
  } else {
    layerDebug.databaseSchema.skippedReason = "no_group_registry_entry";
    layerDebug.businessFlow.skippedReason = "no_group_registry_entry";
  }

  // Phase 5: dynamic tool instruction based on registry + permission
  tryLoadToolModules();
  if (toolRegistryMod && toolPermissionMod) {
    try {
      const allowed = toolPermissionMod.listAllowedToolsForContext({
        isGroup,
        threadId,
        senderId: normalizedMessage?.senderId,
      });
      const allList = toolRegistryMod.listTools ? toolRegistryMod.listTools() : [];
      const visible = allList.filter((t) => allowed.includes(t.name));
      if (visible.length > 0) {
        const lines = [
          "# Available Backend Tools",
          "",
          "The following backend tools are available in this context:",
          "",
        ];
        for (const t of visible) {
          lines.push(`- ${t.name}: ${t.description || "(no description)"}`);
        }
        lines.push("");
        lines.push("Unavailable tools must not be mentioned or invented.");
        const content = lines.join("\n");
        layerDebug.toolInstruction.applied = true;
        layerDebug.toolInstruction.tools = visible.map((t) => t.name);
        layerDebug.toolInstruction.chars = content.length;
        blocks.push({
          key: "toolInstruction",
          level: "toolInstruction",
          content,
          priority: 21,
        });
        parts.push({
          level: "toolInstruction",
          source: "tool-registry",
          enabled: true,
          chars: content.length,
        });
      } else {
        layerDebug.toolInstruction.skippedReason = "no_allowed_tools";
        parts.push({
          level: "toolInstruction",
          source: "tool-registry",
          enabled: false,
          chars: 0,
        });
      }
    } catch (e) {
      layerDebug.toolInstruction.skippedReason = "tool_module_error";
      logger.warn("[PromptManager] tool instruction failed", e.message);
    }
  } else {
    layerDebug.toolInstruction.skippedReason = "tool_module_unavailable";
  }

  if (!userPromptDebug.userPromptSkippedReason && userPromptDebug.userEntry) {
    userEntry = userPromptDebug.userEntry;
    const userFile = userPromptDebug.userPromptFile;
    try {
      const userContent = await loadLayer(userFile, "user", parts, { silent: true });
      if (!userContent) {
        userPromptDebug.userPromptSkippedReason = "prompt_file_missing";
        parts.push({
          level: "user",
          source: `data/prompts/${userFile.replace(/\\/g, "/")}`,
          enabled: false,
          chars: 0,
        });
      } else {
        userPromptDebug.userPromptApplied = true;
        userPromptDebug.userPromptChars = userContent.length;
        const userPriority = Number(userEntry.priority) || 18;
        blocks.push({
          key: "user",
          level: "user",
          content: userContent,
          priority: userPriority < 100 ? userPriority : 18,
          important: true,
        });
      }
    } catch (e) {
      userPromptDebug.userPromptSkippedReason = "prompt_load_error";
      logger.warn("[PromptManager] user prompt load error", userPromptDebug.senderId, e.message);
      parts.push({ level: "user", source: "error", enabled: false, chars: 0 });
    }
  } else {
    const src = userPromptDebug.userPromptSkippedReason || "placeholder";
    parts.push({ level: "user", source: src, enabled: false, chars: 0 });
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

  const { systemPrompt, truncatedLayers, droppedLayers } = assembleSystemPromptWithBudget(
    blocks,
    env.PROMPT_MAX_SYSTEM_CHARS
  );
  if (droppedLayers.includes("user")) {
    userPromptDebug.userPromptApplied = false;
    userPromptDebug.userPromptSkippedReason = "prompt_budget_dropped";
  } else if (
    truncatedLayers.some((t) => t.layer === "user") &&
    userPromptDebug.userPromptApplied
  ) {
    const ut = truncatedLayers.find((t) => t.layer === "user");
    if (ut) userPromptDebug.userPromptChars = ut.truncatedChars;
  }
  delete userPromptDebug.userEntry;
  return {
    systemPrompt,
    groupEntry,
    domainKey,
    userEntry,
    userPromptDebug,
    groupPromptDebug,
    truncatedLayers,
    droppedLayers,
    layerDebug,
  };
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
  const {
    systemPrompt,
    groupEntry,
    domainKey,
    userEntry,
    userPromptDebug,
    groupPromptDebug,
    layerDebug,
  } = await composeSystemLayers(normalizedMessage, runtimePrompt, parts);

  const versionHash = hashPromptContext(parts, {
    mode: "layered",
    threadId,
    isGroup,
    senderId: normalizedMessage.senderId,
    model: env.OPENAI_MODEL,
  });

  const totalChars = systemPrompt.length;
  const hasGroupPrompt = !!groupPromptDebug?.groupPromptApplied;
  const groupPromptEnabled = hasGroupPrompt;
  const hasUserPrompt = !!userPromptDebug?.userPromptApplied;
  const userPromptEnabled = env.PROMPT_USER_ENABLED;
  const sysHash = systemPromptHash(systemPrompt);

  logPromptDebug({
    threadId,
    isGroup,
    threadType: normalizedMessage.threadType,
    senderId: normalizedMessage.senderId,
    parts,
    versionHash,
    totalChars,
    systemPromptChars: systemPrompt.length,
    systemPromptHash: sysHash,
    hasGroupPrompt,
    hasUserPrompt,
    domain: domainKey,
    groupPromptEnabled,
    userPromptEnabled,
    userPromptDebug,
    groupPromptDebug,
    layerDebug,
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
      userPromptDebug: userPromptDebug || null,
      groupPromptDebug: groupPromptDebug || null,
      layerDebug: layerDebug || null,
      systemPromptChars: systemPrompt.length,
      systemPromptHash: sysHash,
    },
  };
}

function logPromptDebug(ctx) {
  if (!env.PROMPT_DEBUG) return;
  const ud = ctx.userPromptDebug || {};
  const entry = {
    threadId: ctx.threadId,
    senderId: ctx.senderId,
    isGroup: ctx.isGroup,
    threadType: ctx.threadType,
    versionHash: ctx.versionHash,
    systemPromptChars: ctx.systemPromptChars,
    systemPromptHash: ctx.systemPromptHash,
    totalChars: ctx.totalChars,
    hasGroupPrompt: ctx.hasGroupPrompt,
    hasUserPrompt: ctx.hasUserPrompt,
    domain: ctx.domain,
    groupPrompt: ctx.groupPromptDebug,
    userPrompt: {
      enabled: ud.userPromptEnabled,
      registryMatched: ud.userRegistryMatched,
      applied: ud.userPromptApplied,
      skippedReason: ud.userPromptSkippedReason,
      file: ud.userPromptFile,
      chars: ud.userPromptChars,
    },
    layers: ctx.layerDebug || null,
    parts: ctx.parts?.map((p) => ({
      level: p.level,
      source: p.source,
      enabled: p.enabled,
      chars: p.chars,
    })),
  };
  logger.debug("[PromptManager] built prompt", entry);
  if (env.PROMPT_DEBUG_FULL && ctx.systemPrompt) {
    const safe = ctx.systemPrompt.slice(0, 12000);
    logger.debug("[PromptManager] full system prompt (capped)", safe);
  }
}

function formatPromptDebugReply(promptContext) {
  const meta = promptContext.meta || {};
  const msg = promptContext.userPayload?.message || {};
  const ud = meta.userPromptDebug || {};
  const gd = meta.groupPromptDebug || {};
  const ld = meta.layerDebug || {};
  const groupStatus = gd.groupPromptApplied
    ? "applied"
    : `skipped (${gd.groupPromptSkippedReason || "n/a"})`;
  const userStatus = ud.userPromptApplied
    ? "applied"
    : `skipped (${ud.userPromptSkippedReason || "n/a"})`;
  const userKey = ud.senderId ?? msg.senderId ?? "n/a";
  const userFile = ud.userPromptFile ? `users/${String(userKey)}.md`.replace(/users\/users\//, "users/") : ud.userPromptFile || (userKey !== "n/a" ? `users/${userKey}.md` : "n/a");

  function layerLine(name, layer) {
    if (!layer) return `- ${name}: n/a`;
    const status = layer.applied
      ? `applied (${layer.chars} chars)`
      : `skipped (${layer.skippedReason || "n/a"})`;
    const file = layer.file ? ` [${layer.file}]` : "";
    const tools = layer.tools && layer.tools.length
      ? ` tools=[${layer.tools.join(",")}]`
      : "";
    return `- ${name}: ${status}${file}${tools}`;
  }

  const lines = [
    "Prompt debug:",
    `- threadId: ${msg.threadId ?? "n/a"}`,
    `- senderId: ${msg.senderId ?? "n/a"}`,
    `- isGroup: ${!!msg.isGroup}`,
    `- threadType: ${msg.threadType ?? (msg.isGroup ? "group" : "user")}`,
    `- domain: ${meta.domain ?? "n/a"}`,
    `- groupPrompt: ${groupStatus}`,
    `- userPrompt: ${userStatus}`,
    `- userPromptKey: ${userKey}`,
    `- userPromptFile: ${ud.userPromptFile || userFile}`,
    layerLine("databaseSchema", ld.databaseSchema),
    layerLine("businessFlow", ld.businessFlow),
    layerLine("toolInstruction", ld.toolInstruction),
    `- systemPromptChars: ${meta.systemPromptChars ?? promptContext.systemPrompt?.length ?? 0}`,
    `- systemPromptHash: ${meta.systemPromptHash ?? "n/a"}`,
    `- versionHash: ${promptContext.versionHash}`,
    "- parts:",
  ];
  let idx = 0;
  (promptContext.parts || []).forEach((p) => {
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
  assembleSystemPromptWithBudget,
  resolveUserPromptState,
};