#!/usr/bin/env node
/**
 * scripts/test-mysql-column-policy.js
 *
 * Phase: Production Readiness for MySQL readonly tool.
 * Tests column-level allow / mask / deny semantics in isolation.
 *
 * Verifies:
 *   - allow columns pass through
 *   - mask columns become "***"
 *   - deny columns are removed
 *   - unknown columns are dropped
 *   - table without column policy → mysql_column_policy_missing
 *   - source detection (ctx vs groups.json)
 *   - empty policy → mysql_column_policy_empty
 *   - mask/deny lists are case-insensitive (normalised lower-case)
 */

const col = require("../src/modules/db/column-policy");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log("PASS:", msg);
  } else {
    fail++;
    console.error("FAIL:", msg);
  }
}

// ----- [1] allow columns pass -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: {
          customers: {
            allow: ["id", "name"],
            mask: [],
            deny: [],
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "customers",
    [{ id: 1, name: "Alice", phone: "555" }],
    ctx
  );
  assert(r.ok, "[1] allow-only ok");
  assert(r.rows[0].id === 1, "[1b] id preserved");
  assert(r.rows[0].name === "Alice", "[1c] name preserved");
  assert(!("phone" in r.rows[0]), "[1d] unknown column dropped");
  assert(r.fields.includes("id") && r.fields.includes("name"), "[1e] fields list correct");
}

// ----- [2] mask columns become "***" -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: {
          customers: {
            allow: ["id"],
            mask: ["phone", "email"],
            deny: [],
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "customers",
    [{ id: 1, phone: "555-1234", email: "a@b.com", secret: "x" }],
    ctx
  );
  assert(r.ok, "[2] mask ok");
  assert(r.rows[0].id === 1, "[2b] id preserved");
  assert(r.rows[0].phone === "***", "[2c] phone masked");
  assert(r.rows[0].email === "***", "[2d] email masked");
  assert(!("secret" in r.rows[0]), "[2e] secret (unknown) dropped");
  assert(r.maskedColumns.includes("phone"), "[2f] maskedColumns lists phone");
  assert(r.maskedColumns.includes("email"), "[2g] maskedColumns lists email");
}

// ----- [3] deny columns removed -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: {
          customers: {
            allow: ["id", "name"],
            mask: [],
            deny: ["password", "token", "secret"],
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "customers",
    [{ id: 1, name: "Alice", password: "p", token: "t", secret: "s" }],
    ctx
  );
  assert(r.ok, "[3] deny ok");
  assert(!("password" in r.rows[0]), "[3b] password removed");
  assert(!("token" in r.rows[0]), "[3c] token removed");
  assert(!("secret" in r.rows[0]), "[3d] secret removed");
  assert(r.deniedColumns.includes("password"), "[3e] deniedColumns lists password");
  assert(r.deniedColumns.includes("token"), "[3f] deniedColumns lists token");
  assert(r.deniedColumns.includes("secret"), "[3g] deniedColumns lists secret");
}

// ----- [4] combined: allow + mask + deny + unknown -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: {
          customers: {
            allow: ["id", "name"],
            mask: ["phone", "email"],
            deny: ["password"],
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "customers",
    [
      {
        id: 1,
        name: "Alice",
        phone: "555-1234",
        email: "a@b.com",
        password: "p",
        other: "x",
      },
    ],
    ctx
  );
  assert(r.ok, "[4] combined ok");
  const out = r.rows[0];
  assert(out.id === 1 && out.name === "Alice", "[4b] allow columns preserved");
  assert(out.phone === "***" && out.email === "***", "[4c] mask columns become ***");
  assert(!("password" in out), "[4d] deny column removed");
  assert(!("other" in out), "[4e] unknown column dropped");
  assert(
    r.maskedColumns.includes("phone") && r.maskedColumns.includes("email"),
    "[4f] maskedColumns list"
  );
  assert(r.deniedColumns.includes("password"), "[4g] deniedColumns list");
}

// ----- [5] table without column policy → mysql_column_policy_missing -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: { orders: { allow: ["id"], mask: [], deny: [] } },
      },
    },
  };
  const r = col.enforceColumnPolicy("customers", [{ id: 1 }], ctx);
  assert(!r.ok && r.error === "mysql_column_policy_missing", "[5] missing → mysql_column_policy_missing");
}

// ----- [6] empty policy → mysql_column_policy_empty -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: { customers: { allow: [], mask: [], deny: [] } },
      },
    },
  };
  const r = col.enforceColumnPolicy("customers", [{ id: 1 }], ctx);
  assert(!r.ok && r.error === "mysql_column_policy_empty", "[6] empty → mysql_column_policy_empty");
}

// ----- [7] case-insensitive column matching -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: {
          customers: {
            allow: ["ID", "Name"],
            mask: ["PHONE"],
            deny: ["Password"],
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "CUSTOMERS",
    [{ id: 1, name: "A", phone: "x", password: "p" }],
    ctx
  );
  assert(r.ok, "[7] case-insensitive ok");
  assert(r.rows[0].id === 1 && r.rows[0].name === "A", "[7b] allow preserved");
  assert(r.rows[0].phone === "***", "[7c] mask applied");
  assert(!("password" in r.rows[0]), "[7d] deny removed");
}

// ----- [8] source detection: groups.json fallback -----
{
  const ctx = {
    groupsRegistry: {
      "g1": {
        mysql: {
          columns: {
            customers: {
              allow: ["id"],
              mask: [],
              deny: ["password"],
            },
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "customers",
    [{ id: 1, password: "p" }],
    { threadId: "g1", groupsRegistry: ctx.groupsRegistry }
  );
  assert(r.ok, "[8] groups.json fallback ok");
  assert(r.source === "groups.json.mysql.columns", "[8b] source = groups.json");
}

// ----- [9] audit-style safety: no raw value in result for masked/denied -----
{
  const ctx = {
    groupConfig: {
      mysql: {
        columns: {
          customers: {
            allow: ["id"],
            mask: ["phone"],
            deny: ["password"],
          },
        },
      },
    },
  };
  const r = col.enforceColumnPolicy(
    "customers",
    [{ id: 1, phone: "SECRET_PHONE", password: "SECRET_PASS" }],
    ctx
  );
  // Serialise the result and ensure raw values never appear.
  const s = JSON.stringify(r);
  assert(!s.includes("SECRET_PHONE"), "[9] masked raw value not in result");
  assert(!s.includes("SECRET_PASS"), "[9b] denied raw value not in result");
}

console.log(`\nResult: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);