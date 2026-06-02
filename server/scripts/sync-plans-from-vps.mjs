/**
 * Fetch invest plans from production (or a JSON snapshot) and upsert into local invest DB.
 *
 * Usage:
 *   node server/scripts/sync-plans-from-vps.mjs
 *   node server/scripts/sync-plans-from-vps.mjs --url https://invest.akshayaexim.com/api/invest/public/plans
 *   node server/scripts/sync-plans-from-vps.mjs --file scripts/vps-plans-snapshot.json
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { investDb } from "../src/db.js";
import { catalogKey } from "../src/data/investmentPlans.js";
import { annualRoiPct } from "../src/utils/invest.js";
import { dedupeInvestPlans } from "../src/services/investPlans.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const DEFAULT_URL = "https://invest.akshayaexim.com/api/invest/public/plans";
const DEFAULT_FILE = join(repoRoot, "scripts", "vps-plans-snapshot.json");

function parseArgs() {
  const args = process.argv.slice(2);
  let url = process.env.VPS_PLANS_URL || "";
  let file = "";
  let fetchOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) url = args[++i];
    else if (args[i] === "--file" && args[i + 1]) file = args[++i];
    else if (args[i] === "--fetch-only") fetchOnly = true;
  }
  if (!url && !file) url = DEFAULT_URL;
  return { url, file: file || DEFAULT_FILE, fetchOnly };
}

async function loadPlans({ url, file }) {
  if (url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
    const data = await res.json();
    writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    console.log(`Saved snapshot → ${file}`);
    return data.plans || [];
  }
  const raw = readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  return data.plans || data;
}

async function syncPlans(plans) {
  let created = 0;
  let updated = 0;
  const keys = new Set();

  for (const p of plans) {
    const key = catalogKey(p.planType, p.lockInDays);
    keys.add(key);
    const monthly = Number(p.monthlyRoiPct ?? p.profitSharePct ?? 0);
    const data = {
      planType: p.planType,
      name: p.name,
      lockInDays: Number(p.lockInDays),
      minInvestment: Number(p.minInvestment),
      maxInvestment: Number(p.maxInvestment),
      profitSharePct: Number(p.profitSharePct ?? monthly),
      monthlyRoiPct: monthly,
      annualRoiPct: Number(p.annualRoiPct) > 0 ? Number(p.annualRoiPct) : annualRoiPct(monthly),
      settlementCycles: p.settlementCycles || "MONTHLY",
      color: p.color || "#0a3d91",
      description: p.description || null,
      isActive: p.isActive !== false,
    };

    const existing = await investDb.plan.findFirst({
      where: { planType: data.planType, lockInDays: data.lockInDays },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      await investDb.plan.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await investDb.plan.create({ data });
      created += 1;
    }
  }

  const local = await investDb.plan.findMany({ include: { subscriptions: { take: 1 } } });
  let removed = 0;
  for (const row of local) {
    if (!keys.has(catalogKey(row.planType, row.lockInDays)) && row.subscriptions.length === 0) {
      await investDb.plan.delete({ where: { id: row.id } });
      removed += 1;
    }
  }

  const dupes = await dedupeInvestPlans();
  return { created, updated, removed, dupes, total: plans.length };
}

async function main() {
  const { url, file, fetchOnly } = parseArgs();
  console.log(url ? `Fetching plans from ${url}` : `Loading plans from ${file}`);
  const plans = await loadPlans({ url, file });
  if (!plans.length) {
    console.error("No plans in snapshot.");
    process.exit(1);
  }
  if (fetchOnly) {
    console.log(`Fetched ${plans.length} plans (snapshot only).`);
    return;
  }

  const result = await syncPlans(plans);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => investDb.$disconnect());
