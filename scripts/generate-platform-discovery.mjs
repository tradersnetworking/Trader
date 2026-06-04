#!/usr/bin/env node
/** Scan route modules and emit docs/PLATFORM_DISCOVERY.md */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverRoutes = path.join(root, "server/src/routes");

function extractRoutes(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const base = path.basename(filePath, ".js");
  const prefix =
    {
      investAuth: "/api/invest/auth",
      investPublic: "/api/invest/public",
      investInvestor: "/api/invest",
      investAdmin: "/api/invest/admin",
      investSecurity: "/api/invest/security",
      investWebhooks: "/api/invest/webhooks",
      mainAuth: "/api/main/auth",
      marketplace: "/api/main",
    }[base] || `/api/${base}`;

  const routes = [];
  const re = /router\.(get|post|put|patch|delete)\(\s*[\n\r\s]*["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = re.exec(text))) {
    routes.push({ method: m[1].toUpperCase(), path: `${prefix}${m[2]}` });
  }
  return routes;
}

const files = fs
  .readdirSync(serverRoutes)
  .filter((f) => f.endsWith(".js") && f.startsWith("invest"))
  .sort();

let all = [];
for (const f of files) {
  all = all.concat(extractRoutes(path.join(serverRoutes, f)));
}
all.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

const cronJobs = [
  { name: "roi-engine", interval: "1h", lock: "roiRunning", file: "backgroundJobs.js → roiEngine.js" },
  { name: "maturity-notifications", interval: "MATURITY_JOB_INTERVAL_MS (6h default)", file: "maturityNotifications.js" },
  { name: "treasury-reconciliation", interval: "24h", lock: "treasuryRunning", file: "treasury.js" },
  { name: "support-mail-sync", interval: "5m", lock: "mailRunning", file: "supportMail.js" },
  { name: "referral-auto-payout", interval: "24h", file: "referralPayoutJob.js" },
  { name: "roi-payout-reminder", interval: "24h", file: "roiPayoutReminders.js" },
];

const webRoutes = [
  "/", "/login", "/register", "/forgot-password", "/reset-password",
  "/dashboard", "/onboarding", "/admin",
  "/privacy", "/terms", "/risk-disclosure", "/aml-policy", "/cookie-policy",
  "/verify-certificate", "/ref/:code",
];

const permissions = [
  "view_dashboard", "manage_investors", "review_kyc", "approve_deposits",
  "approve_withdrawals", "treasury", "manage_settings", "broadcast_notifications",
  "manage_plans", "manage_gateways", "manage_cms", "view_audit_logs",
];

const out = path.join(root, "docs/PLATFORM_DISCOVERY.md");
const md = `# Platform Discovery Map

**Generated:** ${new Date().toISOString().slice(0, 10)}  
**Source:** \`scripts/generate-platform-discovery.mjs\`

## Frontend routes (invest subdomain)

| Path | Surface |
|------|---------|
${webRoutes.map((p) => `| \`${p}\` | Investor / auth / legal SPA |`).join("\n")}

Admin tabs are driven by \`web/src/lib/invest-nav.js\` + \`AdminDashboard.jsx\` (lazy panels).

## Invest API routes (${all.length} endpoints)

| Method | Path |
|--------|------|
${all.map((r) => `| ${r.method} | \`${r.path}\` |`).join("\n")}

## Background jobs

| Job | Interval | Overlap guard | Implementation |
|-----|----------|---------------|----------------|
${cronJobs.map((j) => `| ${j.name} | ${j.interval} | ${j.lock || "in-process mutex"} | ${j.file} |`).join("\n")}

## RBAC permissions (invest admin)

${permissions.map((p) => `- \`${p}\``).join("\n")}

## Integrations

| Channel | Config | Routes / services |
|---------|--------|-------------------|
| SMTP | deploy/.env | \`sendMail\`, login OTP, KYC/maturity mail |
| WhatsApp | platform settings | notification templates |
| Telegram | platform settings | admin alerts |
| Payment gateways | \`PaymentGateway\` model | Razorpay, Cashfree, PayU, Stripe webhooks |
| Crypto deposits | public deposit-accounts | USDT TRC20/BEP20, TRX, BNB |
| Redis | \`REDIS_URL\` | rate limits (\`redisRateLimit.js\`) |
| ClamAV | \`KYC_VIRUS_SCAN_CMD\` | KYC staged uploads |

## Data flow (invest)

\`\`\`
Browser → Nginx (SSL, 100m body) → Express
  → auth/public/investor/admin/security/webhooks
  → Prisma (Investor, Wallet, LedgerEntry, Deposit, Payout, Subscription, Kyc, …)
  → Jobs: ROI, maturity, referral pay, treasury snapshot
\`\`\`

Regenerate: \`node scripts/generate-platform-discovery.mjs\`
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(`Wrote ${out} (${all.length} API routes)`);
