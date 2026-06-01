import { investDb } from "../db.js";
import { getSetting } from "./investSettings.js";

async function appendLedger(investorId, { type, direction, amount, reference, note }) {
  let wallet = await investDb.wallet.findUnique({ where: { investorId } });
  if (!wallet) wallet = await investDb.wallet.create({ data: { investorId } });
  const delta = direction === "CREDIT" ? Number(amount) : -Number(amount);
  const newAvailable = wallet.available + delta;
  await investDb.wallet.update({ where: { investorId }, data: { available: newAvailable } });
  return investDb.ledgerEntry.create({
    data: { investorId, type, direction, amount: Number(amount), balanceAfter: newAvailable, reference, note },
  });
}

export async function getEarlyExitSettings() {
  const enabled = (await getSetting("early_exit_enabled")) === "true";
  const penaltyPct = Number(await getSetting("early_exit_penalty_pct")) || 0;
  const forfeitRoi = (await getSetting("early_exit_forfeit_roi")) !== "false";
  return { enabled, penaltyPct, forfeitRoi };
}

export async function previewEarlyExit(subscriptionId, investorId) {
  const settings = await getEarlyExitSettings();
  if (!settings.enabled) return { ok: false, error: "Early exit is not enabled on this platform" };

  const sub = await investDb.subscription.findFirst({
    where: { id: subscriptionId, investorId, status: "ACTIVE" },
    include: { plan: true, roiPayouts: true },
  });
  if (!sub) return { ok: false, error: "Active investment not found" };
  if (new Date() >= new Date(sub.maturityDate)) return { ok: false, error: "Investment has already matured" };

  const principal = sub.amount;
  const penalty = Math.round((principal * settings.penaltyPct) / 100);
  const refund = Math.max(0, principal - penalty);
  const totalRoiPaid = sub.roiPayouts.reduce((n, p) => n + p.amount, 0);
  const roiClawback = settings.forfeitRoi ? totalRoiPaid : 0;
  const netCredit = Math.max(0, refund - roiClawback);

  return {
    ok: true,
    settings,
    subscriptionId: sub.id,
    planName: sub.plan?.name,
    principal,
    penalty,
    penaltyPct: settings.penaltyPct,
    refund,
    totalRoiPaid,
    roiClawback,
    netCredit,
    daysRemaining: Math.max(0, Math.ceil((new Date(sub.maturityDate) - Date.now()) / 86400000)),
  };
}

export async function processEarlyExit(subscriptionId, investorId) {
  const preview = await previewEarlyExit(subscriptionId, investorId);
  if (!preview.ok) return preview;

  const sub = await investDb.subscription.findFirst({
    where: { id: subscriptionId, investorId, status: "ACTIVE" },
  });
  if (!sub) return { ok: false, error: "Active investment not found" };

  const { principal, penalty, refund, roiClawback, netCredit } = preview;

  await investDb.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", maturityAction: "EARLY_EXIT", maturityActionAt: new Date() },
  });

  await investDb.wallet.update({
    where: { investorId },
    data: { invested: { decrement: principal } },
  });

  if (netCredit > 0) {
    await appendLedger(investorId, {
      type: "REFUND",
      direction: "CREDIT",
      amount: netCredit,
      reference: sub.id,
      note: `Early exit — principal refund after ${preview.penaltyPct}% penalty`,
    });
  }

  if (roiClawback > 0) {
    const wallet = await investDb.wallet.findUnique({ where: { investorId } });
    const claw = Math.min(roiClawback, wallet?.available || 0);
    if (claw > 0) {
      await appendLedger(investorId, {
        type: "ADJUSTMENT",
        direction: "DEBIT",
        amount: claw,
        reference: sub.id,
        note: "Early exit — ROI forfeiture",
      });
    }
  }

  return {
    ok: true,
    netCredit,
    penalty,
    roiClawback,
    message: `Early exit processed. ₹${netCredit.toLocaleString("en-IN")} credited to your wallet.`,
  };
}
