#!/usr/bin/env node
/** Post-deploy smoke against production domains */
const MAIN = process.env.MAIN_API || "https://akshayaexim.com";
const INVEST = process.env.INVEST_API || "https://invest.akshayaexim.com";
const EXPECT_PHONE = "+91 99495 75426";

let failed = 0;
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg, detail = "") {
  console.error(`✗ ${msg}${detail ? `: ${detail}` : ""}`);
  failed++;
}

async function get(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

console.log("Production audit\nMain:", MAIN, "\nInvest:", INVEST, "\n");

const h1 = await get(`${MAIN}/api/health`);
h1.ok ? pass("akshayaexim.com health") : fail("main health", h1.status);

const h2 = await get(`${INVEST}/api/health`);
h2.ok ? pass("invest.akshayaexim.com health") : fail("invest health", h2.status);

const cfg = await get(`${MAIN}/api/main/public/site-config`);
if (cfg.data?.config?.contact?.desks?.length === 1 && cfg.data?.config?.contact?.desks?.[0]?.phone === EXPECT_PHONE) {
  pass(`Main support phone ${EXPECT_PHONE}`);
} else {
  fail("Main contact phone", JSON.stringify(cfg.data?.config?.contact?.desks?.[0]?.phone));
}

const plans = await get(`${INVEST}/api/invest/public/plans`);
(plans.data?.plans?.length || 0) >= 35
  ? pass(`Invest plans (${plans.data.plans.length})`)
  : fail("Invest plans");

const products = await get(`${MAIN}/api/main/products?take=3`);
(products.data?.products?.length || 0) > 0 ? pass("Main products") : fail("Main products");

const gateways = await get(`${MAIN}/api/main/payments/gateways`);
Array.isArray(gateways.data?.gateways) && gateways.data.gateways.length > 0
  ? pass(`Main gateways (${gateways.data.gateways.length})`)
  : fail("Main gateways");

const sm = await fetch(`${MAIN}/sitemap.xml`);
const smText = sm.ok ? await sm.text() : "";
if (sm.ok && smText.includes("/privacy") && smText.includes("xhtml:link")) {
  pass(`Production sitemap (${(smText.match(/<loc>/g) || []).length} URLs)`);
} else fail("Production sitemap SEO");

const rb = await fetch(`${MAIN}/robots.txt`);
const rbText = rb.ok ? await rb.text() : "";
rb.ok && rbText.includes("Sitemap:") ? pass("Production robots.txt") : fail("Production robots.txt");

const siteCfg = await get(`${MAIN}/api/main/public/site-config`);
siteCfg.data?.config?.robotsAllowIndex !== false ? pass("Production indexing allowed") : fail("Indexing disabled");

console.log("\n— Invest auth & KYC —");
const invLoginRes = await fetch(`${INVEST}/api/invest/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ email: "investor@akshayaexim.com", password: "Investor@123" }),
});
const invLogin = await invLoginRes.json().catch(() => ({}));
if (invLogin.token) {
  pass("Investor login (demo account)");
  const kycRes = await fetch(`${INVEST}/api/invest/kyc`, {
    headers: { Authorization: `Bearer ${invLogin.token}`, Accept: "application/json" },
  });
  const kycData = await kycRes.json().catch(() => ({}));
  if (kycRes.ok && kycData.eligibility) {
    pass(`Invest KYC API (status ${kycData.kyc?.status || "unknown"})`);
  } else {
    fail("Invest KYC API", kycData.error || kycRes.status);
  }
  const googleLinkProbe = await fetch(`${INVEST}/api/invest/auth/google/link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${invLogin.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ credential: "invalid-audit-probe" }),
  });
  googleLinkProbe.status === 400 || googleLinkProbe.status === 401
    ? pass("Google link route registered")
    : fail("Google link route", googleLinkProbe.status);
} else if (invLogin.requiresLoginOtp) {
  pass("Investor login reachable (OTP gate — skip KYC token checks)");
} else {
  fail("Investor login", invLogin.error || invLoginRes.status);
}

console.log("\n— Production SPA shells (blank-page guard) —");
async function spaShell(origin, path, label) {
  try {
    const res = await fetch(`${origin.replace(/\/$/, "")}${path}`, { redirect: "follow" });
    const html = await res.text();
    if (!res.ok) {
      fail(`${label} ${path}`, `HTTP ${res.status}`);
      return;
    }
    if (!html.includes('id="root"')) {
      fail(`${label} ${path}`, "missing React root");
      return;
    }
    pass(`${label} ${path}`);
  } catch (e) {
    fail(`${label} ${path}`, e.message);
  }
}
for (const p of ["/", "/products", "/categories", "/about", "/login"]) {
  await spaShell(MAIN, p, "main");
}
for (const p of ["/", "/login", "/register", "/privacy", "/dashboard"]) {
  await spaShell(INVEST, p, "invest");
}

console.log(failed ? `\nPRODUCTION AUDIT FAILED (${failed})` : "\nPRODUCTION AUDIT PASSED");
process.exit(failed ? 1 : 0);
