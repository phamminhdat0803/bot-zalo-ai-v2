#!/usr/bin/env node
/**
 * scripts/test-prompt-layers.js
 *
 * Validates Phase 1 + Phase 5 wiring of optional prompt layers.
 * Runs against the real prompt-manager; no DB required.
 *
 * Run: node scripts/test-prompt-layers.js
 */

const fs = require("fs/promises");
const path = require("path");

async function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    return false;
  }
  console.log("PASS:", msg);
  return true;
}

async function run() {
  // Ensure required deps loaded
  // eslint-disable-next-line global-require
  const { buildPromptContext } = require("../src/modules/ai/prompt-manager");
  // eslint-disable-next-line global-require
  require("../src/modules/tools/tool-registry").boot();

  // Test 1: group without databaseSchemaFile must not crash and skip layer.
  // We use the existing target group but strip databaseSchemaFile/businessFlowFile
  // to verify the no_<x>_file skip path explicitly.
  const groupsPath = path.resolve("data/prompts/groups.json");
  const original = await fs.readFile(groupsPath, "utf8");
  const backup = original;
  const parsed = JSON.parse(original);
  const targetKey = "2935803304472747987";
  if (!parsed[targetKey]) parsed[targetKey] = { enabled: true };
  const savedDb = parsed[targetKey].databaseSchemaFile;
  const savedBf = parsed[targetKey].businessFlowFile;
  delete parsed[targetKey].databaseSchemaFile;
  delete parsed[targetKey].businessFlowFile;
  await fs.writeFile(groupsPath, JSON.stringify(parsed, null, 2));

  // eslint-disable-next-line global-require
  const { clearPermissionCache } = require("../src/modules/permissions/tool-permission");
  clearPermissionCache();
  // eslint-disable-next-line global-require
  const { clearPromptCache } = require("../src/modules/ai/prompt-loader");
  clearPromptCache();

  try {
    const ctx1 = await buildPromptContext({
      normalizedMessage: {
        threadId: targetKey,
        senderId: "u1",
        isGroup: true,
        threadType: "group",
      },
    });
    await assert(
      ctx1.meta.layerDebug.databaseSchema.skippedReason === "no_database_schema_file",
      "[1a] group without databaseSchemaFile -> skipped (no_database_schema_file)"
    );
    await assert(
      ctx1.meta.layerDebug.businessFlow.skippedReason === "no_business_flow_file",
      "[1b] group without businessFlowFile -> skipped (no_business_flow_file)"
    );
  } finally {
    // restore db/bf for the next test set
    if (savedDb !== undefined) parsed[targetKey].databaseSchemaFile = savedDb;
    if (savedBf !== undefined) parsed[targetKey].businessFlowFile = savedBf;
    await fs.writeFile(groupsPath, JSON.stringify(parsed, null, 2));
    clearPermissionCache();
    clearPromptCache();
  }

  // Test 2: temporarily inject databaseSchemaFile via groups.json
  // (re-read in case [1] mutated the file)
  const groupsPath2 = path.resolve("data/prompts/groups.json");
  const original2 = await fs.readFile(groupsPath2, "utf8");
  const backup2 = original2;
  const parsed2 = JSON.parse(original2);
  const targetKey2 = "2935803304472747987";
  // ensure key exists
  if (!parsed2[targetKey2]) parsed2[targetKey2] = { enabled: true };
  parsed2[targetKey2].databaseSchemaFile =
    "groups/2935803304472747987/database-schema.md";
  parsed2[targetKey2].businessFlowFile =
    "groups/2935803304472747987/business-flow.md";
  parsed2[targetKey2].allowedTools = ["noop", "send_message", "react_message"];

  // Invalidate caches
  // eslint-disable-next-line global-require
  const { clearPermissionCache: clrPerm } = require("../src/modules/permissions/tool-permission");
  clrPerm();
  // eslint-disable-next-line global-require
  const { clearPromptCache: clrCache } = require("../src/modules/ai/prompt-loader");
  clrCache();

  await fs.writeFile(groupsPath2, JSON.stringify(parsed2, null, 2));

  try {
    const ctx2 = await buildPromptContext({
      normalizedMessage: {
        threadId: targetKey2,
        senderId: "u1",
        isGroup: true,
        threadType: "group",
      },
    });
    await assert(
      ctx2.meta.layerDebug.databaseSchema.applied === true,
      "[2a] group with databaseSchemaFile -> applied"
    );
    await assert(
      ctx2.meta.layerDebug.businessFlow.applied === true,
      "[2b] group with businessFlowFile -> applied"
    );
    await assert(
      ctx2.meta.layerDebug.toolInstruction.applied === true,
      "[2c] tool instruction layer applied when allowedTools set"
    );
    await assert(
      (ctx2.meta.layerDebug.toolInstruction.tools || []).includes("send_message"),
      "[2d] tool instruction lists send_message"
    );
    await assert(
      !(ctx2.meta.layerDebug.toolInstruction.tools || []).includes("mysql_readonly_query"),
      "[2e] tool instruction does NOT include mysql_readonly_query when not allowed"
    );

    // Test 3: prompt debug reply contains the new lines
    // eslint-disable-next-line global-require
    const { formatPromptDebugReply } = require("../src/modules/ai/prompt-manager");
    const reply = formatPromptDebugReply(ctx2);
    await assert(reply.includes("databaseSchema"), "[3a] debug reply shows databaseSchema");
    await assert(reply.includes("businessFlow"), "[3b] debug reply shows businessFlow");
    await assert(reply.includes("toolInstruction"), "[3c] debug reply shows toolInstruction");
  } finally {
    await fs.writeFile(groupsPath2, backup2);
    clrPerm();
    clrCache();
  }

  // Test 4: group lists mysql_readonly_query but env MYSQL_TOOL_ENABLED=false
  // -> registry gate must disable the tool even when permission says yes.
  // eslint-disable-next-line global-require
  const { isToolEnabled } = require("../src/modules/tools/tool-registry");
  await assert(
    isToolEnabled("mysql_readonly_query", { MYSQL_TOOL_ENABLED: "false" }) === false,
    "[4] mysql tool registry-disabled when env MYSQL_TOOL_ENABLED=false"
  );
  await assert(
    isToolEnabled("send_message", { MYSQL_TOOL_ENABLED: "false" }) === true,
    "[4b] send_message not env-gated"
  );

  console.log("\nDone.");
}

run().catch((e) => {
  console.error("Crash:", e);
  process.exit(1);
});
