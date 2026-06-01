import { investDb } from "../db.js";
import { settlementPayoutAmount, settlementCycleMs } from "../utils/invest.js";
import { addLedger } from "../routes/investInvestor.js";
import { notifyInvestor } from "./notifications.js";
import { sendPushToUser } from "./pushService.js";

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

    await addLedger(sub.investorId, {
      type: "RETURN",
      direction: "CREDIT",
      amount,
      reference: sub.id,
      note: `${cycle} ROI — ${sub.plan?.name || "Investment"}`,
    });
    await investDb.wallet.update({
      where: { investorId: sub.investorId },
      data: { earnings: { increment: amount } },
    });
    await investDb.roiPayout.create({
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
    await investDb.subscription.update({
      where: { id: sub.id },
      data: { totalPaidOut: { increment: amount }, lastRoiPaidAt: now },
    });
    await notifyInvestorWithPush(sub.investorId, {
      title: "ROI Credited",
      body: `₹${amount.toFixed(2)} ${cycle.toLowerCase()} return credited for ${sub.plan?.name || "your plan"}.`,
      type: "ROI",
    });
    paid++;
  }
  return { processed: paid, at: now.toISOString() };
}
