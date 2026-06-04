#!/usr/bin/env node
/** Run all automated invest platform audits (exit 1 if any hard failure). */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const investApi = process.env.INVEST_API || "https://invest.akshayaexim.com";

const steps = [
  ["Unit tests", "npm", ["run", "test:unit", "--workspace", "server"], { cwd: root }],
  ["Invest smoke", "node", ["scripts/smoke-invest.mjs"], { cwd: root, env: { ...process.env, INVEST_API: investApi } }],
  ["Production audit", "node", ["scripts/production-audit.mjs"], { cwd: root }],
  ["API workflow", "node", ["scripts/api-workflow-audit.mjs"], { cwd: root, env: { ...process.env, INVEST_API: investApi } }],
];

let failed = 0;
console.log("Full platform audit\nInvest API:", investApi, "\n");
for (const [label, cmd, args, opts] of steps) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${r.status})`);
    failed++;
  } else {
    console.log(`\n✓ ${label} passed`);
  }
}
console.log(failed ? `\nFULL AUDIT FAILED (${failed} step(s))` : "\nFULL AUDIT PASSED");
process.exit(failed ? 1 : 0);
