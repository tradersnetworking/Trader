#!/usr/bin/env node
/** Smoke test invest API — run with server on PORT (default 4000) */
import http from "node:http";

const base = process.env.API_BASE || "http://localhost:4000";
const port = Number(new URL(base).port || 4000);
const hostname = new URL(base).hostname || "127.0.0.1";

function fetchWithHost(path, host) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path, method: "GET", headers: { Host: host } }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode, text: data }));
    });
    req.on("error", reject);
    req.end();
  });
}

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

try {
  const res = await fetchWithHost("/robots.txt", "invest.akshayaexim.com");
  if (res.status !== 200 || !res.text.includes("Disallow: /") || res.text.includes("Sitemap:")) {
    throw new Error("invest robots.txt should block all crawlers");
  }
  console.log("✓ invest subdomain robots.txt (noindex block)");

  const sm = await fetchWithHost("/sitemap.xml", "invest.akshayaexim.com");
  if (sm.status !== 404) throw new Error("invest sitemap should return 404");
  console.log("✓ invest subdomain sitemap blocked");
} catch (e) {
  console.error(`✗ invest SEO block: ${e.message}`);
  failed++;
}

process.exit(failed ? 1 : 0);
