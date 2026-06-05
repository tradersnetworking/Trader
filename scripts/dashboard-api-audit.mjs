#!/usr/bin/env node
/**
 * Full dashboard API audit — every investor + admin tab load endpoint.
 * INVEST_API=https://invest.akshayaexim.com node scripts/dashboard-api-audit.mjs
 */
const BASE = (process.env.INVEST_API || "http://localhost:4000").replace(/\/$/, "");
const INVESTOR_EMAIL = process.env.E2E_INVESTOR_EMAIL || "investor@akshayaexim.com";
const INVESTOR_PASSWORD = process.env.E2E_INVESTOR_PASSWORD || "Investor@123";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "superadmin@akshayaexim.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Admin@12345";
const INVESTOR_TOKEN = process.env.INVEST_INVESTOR_TOKEN;
const ADMIN_TOKEN = process.env.INVEST_ADMIN_TOKEN;

let failed = 0;
let passed = 0;

function ok(name, detail = "") {
  passed++;
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function bad(name, detail = "") {
  failed++;
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
  if (data?.requiresLoginOtp) return { otp: true, data };
  if (!res.ok || !data?.token) return { error: data?.error || String(res.status) };
  return { token: data.token, user: data.user };
}

async function checkGroup(label, routes, token) {
  for (const [path, validate] of routes) {
    const { res, data } = await jsonFetch(path, { token });
    if (res.ok && (!validate || validate(data))) ok(`${label} ${path}`);
    else bad(`${label} ${path}`, `${res.status} ${data?.error || ""}`);
  }
}

console.log("Dashboard API audit\nBase:", BASE, "\n");

let invToken = INVESTOR_TOKEN;
if (process.env.INVEST_SKIP_INVESTOR === "1") invToken = invToken || "skip";
if (invToken === "skip") {
  /* admin-only audit */
} else if (!invToken) {
  const inv = await login(INVESTOR_EMAIL, INVESTOR_PASSWORD);
  if (inv.otp) bad("Investor login", "OTP required — mail may be working");
  else if (inv.error) bad("Investor login", inv.error);
  else {
    ok("Investor login", inv.user?.email);
    invToken = inv.token;
  }
} else {
  ok("Investor token", "from INVEST_INVESTOR_TOKEN");
}
if (invToken && invToken !== "skip") {
  const t = invToken;
  await checkGroup("INVESTOR", [
    ["/api/invest/dashboard", (d) => d.stats != null || d.wallet != null],
    ["/api/invest/wallet", (d) => d.wallet != null || typeof d.available === "number"],
    ["/api/invest/kyc", (d) => d.kyc != null || d.eligibility != null],
    ["/api/invest/kyc/draft", () => true],
    ["/api/invest/subscriptions", (d) => Array.isArray(d.subscriptions)],
    ["/api/invest/maturity-choices", (d) => Array.isArray(d.subscriptions)],
    ["/api/invest/notifications", (d) => typeof d.count === "number"],
    ["/api/invest/notifications/list", (d) => Array.isArray(d.notifications)],
    ["/api/invest/wallet/history", (d) => Array.isArray(d.ledger) || Array.isArray(d.entries) || Array.isArray(d.transactions)],
    ["/api/invest/deposits", (d) => Array.isArray(d.deposits)],
    ["/api/invest/payouts", (d) => Array.isArray(d.payouts)],
    ["/api/invest/agreements", (d) => Array.isArray(d.agreements)],
    ["/api/invest/agreements/settings/public", () => true],
    ["/api/invest/ledger", (d) => Array.isArray(d.entries) || Array.isArray(d.ledger)],
    ["/api/invest/referral/stats", () => true],
    ["/api/invest/tickets", (d) => Array.isArray(d.tickets)],
    ["/api/invest/public/plans", (d) => (d.plans?.length || 0) >= 1],
    ["/api/invest/public/gateways", (d) => Array.isArray(d.gateways)],
    ["/api/invest/public/deposit-accounts", (d) => d.accounts != null],
    ["/api/invest/public/bank-details", () => true],
    ["/api/invest/security/2fa/status", () => true],
  ], t);
}

let admToken = ADMIN_TOKEN;
if (!admToken) {
  const adm = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (adm.otp) bad("Admin login", "OTP required");
  else if (adm.error) bad("Admin login", adm.error);
  else if (!["ADMIN", "SUPERADMIN"].includes(adm.user?.role)) bad("Admin login", `role=${adm.user?.role}`);
  else {
    ok("Admin login", `${adm.user.role} ${adm.user.email}`);
    admToken = adm.token;
  }
} else {
  ok("Admin token", "from INVEST_ADMIN_TOKEN");
}
if (admToken) {
  const at = admToken;
  await checkGroup("ADMIN", [
    ["/api/invest/admin/dashboard", (d) => d.stats != null],
    ["/api/invest/admin/permissions", (d) => Array.isArray(d.permissions)],
    ["/api/invest/admin/notifications", (d) => typeof d.count === "number"],
    ["/api/invest/admin/maturity-payments/today", () => true],
    ["/api/invest/admin/maturity-payments/upcoming", () => true],
    ["/api/invest/admin/payouts/pending-today", (d) => Array.isArray(d.payouts)],
    ["/api/invest/admin/plans", (d) => Array.isArray(d.plans)],
    ["/api/invest/admin/deposits", (d) => Array.isArray(d.deposits)],
    ["/api/invest/admin/kyc", (d) => Array.isArray(d.kyc)],
    ["/api/invest/admin/payout-changes?status=PENDING", (d) => Array.isArray(d.changes) || Array.isArray(d.items)],
    ["/api/invest/admin/kyc-revisions?status=PENDING", (d) => Array.isArray(d.revisions) || Array.isArray(d.items)],
    ["/api/invest/admin/agreements", (d) => Array.isArray(d.agreements)],
    ["/api/invest/admin/agreement-templates", (d) => Array.isArray(d.templates)],
    ["/api/invest/admin/payouts", (d) => Array.isArray(d.payouts)],
    ["/api/invest/admin/ledger", (d) => Array.isArray(d.entries) || Array.isArray(d.ledger)],
    ["/api/invest/admin/investors", (d) => Array.isArray(d.investors)],
    ["/api/invest/admin/investors/lists/not-invested", (d) => Array.isArray(d.investors)],
    ["/api/invest/admin/investors/lists/kyc-pending", (d) => Array.isArray(d.investors)],
    ["/api/invest/admin/subscriptions", (d) => Array.isArray(d.subscriptions)],
    ["/api/invest/admin/settings", () => true],
    ["/api/invest/admin/notifications/recent", (d) => Array.isArray(d.notifications)],
    ["/api/invest/admin/export/datasets", () => true],
    ["/api/invest/admin/tickets", (d) => Array.isArray(d.tickets)],
    ["/api/invest/admin/referral-earnings", (d) => Array.isArray(d.earnings)],
    ["/api/invest/admin/referral-analytics", () => true],
    ["/api/invest/admin/referral-settings", () => true],
    ["/api/invest/admin/promo-codes", (d) => Array.isArray(d.promos) || Array.isArray(d.codes) || Array.isArray(d.promoCodes)],
    ["/api/invest/admin/partners", (d) => Array.isArray(d.partners)],
    ["/api/invest/admin/audit-logs", (d) => Array.isArray(d.logs) || Array.isArray(d.entries)],
    ["/api/invest/admin/treasury", () => true],
    ["/api/invest/admin/analytics/cohorts?months=12", (d) => d.summary != null || d.cohorts != null],
    ["/api/invest/admin/rbac", () => true],
    ["/api/invest/admin/support-mail", (d) => Array.isArray(d.messages)],
    ["/api/invest/admin/gateways", (d) => Array.isArray(d.gateways) || d.collection != null || d.payouts != null],
    ["/api/invest/admin/payment-gateways", () => true],
    ["/api/invest/admin/whatsapp-business", () => true],
    ["/api/invest/admin/settings/email-communication", () => true],
    ["/api/invest/admin/login-sessions", (d) => Array.isArray(d.sessions)],
    ["/api/invest/admin/platform/deploy/status", () => true],
  ], at);
}

console.log(`\n${failed ? "FAILED" : "PASSED"} — ${passed} ok, ${failed} failed`);
process.exit(failed ? 1 : 0);
