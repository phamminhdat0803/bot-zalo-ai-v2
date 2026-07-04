require("dotenv").config();

const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5.5-mini",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || undefined,
  OPENAI_TIMEOUT_MS: parseInt(process.env.OPENAI_TIMEOUT_MS || "30000", 10),

  ZALO_ALLOWED_GROUP_IDS: (process.env.ZALO_ALLOWED_GROUP_IDS || "").split(",").map(s => s.trim()).filter(Boolean),
  ZALO_REPLY_ONLY_WHEN_MENTIONED: (process.env.ZALO_REPLY_ONLY_WHEN_MENTIONED ?? "true") !== "false",
  ZALO_DEBUG_MESSAGE: (process.env.ZALO_DEBUG_MESSAGE ?? "false") === "true",

  ZALO_TYPING_ENABLED: (process.env.ZALO_TYPING_ENABLED ?? "true") !== "false",
  ZALO_TYPING_DELAY_MS: parseInt(process.env.ZALO_TYPING_DELAY_MS || "300", 10),
  ZALO_TYPING_INTERVAL_MS: parseInt(process.env.ZALO_TYPING_INTERVAL_MS || "5000", 10),
  ZALO_TYPING_MAX_MS: parseInt(process.env.ZALO_TYPING_MAX_MS || "60000", 10),
  ZALO_TYPING_LOG: (process.env.ZALO_TYPING_LOG ?? "false") === "true",

  AI_ACTION_MODE: (process.env.AI_ACTION_MODE ?? "true") !== "false",
  AI_MAX_OUTPUT_TOKENS: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || "800", 10),

  CONVERSATION_STORAGE_ENABLED: (process.env.CONVERSATION_STORAGE_ENABLED ?? "true") !== "false",
  CONVERSATION_STORAGE_DIR: process.env.CONVERSATION_STORAGE_DIR || "./data/conversations",
  CONVERSATION_STORE_RAW: (process.env.CONVERSATION_STORE_RAW ?? "false") === "true",
  CONVERSATION_RECENT_LIMIT: parseInt(process.env.CONVERSATION_RECENT_LIMIT || "30", 10),
  CONVERSATION_SAVE_NON_WHITELIST: (process.env.CONVERSATION_SAVE_NON_WHITELIST ?? "false") === "true",
  CONVERSATION_RETENTION_DAYS: parseInt(process.env.CONVERSATION_RETENTION_DAYS || "30", 10),

  PROMPT_USE_FILES: (process.env.PROMPT_USE_FILES ?? "true") !== "false",
  PROMPT_SPLIT_SYSTEM: (process.env.PROMPT_SPLIT_SYSTEM ?? "true") !== "false",
  PROMPT_CACHE_ENABLED: (process.env.PROMPT_CACHE_ENABLED ?? "true") !== "false",
  PROMPT_DEBUG: (process.env.PROMPT_DEBUG ?? "false") === "true",
  PROMPT_DEBUG_FULL: (process.env.PROMPT_DEBUG_FULL ?? "false") === "true",
  PROMPT_ADMIN_ENABLED: (process.env.PROMPT_ADMIN_ENABLED ?? "false") === "true",
  ZALO_ADMIN_USER_IDS: (process.env.ZALO_ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  PROMPT_MAX_SYSTEM_CHARS: parseInt(process.env.PROMPT_MAX_SYSTEM_CHARS || "24000", 10),
  PROMPT_MAX_RUNTIME_CHARS: parseInt(process.env.PROMPT_MAX_RUNTIME_CHARS || "2000", 10),

  PROMPT_USER_ENABLED: (process.env.PROMPT_USER_ENABLED ?? "true") !== "false",
};

function validateEnv() {
  if (!env.OPENAI_API_KEY) {
    console.warn("[ENV] OPENAI_API_KEY missing - AI disabled");
  }
}

module.exports = { env, validateEnv };