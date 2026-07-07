#!/usr/bin/env node
/**
 * scripts/test-tool-permission.js
 *
 * Validates Phase 3 permission resolution + cold-start fix.
 * Async API only: isToolAllowedForContext / listAllowedToolsForContext.
 */

const fs = require("fs/promises");
const path = require("path");

let pass = 0;
let fail = 0;

async function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log("PASS:", msg);
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

async function run() {
  // eslint-disable-next-line global-require
  const permMod = require("../src/modules/permissions/tool-permission");
  // eslint-disable-next-line global-require
  require("../src/modules/tools/tool-registry").boot();

  const groupsPath = path.resolve("data/prompts/groups.json");
  const usersPath = path.resolve("data/prompts/users.json");

  const groupsOriginal = await fs.readFile(groupsPath, "utf8");
  const usersOriginal = await fs.readFile(usersPath, "utf8");

  const groupsBackup = groupsOriginal;
  const usersBackup = usersOriginal;

  try {
    // ========== Cold-start suite ==========
    delete require.cache[require.resolve("../src/modules/permissions/tool-permission")];
    const coldPerm = require("../src/modules/permissions/tool-permission");
    coldPerm.clearPermissionCache();
    const ctx = {
      threadId: "6345678949379162493",
      groupId: "6345678949379162493",
      isGroup: true,
      senderId: "TEST_USER",
    };
    const mysqlR = await coldPerm.isToolAllowedForContext("mysql_readonly_query", ctx);
    await assert(mysqlR.allowed === true, "[C-1] cold-start mysql allowed");
    await assert(mysqlR.source === "groups.json", "[C-2] cold-start source = groups.json");
    const allowed = await coldPerm.listAllowedToolsForContext(ctx);
    await assert(allowed.includes("mysql_readonly_query"), "[C-3] cold-start list includes mysql");
    await assert(allowed.length === 4, "[C-4] cold-start list has 4 tools");

    // ========== Test 1: no group registered, mysql_readonly_query should be denied ==========
    const groups = JSON.parse(groupsOriginal);
    const users = JSON.parse(usersOriginal);
    await fs.writeFile(groupsPath, JSON.stringify({}));
    await fs.writeFile(usersPath, JSON.stringify({}));
    permMod.clearPermissionCache();

    let r = await permMod.isToolAllowedForContext("mysql_readonly_query", {
      isGroup: true,
      threadId: "missing-group",
    });
    await assert(r.allowed === false, "[1] mysql denied when no group registry");

    r = await permMod.isToolAllowedForContext("send_message", {
      isGroup: true,
      threadId: "missing-group",
    });
    await assert(r.allowed === true, "[2] send_message allowed by default legacy");

    // ========== Test 2: group WITH explicit allowedTools excludes mysql ==========
    groups["g-test-1"] = {
      enabled: true,
      promptFile: "groups/g-test-1.md",
      allowedTools: ["send_message", "react_message"],
    };
    await fs.writeFile(groupsPath, JSON.stringify(groups));
    permMod.clearPermissionCache();

    r = await permMod.isToolAllowedForContext("mysql_readonly_query", {
      isGroup: true,
      threadId: "g-test-1",
    });
    await assert(r.allowed === false, "[3] mysql denied when group allowedTools lacks it");

    r = await permMod.isToolAllowedForContext("send_message", {
      isGroup: true,
      threadId: "g-test-1",
    });
    await assert(r.allowed === true, "[4] send_message allowed");

    // ========== Test 3: group WITH mysql_readonly_query allowed ==========
    groups["g-test-2"] = {
      enabled: true,
      promptFile: "groups/g-test-2.md",
      allowedTools: ["mysql_readonly_query", "send_message"],
    };
    await fs.writeFile(groupsPath, JSON.stringify(groups));
    permMod.clearPermissionCache();

    await permMod.getRegistries({ forceReload: true });
    r = await permMod.isToolAllowedForContext("mysql_readonly_query", {
      isGroup: true,
      threadId: "g-test-2",
    });
    await assert(r.allowed === true, "[5] mysql allowed when group lists it");

    // ========== Test 4: env-gate at registry ==========
    // eslint-disable-next-line global-require
    const { isToolEnabled } = require("../src/modules/tools/tool-registry");
    const fakeEnv = { MYSQL_TOOL_ENABLED: "false" };
    await assert(
      isToolEnabled("mysql_readonly_query", fakeEnv) === false,
      "[6] mysql tool disabled in registry when env MYSQL_TOOL_ENABLED=false"
    );

    // ========== Test 5: listAllowedToolsForContext async returns legacy for unknown group ==========
    await fs.writeFile(groupsPath, JSON.stringify({}));
    permMod.clearPermissionCache();
    const list = await permMod.listAllowedToolsForContext({
      isGroup: true,
      threadId: "unknown-group",
      senderId: "nobody",
    });
    await assert(
      list.length === 3 && list.includes("send_message") && !list.includes("mysql_readonly_query"),
      "[7] listAllowedToolsForContext: unknown group -> 3 legacy, no mysql"
    );

    // ========== Test 6: Backward-compat sync variant still works on warmed cache ==========
    permMod.clearPermissionCache();
    await permMod.getRegistries({ forceReload: false });
    const rSync = permMod.isToolAllowedForContextSync("send_message", {
      isGroup: false,
    });
    await assert(rSync.allowed === true, "[8] Sync variant still works after warm");
  } finally {
    await fs.writeFile(groupsPath, groupsBackup);
    await fs.writeFile(usersPath, usersBackup);
    permMod.clearPermissionCache();
  }

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error("Crash:", e);
  process.exit(1);
});
