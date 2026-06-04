#!/usr/bin/env node
/** Smoke test invest API — run with server on PORT (default 4000) */
const base = (process.env.INVEST_API || process.env.API_BASE || "http://localhost:4000").replace(/\/$/, "");
const investSite = (process.env.INVEST_SITE || process.env.INVEST_API || base).replace(/\/$/, "");

const checks = [
  ["/api/health", (d) => d.ok === true],
  ["/api/invest/public/plans", (d) => Array.isArray(d.plans) && d.plans.length >= 35],
  [
    "/api/invest/public/gateways",
    (d) => {
      if (!Array.isArray(d.gateways) || !d.paymentOptions?.limits) return false;
      if (typeof d.paymentOptions.depositCategories?.crypto !== "boolean") return false;
      if (d.paymentOptions.depositCategories?.gateway === false) {
        return d.paymentOptions.limits.upiMaxAmount === 100_000;
      }
      return d.gateways.length > 0;
    },
  ],
  [
    "/api/invest/public/deposit-accounts",
    (d) => d.accounts?.bank?.length >= 1 && Array.isArray(d.accounts?.crypto),
  ],
  ["/api/invest/public/referral/leaderboard", (d) => Array.isArray(d.leaderboard)],
  ["/api/invest/public/homepage", (d) => d.homepage?.homepage_hero_title],
  [
    "/api/invest/public/crypto-rates",
    (d) => typeof d.usdInr === "number" && d.usdInr > 0 && d.usdPrices?.USDT,
  ],
  ["/api/invest/kyc/draft", (d, res) => res.status === 401],
];

let failed = 0;

try {
  const postKyc = await fetch(`${base}/api/invest/kyc/files/idFront`, { method: "POST" });
  if (postKyc.status === 401) console.log("✓ POST /api/invest/kyc/files/:fieldKey (auth required)");
  else throw new Error(`expected 401 got ${postKyc.status}`);
} catch (e) {
  console.error(`✗ POST /api/invest/kyc/files/idFront: ${e.message}`);
  failed++;
}

for (const [path, validate] of checks) {
  try {
    const res = await fetch(`${base}${path}`);
    const data = await res.json().catch(() => ({}));
    const ok = validate.length >= 2 ? validate(data, res) : res.ok && validate(data);
    if (!ok) throw new Error(`validation failed (${res.status})`);
    console.log(`✓ ${path}`);
  } catch (e) {
    console.error(`✗ ${path}: ${e.message}`);
    failed++;
  }
}

try {
  const rb = await fetch(`${investSite}/robots.txt`);
  const rbText = await rb.text();
  if (rb.status !== 200 || !rbText.includes("Disallow: /") || rbText.includes("Sitemap:")) {
    throw new Error("invest robots.txt should block all crawlers");
  }
  console.log("✓ invest subdomain robots.txt (noindex block)");

  const sm = await fetch(`${investSite}/sitemap.xml`);
  if (sm.status !== 404) throw new Error("invest sitemap should return 404");
  console.log("✓ invest subdomain sitemap blocked");
} catch (e) {
  console.error(`✗ invest SEO block: ${e.message}`);
  failed++;
}

process.exit(failed ? 1 : 0);
