#!/usr/bin/env node
import { spawnSync } from "node:child_process";

if (!process.env.E2E_ADMIN_PASSWORD) {
  console.error("Set E2E_ADMIN_PASSWORD (and E2E_ADMIN_EMAIL) before running admin E2E.");
  process.exit(1);
}
const env = {
  ...process.env,
  PLAYWRIGHT_SKIP_WEBSERVER: "1",
  PLAYWRIGHT_API_URL: process.env.PLAYWRIGHT_API_URL || "https://invest.akshayaexim.com",
};
const r = spawnSync("npx", ["playwright", "test", "e2e/admin-prod.spec.mjs"], {
  stdio: "inherit",
  shell: true,
  env,
});
process.exit(r.status ?? 1);
