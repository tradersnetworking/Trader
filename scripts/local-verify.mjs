#!/usr/bin/env node
/**
 * Full local verification — run after: npm run setup && npm run seed && server on :4000
 * Usage: node scripts/local-verify.mjs
 */
const base = process.env.API_BASE || "http://localhost:4000";

async function req(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

let failed = 0;
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg, detail = "") {
  console.error(`✗ ${msg}${detail ? `: ${detail}` : ""}`);
  failed++;
}

console.log("Local verify —", base, "\n");

const health = await req("/api/health");
health.ok ? pass("API health") : fail("API health", health.status);

const mainProducts = await req("/api/main/products?take=5");
mainProducts.data?.products?.length > 0
  ? pass(`Main catalog (${mainProducts.data.products.length} sample products)`)
  : fail("Main products");

const plans = await req("/api/invest/public/plans");
(plans.data?.plans?.length || 0) >= 35
  ? pass(`Invest plans (${plans.data.plans.length})`)
  : fail("Invest plans");

const mainUser = await req("/api/main/auth/login", {
  method: "POST",
  body: { email: "user@akshayaexim.com", password: "User@123" },
});
if (mainUser.data?.token) pass("Main marketplace login");
else fail("Main login", mainUser.data?.error);

const invLogin = await req("/api/invest/auth/login", {
  method: "POST",
  body: { email: "investor@akshayaexim.com", password: "Investor@123" },
});
let invToken = invLogin.data?.token;
if (invLogin.data?.requiresLoginOtp) {
  console.log("  ℹ Invest login OTP enabled — set LOGIN_OTP_REQUIRED=false in server/.env and restart API for password-only dev login");
} else if (invToken) {
  pass("Investor login");
} else {
  fail("Investor login", invLogin.data?.error);
}

if (invToken) {
  const kyc = await req("/api/invest/kyc", { token: invToken });
  kyc.data?.eligibility ? pass("KYC + eligibility API") : fail("KYC API");
  const wh = await req("/api/invest/wallet/history", { token: invToken });
  Array.isArray(wh.data?.requests) ? pass("Wallet transaction history") : fail("Wallet history");
}

const admin = await req("/api/invest/auth/login", {
  method: "POST",
  body: { email: "superadmin@akshayaexim.com", password: "Admin@12345" },
});
if (admin.data?.token || admin.data?.requiresLoginOtp) pass("Admin login reachable");
else fail("Admin login", admin.data?.error);

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll local checks passed.");
process.exit(failed ? 1 : 0);
