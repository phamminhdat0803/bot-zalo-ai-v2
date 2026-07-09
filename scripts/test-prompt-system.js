require("dotenv").config();
const fs = require("fs");
const path = require("path");

function reloadModules() {
  Object.keys(require.cache)
    .filter((k) => k.includes("bot-zalo-ai-v2") && (k.includes("env") || k.includes("prompt") || k.includes("ai.service")))
    .forEach((k) => delete require.cache[k]);
}

async function run() {
  const { buildPromptContext } = require("../src/modules/ai/prompt-manager");
  const { loadPromptFile, clearPromptCache, PROMPTS_ROOT } = require("../src/modules/ai/prompt-loader");
  const { buildOpenAIMessages } = require("../src/modules/ai/ai.service");

  const baseMsg = {
    platform: "zalo",
    threadId: "unknown-group-999",
    threadType: "group",
    isGroup: true,
    text: "hi",
    senderId: "u1",
    raw: { huge: "x".repeat(5000) },
  };

  const c1 = await buildPromptContext({
    normalizedMessage: baseMsg,
    previousMessages: [{ messageId: "1", text: "old" }],
  });
  console.log("CASE1 no group part:", !c1.parts.some((p) => p.level === "group" && p.chars > 0));

  const c2 = await buildPromptContext({
    normalizedMessage: { ...baseMsg, threadId: "2935803304472747987", raw: undefined },
    previousMessages: [{ messageId: "1", text: "old" }],
  });
  console.log("CASE2 has group part:", c2.parts.some((p) => p.level === "group" && p.chars > 0));
  console.log("CASE2 hash diff:", c1.versionHash !== c2.versionHash);

  console.log("CASE3 missing file:", (await loadPromptFile("groups/does-not-exist-xyz.md")) === "");

  const c5 = await buildPromptContext({
    normalizedMessage: baseMsg,
    previousMessages: [{ messageId: "x" }],
  });
  console.log(
    "CASE5 userPayload:",
    !!c5.userPayload.message,
    !!c5.userPayload.previousMessages,
    !c5.systemPrompt.includes('"previousMessages"'),
    !("raw" in c5.userPayload.message),
    c5.userPayload.message.hasRaw === true
  );

  const trav1 = await loadPromptFile("../.env");
  const trav2 = await loadPromptFile("/etc/passwd");
  console.log("CASE traversal:", trav1 === "" && trav2 === "");

  process.env.PROMPT_USE_FILES = "false";
  reloadModules();
  const { buildPromptContext: bpcL } = require("../src/modules/ai/prompt-manager");
  const { buildOpenAIMessages: bomL } = require("../src/modules/ai/ai.service");
  const cL = await bpcL({ normalizedMessage: baseMsg, previousMessages: [] });
  const mL = bomL(cL);
  console.log("ROLLBACK USE_FILES=false:", mL.length === 1 && mL[0].role === "user" && (cL.legacySingleUserPrompt || "").length > 50);

  process.env.PROMPT_USE_FILES = "true";
  process.env.PROMPT_SPLIT_SYSTEM = "false";
  reloadModules();
  const { buildPromptContext: bpcS } = require("../src/modules/ai/prompt-manager");
  const { buildOpenAIMessages: bomS } = require("../src/modules/ai/ai.service");
  const mS = bomS(await bpcS({ normalizedMessage: baseMsg, previousMessages: [] }));
  console.log("ROLLBACK SPLIT=false:", mS.length === 1 && (mS[0].content || "").includes("Normalized message"));

  process.env.PROMPT_SPLIT_SYSTEM = "true";
  reloadModules();
  const { buildOpenAIMessages: bomOn } = require("../src/modules/ai/ai.service");
  const { buildPromptContext: bpcOn } = require("../src/modules/ai/prompt-manager");
  const mOn = bomOn(await bpcOn({ normalizedMessage: baseMsg, previousMessages: [] }));
  console.log("SPLIT=true:", mOn.length === 2 && mOn[0].role === "system" && mOn[1].role === "user");

  const groupsPath = path.join(PROMPTS_ROOT, "groups.json");
  const backup = fs.readFileSync(groupsPath, "utf8");
  try {
    fs.writeFileSync(groupsPath, "{ not-json");
    clearPromptCache();
    reloadModules();
    let failedFast = false;
    try {
      await require("../src/modules/ai/prompt-loader").loadPromptRegistry();
    } catch (e) {
      failedFast = /groups\.json invalid JSON/.test(e.message);
    }
    console.log("CASE invalid groups.json:", failedFast);
  } finally {
    fs.writeFileSync(groupsPath, backup);
    clearPromptCache();
    reloadModules();
  }

  const backup2 = fs.readFileSync(groupsPath, "utf8");
  try {
    const parsed = JSON.parse(backup2);
    parsed["test-disabled-group"] = { enabled: false, promptFile: "groups/test-disabled.md" };
    fs.writeFileSync(groupsPath, JSON.stringify(parsed, null, 2));
    clearPromptCache();
    reloadModules();
    const cDis = await require("../src/modules/ai/prompt-manager").buildPromptContext({
      normalizedMessage: { ...baseMsg, threadId: "test-disabled-group" },
      previousMessages: [],
    });
    console.log("CASE group disabled:", !cDis.parts.some((p) => p.level === "group" && p.chars > 0));
  } finally {
    fs.writeFileSync(groupsPath, backup2);
    clearPromptCache();
  }

  clearPromptCache();
  reloadModules();
  const actionPlanner = await require("../src/modules/ai/prompt-loader").loadPromptFile("capabilities/action-planner.md");
  console.log(
    "PROMPT no CRM hardcode:",
    !/\bcustomers\b|\breceipts\b|\bproducts\b/i.test(actionPlanner)
  );
  const glpiPrompt = await require("../src/modules/ai/prompt-manager").buildPromptContext({
    normalizedMessage: { ...baseMsg, threadId: "6345678949379162493", text: "query users" },
    previousMessages: [],
  });
  console.log(
    "PROMPT GLPI aliases:",
    glpiPrompt.systemPrompt.includes("users/user -> glpi_users") &&
      glpiPrompt.systemPrompt.includes("tickets/ticket -> glpi_tickets")
  );

  process.env.PROMPT_USE_FILES = "true";
  process.env.PROMPT_SPLIT_SYSTEM = "true";
  process.env.PROMPT_USER_ENABLED = "true";
  reloadModules();

  const usersPath = path.join(PROMPTS_ROOT, "users.json");
  const usersBackup = fs.readFileSync(usersPath, "utf8");
  const userRegistry = {
    "test-user-1": {
      enabled: true,
      name: "Test User",
      promptFile: "users/test-user-1.md",
      applyInGroups: true,
      applyInPrivate: true,
    },
    "test-user-disabled": {
      enabled: false,
      promptFile: "users/test-user-disabled.md",
    },
    "test-user-private-only": {
      enabled: true,
      promptFile: "users/test-user-private-only.md",
      applyInGroups: false,
      applyInPrivate: true,
    },
    "test-user-group-only": {
      enabled: true,
      promptFile: "users/test-user-group-only.md",
      applyInGroups: true,
      applyInPrivate: false,
    },
  };

  try {
    fs.writeFileSync(usersPath, JSON.stringify(userRegistry, null, 2));
    clearPromptCache();
    reloadModules();
    const { buildPromptContext: bpcUser } = require("../src/modules/ai/prompt-manager");

    const cNoUser = await bpcUser({
      normalizedMessage: { ...baseMsg, senderId: "not-in-registry" },
      previousMessages: [],
    });
    console.log("USER1 no registry:", !cNoUser.parts.some((p) => p.level === "user" && p.chars > 0));

    const cUser = await bpcUser({
      normalizedMessage: { ...baseMsg, senderId: "test-user-1", isGroup: false, threadType: "user" },
      previousMessages: [],
    });
    const cNoUser2 = await bpcUser({
      normalizedMessage: { ...baseMsg, senderId: "unknown-xyz" },
      previousMessages: [],
    });
    console.log(
      "USER2 has user part:",
      cUser.parts.some((p) => p.level === "user" && p.chars > 0),
      "hash diff:",
      cUser.versionHash !== cNoUser2.versionHash
    );

    const cDisUser = await bpcUser({
      normalizedMessage: { ...baseMsg, senderId: "test-user-disabled" },
      previousMessages: [],
    });
    console.log("USER3 disabled:", !cDisUser.parts.some((p) => p.level === "user" && p.chars > 0));

    const cPrivOnlyGroup = await bpcUser({
      normalizedMessage: {
        ...baseMsg,
        isGroup: true,
        senderId: "test-user-private-only",
      },
      previousMessages: [],
    });
    console.log(
      "USER4 applyInGroups=false:",
      !cPrivOnlyGroup.parts.some((p) => p.level === "user" && p.chars > 0)
    );

    const cGrpOnlyPrivate = await bpcUser({
      normalizedMessage: {
        ...baseMsg,
        isGroup: false,
        threadType: "user",
        senderId: "test-user-group-only",
      },
      previousMessages: [],
    });
    console.log(
      "USER5 applyInPrivate=false:",
      !cGrpOnlyPrivate.parts.some((p) => p.level === "user" && p.chars > 0)
    );

    const cBoth = await bpcUser({
      normalizedMessage: {
        ...baseMsg,
        threadId: "2935803304472747987",
        senderId: "test-user-1",
        isGroup: true,
      },
      previousMessages: [],
    });
    const hasGroup = cBoth.parts.some((p) => p.level === "group" && p.chars > 0);
    const hasUser = cBoth.parts.some((p) => p.level === "user" && p.chars > 0);
    const hasCore = cBoth.parts.some((p) => p.level === "core" && p.chars > 0);
    const hasCap = cBoth.parts.some((p) => p.level === "capability" && p.chars > 0);
    const userIdx = cBoth.parts.findIndex((p) => p.level === "user" && p.chars > 0);
    const groupIdx = cBoth.parts.findIndex((p) => p.level === "group" && p.chars > 0);
    console.log(
      "USER6 group+user:",
      hasGroup && hasUser && hasCore && hasCap,
      "parts order group before user:",
      groupIdx >= 0 && userIdx >= 0 && groupIdx < userIdx
    );

    process.env.PROMPT_USER_ENABLED = "false";
    reloadModules();
    const cOff = await require("../src/modules/ai/prompt-manager").buildPromptContext({
      normalizedMessage: { ...baseMsg, senderId: "test-user-1" },
      previousMessages: [],
    });
    console.log("USER7 PROMPT_USER_ENABLED=false:", !cOff.parts.some((p) => p.level === "user" && p.chars > 0));
    process.env.PROMPT_USER_ENABLED = "true";

    const cGrpUserB = await bpcUser({
      normalizedMessage: {
        threadId: "group_1",
        senderId: "user_b",
        isGroup: true,
        threadType: "group",
        text: "hi",
      },
      previousMessages: [],
    });
    console.log(
      "SPEC3 user_b skip:",
      cGrpUserB.meta.userPromptDebug?.userPromptSkippedReason === "no_user_registry_entry"
    );

    fs.writeFileSync(
      usersPath,
      JSON.stringify(
        {
          user_a: {
            enabled: true,
            promptFile: "users/test-user-1.md",
            applyInGroups: true,
            applyInPrivate: true,
          },
        },
        null,
        2
      )
    );
    clearPromptCache();
    reloadModules();
    const { buildPromptContext: bpcSpec } = require("../src/modules/ai/prompt-manager");

    const cPrivA = await bpcSpec({
      normalizedMessage: {
        threadId: "user_a",
        senderId: "user_a",
        isGroup: false,
        threadType: "user",
        text: "hi",
      },
      previousMessages: [],
    });
    console.log(
      "SPEC1 private user_a:",
      cPrivA.meta.userPromptDebug?.userPromptApplied === true,
      cPrivA.systemPrompt.includes("ngắn gọn")
    );

    const cGrpA = await bpcSpec({
      normalizedMessage: {
        threadId: "group_1",
        senderId: "user_a",
        isGroup: true,
        threadType: "group",
        text: "hi",
      },
      previousMessages: [],
    });
    console.log(
      "SPEC2 group user_a:",
      cGrpA.meta.userPromptDebug?.userPromptApplied === true,
      cGrpA.meta.userPromptDebug?.senderId === "user_a"
    );

    process.env.PROMPT_MAX_SYSTEM_CHARS = "800";
    reloadModules();
    const { buildPromptContext: bpcBudget } = require("../src/modules/ai/prompt-manager");
    const cBudget = await bpcBudget({
      normalizedMessage: {
        threadId: "user_a",
        senderId: "user_a",
        isGroup: false,
        threadType: "user",
        text: "hi",
      },
      previousMessages: [],
    });
    const ud = cBudget.meta.userPromptDebug || {};
    console.log(
      "SPEC6 budget:",
      ud.userRegistryMatched === true,
      ud.userPromptApplied === true || ud.userPromptSkippedReason === "prompt_budget_dropped"
    );
    process.env.PROMPT_MAX_SYSTEM_CHARS = "24000";
  } finally {
    fs.writeFileSync(usersPath, usersBackup);
    clearPromptCache();
    reloadModules();
  }

  const { resolveSenderId, parseZaloMessage } = require("../src/modules/zalo/zalo.parser");
  console.log(
    "SENDER authorId:",
    parseZaloMessage({ type: 1, threadId: "group_1", data: { authorId: "user_a", content: "hi" } }, null)
      .senderId === "user_a"
  );
  console.log(
    "SENDER group no sender:",
    parseZaloMessage({ type: 1, threadId: "group_1", data: { content: "x" } }, null).senderId === undefined
  );
  console.log(
    "SENDER private fallback:",
    resolveSenderId({}, {}, { isGroup: false, threadId: "user_a" }) === "user_a"
  );

  console.log("DONE");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});