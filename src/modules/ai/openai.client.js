const OpenAI = require("openai");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");

let client = null;

function getOpenAIClient() {
  if (!env.OPENAI_API_KEY) {
    logger.warn("[OpenAI] OPENAI_API_KEY missing");
    return null;
  }
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
      timeout: env.OPENAI_TIMEOUT_MS,
    });
  }
  return client;
}

module.exports = { getOpenAIClient };