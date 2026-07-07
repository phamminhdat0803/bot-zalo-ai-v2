const { getOpenAIClient } = require("./openai.client");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { buildPromptContext } = require("./prompt-manager");

// Boot tool registry once so permission/prompt layers can introspect it.
// MySQL tool is OFF by default (env MYSQL_TOOL_ENABLED=false), so behaviour
// is identical to pre-refactor when MySQL is not configured.
try {
  if (env.TOOL_REGISTRY_ENABLED) {
    // eslint-disable-next-line global-require
    require("../tools/tool-registry").boot();

    // Warm permission registry cache so the very first inbound request does
    // not pay the cold-start cost (and does not fall back to default legacy).
    // Fire-and-forget: lazy-load inside isToolAllowedForContext() is the
    // safety net for any failure here.
    // eslint-disable-next-line global-require
    const permissionMod = require("../permissions/tool-permission");
    permissionMod
      .getRegistries({ forceReload: false })
      .then(() =>
        logger.info("[AI] permission registry warmed")
      )
      .catch((e) =>
        logger.warn("[AI] permission registry warm failed", e.message)
      );
  }
} catch (e) {
  logger.warn("[AI] tool registry boot failed", e.message);
}

function extractJsonObject(text) {
  const trimmed = (text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function buildOpenAIMessages(promptContext) {
  const useSplit = env.PROMPT_USE_FILES && env.PROMPT_SPLIT_SYSTEM;
  if (!useSplit) {
    const legacyContent =
      promptContext.legacySingleUserPrompt || promptContext.systemPrompt;
    return [{ role: "user", content: legacyContent }];
  }
  return [
    { role: "system", content: promptContext.systemPrompt },
    { role: "user", content: JSON.stringify(promptContext.userPayload, null, 2) },
  ];
}

async function planActions(normalizedMessage) {
  const client = getOpenAIClient();
  if (!client) {
    return { actions: [{ type: "noop", reason: "no_openai_key", params: {} }] };
  }

  const promptContext = await buildPromptContext({
    normalizedMessage,
    previousMessages: normalizedMessage.previousMessages,
  });
  logger.info('[AI_PROMPT_RUNTIME]', {
    threadId: normalizedMessage?.threadId,
    senderId: normalizedMessage?.senderId,
    isGroup: normalizedMessage?.isGroup,
    toolInstruction: promptContext?.meta?.layerDebug?.toolInstruction,
    systemPromptIncludesMysql: String(promptContext?.systemPrompt || '').includes('mysql_readonly_query')
  });

  const messages = buildOpenAIMessages(promptContext);

  const start = Date.now();

  try {
    const res = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      max_tokens: env.AI_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    });

    const latency = Date.now() - start;
    logger.info("[AI] latency_ms", latency);

    const text = res.choices[0]?.message?.content?.trim() || "";
    const parsed = extractJsonObject(text);
    if (!parsed) throw new Error("no_json");
    logger.info("[AI_ACTIONS_PARSED]", {
      threadId: normalizedMessage?.threadId,
      senderId: normalizedMessage?.senderId,
      actions: Array.isArray(parsed.actions) ? parsed.actions.map((a) => a?.type) : [],
    });

    return parsed;
  } catch (e) {
    logger.error("[AI] plan failed", e.message);
    return {
      actions: [{
        type: "send_message",
        reason: "fallback_error",
        params: { threadId: "current", text: "Xin lỗi, có lỗi xảy ra." }
      }]
    };
  }
}

module.exports = { planActions, buildOpenAIMessages, extractJsonObject };