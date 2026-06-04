#!/usr/bin/env node
/** Verify security headers on production invest (and optional main) origins. */
const INVEST = (process.env.INVEST_API || "https://invest.akshayaexim.com").replace(/\/$/, "");
const MAIN = (process.env.MAIN_API || "https://akshayaexim.com").replace(/\/$/, "");

const REQUIRED = [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", /sameorigin/i],
  ["referrer-policy", /strict-origin/i],
];

let failed = 0;
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg, detail = "") {
  console.error(`✗ ${msg}${detail ? `: ${detail}` : ""}`);
  failed++;
}

async function checkOrigin(label, url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    fail(`${label} GET`, String(res.status));
    return;
  }
  pass(`${label} reachable`);
  for (const [name, expected] of REQUIRED) {
    const v = res.headers.get(name);
    if (!v) {
      fail(`${label} ${name}`, "missing");
      continue;
    }
    if (expected instanceof RegExp ? !expected.test(v) : v.toLowerCase() !== expected) {
      fail(`${label} ${name}`, v);
    } else {
      pass(`${label} ${name}`);
    }
  }
  const hsts = res.headers.get("strict-transport-security");
  if (hsts && /max-age=\d+/.test(hsts)) pass(`${label} strict-transport-security`);
  else fail(`${label} HSTS`, hsts || "missing");
}

console.log("Security headers audit\n");
await checkOrigin("invest", `${INVEST}/`);
await checkOrigin("main", `${MAIN}/`);
console.log(failed ? `\nSECURITY HEADERS FAILED (${failed})` : "\nSECURITY HEADERS PASSED");
process.exit(failed ? 1 : 0);
