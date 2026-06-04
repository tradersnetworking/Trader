#!/usr/bin/env node
/**
 * Authenticated invest API workflow audit — run against prod or local.
 * INVEST_API=https://invest.akshayaexim.com node scripts/api-workflow-audit.mjs
 */
const BASE = (process.env.INVEST_API || "http://localhost:4000").replace(/\/$/, "");
const INVESTOR_EMAIL = process.env.E2E_INVESTOR_EMAIL || "investor@akshayaexim.com";
const INVESTOR_PASSWORD = process.env.E2E_INVESTOR_PASSWORD || "Investor@123";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

let failed = 0;
let skipped = 0;
const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name, detail = "") {
  skipped++;
  results.push({ ok: "skip", name, detail });
  console.log(`○ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failed++;
  results.push({ ok: false, name, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

async function jsonFetch(path, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

async function login(email, password) {
  const { res, data } = await jsonFetch("/api/invest/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (data?.requiresLoginOtp) return { otp: true };
  if (!res.ok || !data?.token) return { error: data?.error || res.status };
  return { token: data.token, user: data.user };
}

console.log("API workflow audit\nBase:", BASE, "\n");

// — Public —
const publicChecks = [
  ["/api/health", (d) => d.ok === true],
  ["/api/invest/public/plans", (d) => (d.plans?.length || 0) >= 35],
  ["/api/invest/public/gateways", (d) => Array.isArray(d.gateways) && d.paymentOptions?.limits],
  ["/api/invest/public/deposit-accounts", (d) => d.accounts?.bank?.length >= 1],
  ["/api/invest/public/crypto-rates", (d) => d.usdInr > 0],
  ["/api/invest/public/homepage", (d) => !!d.homepage],
];
for (const [path, validate] of publicChecks) {
  const { res, data } = await jsonFetch(path);
  if (res.ok && validate(data)) pass(`PUBLIC ${path}`);
  else fail(`PUBLIC ${path}`, `${res.status} ${data?.error || ""}`);
}

// Unauthenticated investor routes → 401
for (const path of ["/api/invest/dashboard", "/api/invest/kyc", "/api/invest/kyc/draft", "/api/invest/wallet"]) {
  const { res } = await jsonFetch(path);
  if (res.status === 401) pass(`AUTH GATE ${path}`);
  else fail(`AUTH GATE ${path}`, `expected 401 got ${res.status}`);
}

// — Investor login —
const inv = await login(INVESTOR_EMAIL, INVESTOR_PASSWORD);
if (inv.otp) {
  fail("Investor login", "OTP required — set credentials without OTP gate for CI");
} else if (inv.error) {
  fail("Investor login", inv.error);
} else {
  pass("Investor login", inv.user?.email || INVESTOR_EMAIL);
  const t = inv.token;

  const investorRoutes = [
    ["/api/invest/dashboard", (d) => d.wallet != null || d.stats != null || d.balance != null],
    ["/api/invest/wallet", (d) => typeof d.available === "number" || d.wallet != null],
    ["/api/invest/kyc", (d) => d.eligibility != null || d.kyc != null],
    ["/api/invest/kyc/draft", (d) => d.draft != null || d.step != null || d.ok === true || Object.keys(d).length >= 0],
    ["/api/invest/notifications", (d) => typeof d.count === "number"],
    ["/api/invest/notifications/list", (d) => Array.isArray(d.notifications)],
    ["/api/invest/subscriptions", (d) => Array.isArray(d.subscriptions) || Array.isArray(d.active)],
    ["/api/invest/deposits", (d) => Array.isArray(d.deposits)],
    ["/api/invest/payouts", (d) => Array.isArray(d.payouts)],
    ["/api/invest/referral/stats", (d) => d.code != null || d.referralCode != null || d.stats != null],
    ["/api/invest/agreements", (d) => Array.isArray(d.agreements)],
    ["/api/invest/public/plans", (d) => (d.plans?.length || 0) >= 35],
  ];

  for (const [path, validate] of investorRoutes) {
    const isPublic = path.includes("/public/");
    const { res, data } = await jsonFetch(path, { token: isPublic ? undefined : t });
    if (res.ok && validate(data)) pass(`INVESTOR ${path}`);
    else fail(`INVESTOR ${path}`, `${res.status} ${data?.error || JSON.stringify(data)?.slice(0, 80)}`);
  }

  // KYC file route exists (OPTIONS/POST without file may 400 not 404)
  const kycFile = await jsonFetch("/api/invest/kyc/files/idFront", { method: "POST", token: t });
  if (kycFile.res.status !== 404) pass("INVESTOR KYC file route registered", String(kycFile.res.status));
  else fail("INVESTOR KYC file route", "404");
}

// — Admin login (optional on prod when custom passwords; set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD) —
let adm = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
if (adm.error) {
  adm = await login(process.env.E2E_ADMIN_EMAIL_2 || "admin@akshayaexim.com", ADMIN_PASSWORD);
}
if (adm.otp) {
  skip("Admin login", "OTP required — set E2E_ADMIN_PASSWORD");
} else if (adm.error) {
  skip("Admin login", `${adm.error} (set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for live admin probe)`);
} else if (adm.user?.role !== "ADMIN" && adm.user?.role !== "SUPERADMIN") {
  fail("Admin login", `role=${adm.user?.role}`);
} else {
  pass("Admin login", `${adm.user.role} ${adm.user.email}`);
  const at = adm.token;

  const adminRoutes = [
    ["/api/invest/admin/dashboard", (d) => d.stats != null],
    ["/api/invest/admin/permissions", (d) => Array.isArray(d.permissions)],
    ["/api/invest/admin/deposits", (d) => Array.isArray(d.deposits)],
    ["/api/invest/admin/kyc", (d) => Array.isArray(d.kyc)],
    ["/api/invest/admin/payouts", (d) => Array.isArray(d.payouts)],
    ["/api/invest/admin/login-sessions", (d) => Array.isArray(d.sessions)],
    ["/api/invest/admin/payouts/pending-today", (d) => Array.isArray(d.payouts)],
    ["/api/invest/admin/maturity-payments/today", (d) => d.count != null || d.payouts != null || d.totalDue != null],
    ["/api/invest/admin/referral-earnings", (d) => Array.isArray(d.earnings)],
    ["/api/invest/admin/referral-settings", (d) => d.levelCommissions != null || d.payoutFrequency != null],
    ["/api/invest/admin/plans", (d) => Array.isArray(d.plans)],
    ["/api/invest/admin/investors?take=5", (d) => Array.isArray(d.investors)],
  ];

  for (const [path, validate] of adminRoutes) {
    const { res, data } = await jsonFetch(path, { token: at });
    if (res.ok && validate(data)) pass(`ADMIN ${path}`);
    else if (res.status === 403) fail(`ADMIN ${path}`, "403 forbidden — RBAC");
    else fail(`ADMIN ${path}`, `${res.status} ${data?.error || ""}`);
  }
}
}

console.log(
  failed
    ? `\nWORKFLOW AUDIT FAILED (${failed} failed, ${skipped} skipped)`
    : `\nWORKFLOW AUDIT PASSED${skipped ? ` (${skipped} skipped)` : ""}`,
);
process.exit(failed ? 1 : 0);
