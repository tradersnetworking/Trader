#!/usr/bin/env node
/** Run all automated invest platform audits (exit 1 if any hard failure). */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const investApi = process.env.INVEST_API || "https://invest.akshayaexim.com";

const steps = [
  ["Platform discovery", "node", ["scripts/generate-platform-discovery.mjs"], { cwd: root }],
  ["Unit tests", "npm", ["run", "test:unit", "--workspace", "server"], { cwd: root }],
  ["Invest smoke", "node", ["scripts/smoke-invest.mjs"], { cwd: root, env: { ...process.env, INVEST_API: investApi } }],
  ["Production audit", "node", ["scripts/production-audit.mjs"], { cwd: root }],
  ["Security headers", "node", ["scripts/security-headers-audit.mjs"], { cwd: root, env: { ...process.env, INVEST_API: investApi } }],
  ["Load test", "node", ["scripts/load-test-invest.mjs"], { cwd: root, env: { ...process.env, LOAD_BASE: investApi } }],
  ["API workflow", "node", ["scripts/api-workflow-audit.mjs"], { cwd: root, env: { ...process.env, INVEST_API: investApi } }],
  ["Playwright KYC", "node", ["scripts/run-e2e-prod.mjs"], { cwd: root }],
];

if (process.env.RUN_E2E === "1" || process.env.E2E_ADMIN_PASSWORD) {
  steps.push([
    "Playwright KYC",
    "npx",
    ["playwright", "test", "e2e/kyc-upload.spec.mjs", "e2e/admin-prod.spec.mjs"],
    {
      cwd: root,
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_WEBSERVER: "1",
        PLAYWRIGHT_BASE_URL: `${investApi.replace(/\/$/, "")}/`,
        PLAYWRIGHT_API_URL: investApi,
      },
    },
  ]);
}

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
