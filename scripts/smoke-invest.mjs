#!/usr/bin/env node
/** Smoke test invest API — run with server on PORT (default 4000) */
const base = process.env.API_BASE || "http://localhost:4000";

const checks = [
  ["/api/health", (d) => d.ok === true],
  ["/api/invest/public/plans", (d) => Array.isArray(d.plans) && d.plans.length >= 35],
  ["/api/invest/public/gateways", (d) => Array.isArray(d.gateways) && d.gateways.length > 0],
  ["/api/invest/public/deposit-accounts", (d) => d.accounts?.bank?.length >= 1],
  ["/api/invest/public/referral/leaderboard", (d) => Array.isArray(d.leaderboard)],
  ["/api/invest/public/homepage", (d) => d.homepage?.homepage_hero_title],
];

let failed = 0;
for (const [path, validate] of checks) {
  try {
    const res = await fetch(`${base}${path}`);
    const data = await res.json();
    if (!res.ok || !validate(data)) throw new Error(`validation failed (${res.status})`);
    console.log(`✓ ${path}`);
  } catch (e) {
    console.error(`✗ ${path}: ${e.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
