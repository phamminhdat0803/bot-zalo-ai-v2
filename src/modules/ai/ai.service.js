const { getOpenAIClient } = require("./openai.client");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { buildPromptContext } = require("./prompt-manager");

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