#!/usr/bin/env node
/**
 * Static + HTTP checks for blank screens, broken routes, and unsafe API handling.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.API_BASE || "http://localhost:4000";
const mainSite = process.env.MAIN_SITE || base.replace(/:\d+$/, "") || "http://localhost:4000";
const investSite = process.env.INVEST_SITE || "http://localhost:4000";

let failed = 0;
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg, detail = "") {
  console.error(`✗ ${msg}${detail ? `: ${detail}` : ""}`);
  failed++;
}

console.log("Routes & safety audit\n");

// — Static: InvestorDashboard must not reference undeclared KYC constants
const invDashPath = join(root, "web/src/pages/invest/InvestorDashboard.jsx");
const invDash = readFileSync(invDashPath, "utf8");
const riskyConst = "INVESTOR_KYC_OVERLAY_UNLOCK_TABS";
if (invDash.includes(riskyConst)) {
  const importBlock = invDash.slice(0, invDash.indexOf("export default"));
  if (!/import\s*\{[^}]*INVESTOR_KYC_OVERLAY_UNLOCK_TABS/.test(importBlock)) {
    fail("InvestorDashboard uses INVESTOR_KYC_OVERLAY_UNLOCK_TABS without importing it");
  } else {
    pass("InvestorDashboard KYC constants imported");
  }
} else {
  pass("InvestorDashboard has no stale KYC overlay reference");
}

const kycPanelPath = join(root, "web/src/components/invest/KycPanel.jsx");
const kycPanel = readFileSync(kycPanelPath, "utf8");
if (kycPanel.includes("<SectionFieldset") && !kycPanel.includes("function SectionFieldset")) {
  fail("KycPanel uses SectionFieldset without defining it");
} else {
  pass("KycPanel defines SectionFieldset");
}

// — Static: API list guards
const guardFiles = [
  ["web/src/pages/main/Products.jsx", /setCategories\(d\.categories\)\)/],
  ["web/src/pages/main/CategoriesPage.jsx", /setCategories\(d\.categories\)\)/],
  ["web/src/pages/main/AdminDashboard.jsx", /setProducts\(d\.products\)\)/],
];
for (const [rel, badPattern] of guardFiles) {
  const src = readFileSync(join(root, rel), "utf8");
  if (badPattern.test(src)) fail(`Unsafe API assign in ${rel}`);
  else pass(`Safe API fallbacks in ${rel}`);
}

// — Static: invest hero plans link
const landing = readFileSync(join(root, "web/src/components/invest/landing/InvestLandingSections.jsx"), "utf8");
if (landing.includes('href="#plans"')) fail('Invest landing still uses href="#plans"');
else pass("Invest landing uses investHash for plans");

// — HTTP: SPA shell serves index.html (post-build or via API server)
const mainPaths = ["/", "/products", "/categories", "/about", "/contact", "/login"];
const investPaths = ["/", "/login", "/register", "/privacy", "/terms", "/dashboard"];

async function checkSpa(origin, paths, label) {
  let ok = 0;
  for (const p of paths) {
    try {
      const url = `${origin.replace(/\/$/, "")}${p}`;
      const res = await fetch(url, { redirect: "follow" });
      const html = await res.text();
      if (!res.ok) continue;
      if (!html.includes('id="root"') && !html.includes("id='root'")) continue;
      pass(`${label} ${p} → SPA shell`);
      ok++;
    } catch {
      /* API-only local server — fall back to dist check below */
    }
  }
  return ok;
}

const distIndex = join(root, "web/dist/index.html");
function checkBuiltSpa() {
  if (!existsSync(distIndex)) {
    fail("web/dist/index.html missing — run npm run build");
    return;
  }
  const html = readFileSync(distIndex, "utf8");
  if (!html.includes('id="root"')) fail("Built index.html missing React root");
  else pass("Built SPA index.html (production bundle)");
}

console.log("\n— SPA route shells —");
const investOrigin =
  investSite.includes("invest.") || process.env.INVEST_SITE
    ? investSite
    : `${mainSite.replace(/\/$/, "")}/invest`;
const mainOk = await checkSpa(mainSite, mainPaths, "main");
const investOk = await checkSpa(investOrigin, investPaths, "invest");
if (mainOk + investOk === 0) {
  console.log("  (HTTP shell checks skipped — using built dist)");
  checkBuiltSpa();
} else if (mainOk < mainPaths.length || investOk < investPaths.length) {
  fail("Some SPA routes did not return index.html", `main ${mainOk}/${mainPaths.length}, invest ${investOk}/${investPaths.length}`);
}

console.log("\n— API payloads (no null arrays) —");
async function api(path) {
  const res = await fetch(`${base}${path}`);
  try {
    return { ok: res.ok, data: await res.json() };
  } catch {
    return { ok: false, data: null };
  }
}

const cats = await api("/api/main/categories");
if (cats.ok && Array.isArray(cats.data?.categories)) pass("Main categories array");
else fail("Main categories", cats.data?.error || "not array");

const prods = await api("/api/main/products?take=5");
if (prods.ok && Array.isArray(prods.data?.products)) pass("Main products array");
else fail("Main products", prods.data?.error || "not array");

const portal = await api("/api/invest/public/portal-config");
if (portal.ok && portal.data?.investPortalUrl) pass("Invest portal-config");
else fail("Invest portal-config");

console.log(failed ? `\nROUTES AUDIT FAILED — ${failed} issue(s).` : "\nROUTES AUDIT PASSED.");
process.exit(failed ? 1 : 0);
