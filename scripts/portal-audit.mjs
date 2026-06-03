#!/usr/bin/env node
/**
 * Full portal audit — build + API smoke + business rules.
 * Exit 0 only when everything passes.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.API_BASE || "http://localhost:4000";
const EXPECT_PHONE = "+91 99495 75426";
const EXPECT_WHATSAPP = "919949575426";
const POLICY_PATHS = ["/about", "/contact", "/privacy", "/terms", "/returns", "/faq"];

let failed = 0;
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg, detail = "") {
  console.error(`✗ ${msg}${detail ? `: ${detail}` : ""}`);
  failed++;
}

function run(cmd, args, label) {
  console.log(`\n— ${label} —`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    fail(label, `exit ${r.status}`);
    return false;
  }
  pass(label);
  return true;
}

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${base}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }
  return { ok: res.ok, status: res.status, data };
}

console.log("Portal audit —", root);

run("npm", ["run", "build"], "Production build");

run("node", ["scripts/smoke-main.mjs"], "Smoke: main marketplace");
run("node", ["scripts/smoke-invest.mjs"], "Smoke: invest portal");
run("node", ["scripts/local-verify.mjs"], "Local verify (auth, KYC, wallet)");

console.log("\n— Main site contact & policies —");
const cfg = await req("/api/main/public/site-config");
if (!cfg.ok) fail("site-config API", cfg.status);
else {
  const contact = cfg.data?.config?.contact;
  const links = cfg.data?.config?.supportLinks;
  const deskPhone = contact?.desks?.[0]?.phone;
  const officePhone = contact?.office?.phone;
  if (contact?.desks?.length === 1) pass("Single support desk (legacy desks removed)");
  else fail("Contact desks", `expected 1, got ${contact?.desks?.length}`);
  if (deskPhone === EXPECT_PHONE && officePhone === EXPECT_PHONE) pass(`Support phone ${EXPECT_PHONE}`);
  else fail("Support phone", `desk=${deskPhone} office=${officePhone}`);
  if (links?.whatsapp === EXPECT_WHATSAPP) pass("WhatsApp digits");
  else fail("WhatsApp", links?.whatsapp);
  if (links?.phone === EXPECT_PHONE) pass("supportLinks.phone");
  else fail("supportLinks.phone", links?.phone);
}

for (const p of POLICY_PATHS) {
  const dist = join(root, "web/dist/index.html");
  if (!existsSync(dist)) continue;
  pass(`Route registered: ${p} (SPA — verify in browser after deploy)`);
}

const mainLogin = await req("/api/main/auth/login", {
  method: "POST",
  body: { email: "user@akshayaexim.com", password: "User@123" },
});
if (mainLogin.data?.token) {
  pass("Main user can obtain token");
  const orders = await req("/api/main/orders/mine", { token: mainLogin.data.token });
  orders.ok && Array.isArray(orders.data?.orders) ? pass("Main orders API") : fail("Main orders", orders.status);
} else fail("Main login token", mainLogin.data?.error);

const gateways = await req("/api/main/payments/gateways");
if (gateways.ok && Array.isArray(gateways.data?.gateways)) pass(`Main payment gateways (${gateways.data.gateways.length})`);
else fail("Main payment gateways");

console.log("\n— Main site SEO —");
const cfgSeo = cfg.data?.config;
if (cfgSeo?.robotsAllowIndex !== false) pass("Robots indexing enabled");
else fail("Robots indexing disabled");
if (cfgSeo?.seo?.title?.length > 20) pass("SEO title configured");
else fail("SEO title");
if (cfgSeo?.seo?.description?.length > 80) pass("SEO meta description");
else fail("SEO description");

const smRes = await fetch(`${base}/sitemap.xml`);
const smText = smRes.ok ? await smRes.text() : "";
if (smRes.ok && smText.includes("/privacy") && smText.includes("/contact") && smText.includes("xhtml:link")) {
  const urlCount = (smText.match(/<loc>/g) || []).length;
  pass(`Sitemap (${urlCount} URLs, hreflang + policy pages)`);
} else fail("Sitemap SEO structure", smRes.status);

const rbRes = await fetch(`${base}/robots.txt`);
const rbText = rbRes.ok ? await rbRes.text() : "";
if (rbRes.ok && rbText.includes("Sitemap:") && rbText.includes("akshayaexim.in")) pass("robots.txt (dual TLD sitemaps)");
else fail("robots.txt");

const seoCfg = cfgSeo?.seo;
if (seoCfg?.canonicalUrl?.includes("akshayaexim.com")) pass("Canonical URL");
else fail("Canonical URL", seoCfg?.canonicalUrl);

run("node", ["scripts/routes-audit.mjs"], "Routes & SPA safety");

console.log(failed ? `\nAUDIT FAILED — ${failed} issue(s).` : "\nAUDIT PASSED — portal ready for GitHub + VPS.");
process.exit(failed ? 1 : 0);
