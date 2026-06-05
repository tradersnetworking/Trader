import { investDb } from "../db.js";
import { getSetting } from "./investSettings.js";

const DEFAULT_PCT = 1;

export async function getPlatformCommissionPct() {
  const raw = await getSetting("platform_commission_pct");
  if (raw === null || raw === undefined || raw === "") return DEFAULT_PCT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PCT;
}

let cachedSuperAdminId = null;
let cacheAt = 0;

async function resolveSuperAdminId() {
  if (cachedSuperAdminId && Date.now() - cacheAt < 300_000) return cachedSuperAdminId;
  const row = await investDb.investor.findFirst({
    where: { role: "SUPERADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  cachedSuperAdminId = row?.id || null;
  cacheAt = Date.now();
  return cachedSuperAdminId;
}

/**
 * Credit flat platform commission to Super Admin on every investor deposit or investment
 * (applies with or without referral / direct signup).
 */
export async function creditPlatformCommission(investorId, amount, { kind, referenceId }) {
  const pct = await getPlatformCommissionPct();
  if (pct <= 0) return null;

  const superAdminId = await resolveSuperAdminId();
  if (!superAdminId || superAdminId === investorId) return null;

  const base = Number(amount);
  if (!Number.isFinite(base) || base <= 0) return null;

  const commission = Math.round((base * pct) / 100 * 100) / 100;
  if (commission <= 0) return null;

  const ref = String(referenceId || `${kind}-${investorId}-${Date.now()}`);
  const marker = `[${kind}:${ref}]`;

  const existing = await investDb.referralEarning.findFirst({
    where: { referrerId: superAdminId, note: { contains: marker } },
  });
  if (existing) return existing;

  const earning = await investDb.referralEarning.create({
    data: {
      referrerId: superAdminId,
      referredId: investorId,
      amount: commission,
      status: "PENDING",
      note: `Platform ${pct}% on ${kind} ${marker}`,
    },
  });

  const { maybeAutoPayOnCreate } = await import("./referralPayoutJob.js");
  return (await maybeAutoPayOnCreate(earning)) || earning;
}

export async function creditPlatformCommissionOnDeposit(investorId, amount, depositId) {
  return creditPlatformCommission(investorId, amount, { kind: "DEPOSIT", referenceId: depositId });
}

export async function creditPlatformCommissionOnInvestment(investorId, amount, subscriptionId) {
  return creditPlatformCommission(investorId, amount, { kind: "INVESTMENT", referenceId: subscriptionId });
}
