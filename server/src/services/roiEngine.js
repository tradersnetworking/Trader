import { investDb } from "../db.js";
import { settlementPayoutAmount, settlementCycleMs } from "../utils/invest.js";
import { notifyInvestor } from "./notifications.js";
import { sendPushToUser } from "./pushService.js";
import { notifyRoiCredited } from "./investNotifications.js";

export async function notifyInvestorWithPush(investorId, payload) {
  await notifyInvestor(investorId, payload);
  try {
    await sendPushToUser(investorId, { title: payload.title, body: payload.body, url: payload.link });
  } catch {}
}

function cycleMs(cycle) {
  return settlementCycleMs(cycle);
}

function dueForCycle(sub, now) {
  const cycle = sub.settlementCycle || "MONTHLY";
  const last = sub.lastRoiPaidAt ? new Date(sub.lastRoiPaidAt) : new Date(sub.startDate);
  return now.getTime() - last.getTime() >= cycleMs(cycle);
}

export async function runRoiEngineCycle() {
  const now = new Date();
  const subs = await investDb.subscription.findMany({
    where: { status: "ACTIVE", maturityDate: { gt: now } },
    include: { plan: true, investor: true },
  });

  let paid = 0;
  for (const sub of subs) {
    if (!dueForCycle(sub, now)) continue;
    const cycle = sub.settlementCycle || "MONTHLY";
    const amount = settlementPayoutAmount(sub.amount, sub.monthlyRoiPct, cycle);
    if (amount <= 0) continue;

    const periodStart = sub.lastRoiPaidAt ? new Date(sub.lastRoiPaidAt) : new Date(sub.startDate);
    const periodEnd = now;
    const claimWhere = {
      id: sub.id,
      status: "ACTIVE",
      ...(sub.lastRoiPaidAt == null ? { lastRoiPaidAt: null } : { lastRoiPaidAt: sub.lastRoiPaidAt }),
    };

    let roiPayoutId = null;
    let walletAfter = null;
    const credited = await investDb.$transaction(async (tx) => {
      const claimed = await tx.subscription.updateMany({
        where: claimWhere,
        data: { totalPaidOut: { increment: amount }, lastRoiPaidAt: now },
      });
      if (claimed.count === 0) return false;

      const wallet = await tx.wallet.findUnique({ where: { investorId: sub.investorId } });
      if (!wallet) return false;
      const newAvailable = wallet.available + amount;
      await tx.wallet.update({
        where: { investorId: sub.investorId },
        data: { available: newAvailable, earnings: { increment: amount } },
      });
      await tx.ledgerEntry.create({
        data: {
          investorId: sub.investorId,
          type: "RETURN",
          direction: "CREDIT",
          amount,
          balanceAfter: newAvailable,
          reference: sub.id,
          note: `${cycle} ROI — ${sub.plan?.name || "Investment"}`,
        },
      });
      const roiRecord = await tx.roiPayout.create({
        data: {
          subscriptionId: sub.id,
          investorId: sub.investorId,
          amount,
          cycle,
          periodStart,
          periodEnd,
          status: "CREDITED",
        },
      });
      roiPayoutId = roiRecord.id;
      walletAfter = { ...wallet, available: newAvailable, earnings: wallet.earnings + amount };
      return true;
    });

    if (!credited) continue;

    await notifyInvestorWithPush(sub.investorId, {
      title: "ROI Credited",
      body: `₹${amount.toFixed(2)} ${cycle.toLowerCase()} return credited for ${sub.plan?.name || "your plan"}.`,
      type: "ROI",
    });
    if (sub.investor?.email) {
      notifyRoiCredited(sub.investor, {
        subscription: sub,
        plan: sub.plan,
        amount,
        cycle,
        periodStart,
        periodEnd,
        wallet: walletAfter,
        roiPayoutId,
      });
    }
    paid++;
  }
  return { processed: paid, at: now.toISOString() };
}
