#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  PLAYWRIGHT_SKIP_WEBSERVER: "1",
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || "https://invest.akshayaexim.com/",
  PLAYWRIGHT_API_URL: process.env.PLAYWRIGHT_API_URL || "https://invest.akshayaexim.com",
};
const args = ["playwright", "test", "e2e/kyc-upload.spec.mjs"];
if (!process.env.E2E_UI) args.push("--grep-invert", "@ui");
const r = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env,
});
process.exit(r.status ?? 1);
