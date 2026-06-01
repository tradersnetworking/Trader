import { investDb } from "../db.js";
import { getSetting } from "./investSettings.js";
import { logAudit } from "./auditLog.js";

async function payEarning(earning, actorMeta = { system: true }) {
  const { addLedger } = await import("../routes/investInvestor.js");
  await addLedger(earning.referrerId, {
    type: "RETURN",
    direction: "CREDIT",
    amount: earning.amount,
    note: "Referral commission paid",
  });
  await investDb.wallet.update({
    where: { investorId: earning.referrerId },
    data: { earnings: { increment: earning.amount } },
  });
  await investDb.referralEarning.update({ where: { id: earning.id }, data: { status: "PAID" } });
  if (!actorMeta.system) {
    await logAudit({
      actorId: actorMeta.actorId,
      actorRole: actorMeta.actorRole,
      actorName: actorMeta.actorName,
      action: "REFERRAL_PAY",
      entity: "ReferralEarning",
      entityId: earning.id,
    });
  }
}

export async function payReferralEarningById(id, actor) {
  const earning = await investDb.referralEarning.findUnique({ where: { id } });
  if (!earning || earning.status !== "PENDING") throw new Error("Invalid earning");
  await payEarning(earning, actor ? { system: false, ...actor } : { system: true });
  return { ok: true };
}

export async function payAllPendingReferrals({ actor, minAmount } = {}) {
  const min = minAmount ?? (Number(await getSetting("referral_min_payout")) || 0);
  const pending = await investDb.referralEarning.findMany({ where: { status: "PENDING" } });
  let paid = 0;
  for (const e of pending) {
    if (e.amount < min) continue;
    await payEarning(e, actor ? { system: false, ...actor } : { system: true });
    paid++;
  }
  return { paid, skipped: pending.length - paid };
}

export async function runReferralAutoPayoutJob() {
  const freq = (await getSetting("referral_payout_frequency")) || "MANUAL";
  const auto = (await getSetting("referral_auto_payout")) === "true";
  if (!auto || !["WEEKLY", "MONTHLY"].includes(freq)) return { skipped: true, reason: freq };

  const lastKey = `referral_last_batch_${freq.toLowerCase()}`;
  const last = await getSetting(lastKey);
  const now = Date.now();
  const intervalMs = freq === "WEEKLY" ? 7 * 86400000 : 30 * 86400000;
  if (last && now - Number(last) < intervalMs) return { skipped: true, reason: "not_due" };

  const result = await payAllPendingReferrals();
  const { setSettings } = await import("./investSettings.js");
  await setSettings({ [lastKey]: String(now) });
  return { ...result, frequency: freq };
}

export async function maybeAutoPayOnCreate(earning) {
  const freq = (await getSetting("referral_payout_frequency")) || "MANUAL";
  const auto = (await getSetting("referral_auto_payout")) === "true";
  if (freq !== "ON_INVEST" || !auto) return earning;
  const min = Number(await getSetting("referral_min_payout")) || 0;
  if (earning.amount < min) return earning;
  await payEarning(earning, { system: true });
  return investDb.referralEarning.findUnique({ where: { id: earning.id } });
}
