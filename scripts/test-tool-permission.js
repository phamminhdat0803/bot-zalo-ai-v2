#!/usr/bin/env node
/**
 * scripts/test-tool-permission.js
 *
 * Validates Phase 3 permission resolution.
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
    // Test 1: no group registered, mysql_readonly_query should be denied
    const groups = JSON.parse(groupsOriginal);
    const users = JSON.parse(usersOriginal);
    await fs.writeFile(groupsPath, JSON.stringify({}));
    await fs.writeFile(usersPath, JSON.stringify({}));
    permMod.clearPermissionCache();

    let r = permMod.isToolAllowedForContext("mysql_readonly_query", {
      isGroup: true,
      threadId: "missing-group",
    });
    await assert(r.allowed === false, "[1] mysql denied when no group registry");

    r = permMod.isToolAllowedForContext("send_message", {
      isGroup: true,
      threadId: "missing-group",
    });
    await assert(r.allowed === true, "[2] send_message allowed by default legacy");

    // Test 2: group WITH explicit allowedTools excludes mysql
    groups["g-test-1"] = {
      enabled: true,
      promptFile: "groups/g-test-1.md",
      allowedTools: ["send_message", "react_message"],
    };
    await fs.writeFile(groupsPath, JSON.stringify(groups));
    permMod.clearPermissionCache();

    r = permMod.isToolAllowedForContext("mysql_readonly_query", {
      isGroup: true,
      threadId: "g-test-1",
    });
    await assert(r.allowed === false, "[3] mysql denied when group allowedTools lacks it");

    r = permMod.isToolAllowedForContext("send_message", {
      isGroup: true,
      threadId: "g-test-1",
    });
    await assert(r.allowed === true, "[4] send_message allowed");

    // Test 3: group WITH mysql_readonly_query allowed, env disabled
    groups["g-test-2"] = {
      enabled: true,
      promptFile: "groups/g-test-2.md",
      allowedTools: ["mysql_readonly_query", "send_message"],
    };
    await fs.writeFile(groupsPath, JSON.stringify(groups));
    permMod.clearPermissionCache();

    // env-controlled tool: even if perm says allowed, env toggle is enforced
    // separately by the registry. We assert permission-layer behavior here.
    const reg = await permMod.getRegistries({ forceReload: true });
    if (!reg.groups["g-test-2"]) {
      console.error("DEBUG groups:", Object.keys(reg.groups));
    }
    r = permMod.isToolAllowedForContext("mysql_readonly_query", {
      isGroup: true,
      threadId: "g-test-2",
    });
    await assert(r.allowed === true, "[5] mysql allowed when group lists it");

    // env check: simulate MYSQL_TOOL_ENABLED=false at the registry gate
    // eslint-disable-next-line global-require
    const { isToolEnabled } = require("../src/modules/tools/tool-registry");
    const fakeEnv = { MYSQL_TOOL_ENABLED: "false" };
    await assert(
      isToolEnabled("mysql_readonly_query", fakeEnv) === false,
      "[6] mysql tool disabled in registry when env MYSQL_TOOL_ENABLED=false"
    );
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
