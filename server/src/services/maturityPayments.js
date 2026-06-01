import { investDb } from "../db.js";
import { monthlyReturn, simpleMaturity, compoundedMaturity } from "../utils/invest.js";
import { addLedger } from "../routes/investInvestor.js";
import { notifyMaturityProfitReleased } from "./investNotifications.js";
import { purgeAgreementsForSubscription } from "./agreements.js";

const MS_DAY = 86400000;

export function calcMaturityProfit(sub) {
  const matured = new Date() >= new Date(sub.maturityDate);
  const proj = matured
    ? compoundedMaturity(sub.amount, sub.monthlyRoiPct, sub.lockInDays)
    : simpleMaturity(sub.amount, sub.monthlyRoiPct, sub.lockInDays);
  return {
    profitAmount: proj.totalReturn,
    maturityValue: proj.maturityValue,
    principal: sub.amount,
  };
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function returnPrincipalToWallet(investorId, amount, reference, note) {
  if (amount <= 0) return;
  await addLedger(investorId, {
    type: "RETURN",
    direction: "CREDIT",
    amount,
    reference,
    note,
  });
  await investDb.wallet.update({
    where: { investorId },
    data: { available: { increment: amount }, invested: { decrement: amount } },
  });
}

export async function completeSubscriptionMaturity(subscriptionId, reason = "Maturity settled") {
  await investDb.subscription.update({
    where: { id: subscriptionId },
    data: { status: "MATURED" },
  });
  await purgeAgreementsForSubscription(subscriptionId, reason);
}

export async function ensureMaturityPayout(sub) {
  const existing = await investDb.maturityPayout.findFirst({
    where: { subscriptionId: sub.id },
  });
  if (existing) return existing;
  const { profitAmount, principal } = calcMaturityProfit(sub);
  return investDb.maturityPayout.create({
    data: {
      subscriptionId: sub.id,
      investorId: sub.investorId,
      profitAmount,
      principal,
      investorChoice: sub.maturityAction || "WALLET",
      status: "PENDING",
      dueDate: sub.maturityDate,
    },
  });
}

export async function getTodayMaturityStats() {
  const start = startOfDay();
  const end = endOfDay();
  const payouts = await investDb.maturityPayout.findMany({
    where: { dueDate: { gte: start, lte: end }, status: "PENDING" },
    include: { investor: true, subscription: { include: { plan: true } } },
  });
  const totalDue = payouts.reduce((n, p) => n + p.profitAmount, 0);
  return { count: payouts.length, totalDue, payouts };
}

export async function getTodayPendingPayments() {
  const { payouts } = await getTodayMaturityStats();
  return payouts;
}

export async function getUpcomingPayments(months = 6) {
  const tomorrow = new Date(startOfDay().getTime() + MS_DAY);
  const end = new Date(tomorrow.getTime() + months * 30 * MS_DAY);
  const payouts = await investDb.maturityPayout.findMany({
    where: {
      dueDate: { gte: tomorrow, lte: end },
      status: { in: ["PENDING", "APPROVED"] },
    },
    include: { investor: true, subscription: { include: { plan: true } } },
    orderBy: { dueDate: "asc" },
  });
  const subs = await investDb.subscription.findMany({
    where: {
      status: "ACTIVE",
      maturityDate: { gte: tomorrow, lte: end },
    },
    include: { investor: true, plan: true },
    orderBy: { maturityDate: "asc" },
  });
  const withPayoutIds = new Set(payouts.map((p) => p.subscriptionId));
  const projected = subs
    .filter((s) => !withPayoutIds.has(s.id))
    .map((s) => {
      const { profitAmount, principal } = calcMaturityProfit(s);
      return {
        id: `proj-${s.id}`,
        subscriptionId: s.id,
        investorId: s.investorId,
        profitAmount,
        principal,
        investorChoice: s.maturityAction || "—",
        status: "SCHEDULED",
        dueDate: s.maturityDate,
        investor: s.investor,
        subscription: s,
        projected: true,
      };
    });
  return [...payouts, ...projected].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

export async function approveMaturityPayout(id, adminRemarks) {
  const payout = await investDb.maturityPayout.findUnique({
    where: { id },
    include: { investor: true, subscription: { include: { plan: true } } },
  });
  if (!payout) throw Object.assign(new Error("Not found"), { status: 404 });
  if (payout.status === "COMPLETED") throw Object.assign(new Error("Already completed"), { status: 400 });

  const choice = payout.investorChoice || payout.subscription?.maturityAction || "WALLET";
  const sub = payout.subscription;

  if (choice === "WITHDRAW") {
    const investor = payout.investor;
    const total = payout.profitAmount + payout.principal;
    const mode = investor?.upiId ? "UPI" : "BANK";
    const destination =
      mode === "UPI"
        ? investor.upiId
        : `${investor?.bankName || "Bank"} · ${investor?.accountNumber?.slice(-4) || "****"}`;

    await investDb.payout.create({
      data: {
        investorId: payout.investorId,
        amount: total,
        mode,
        destination: destination || "—",
        status: "PENDING",
        remarks: `Maturity withdrawal — ${sub?.plan?.name || "Plan"}`,
        reference: `MATURITY:${payout.subscriptionId}:${payout.id}`,
      },
    });

    await investDb.wallet.update({
      where: { investorId: payout.investorId },
      data: {
        invested: { decrement: payout.principal },
        earnings: { increment: payout.profitAmount },
      },
    });

    await investDb.maturityPayout.update({
      where: { id },
      data: { status: "APPROVED", remarks: adminRemarks || "Approved — release via payout" },
    });
  } else {
    await addLedger(payout.investorId, {
      type: "RETURN",
      direction: "CREDIT",
      amount: payout.profitAmount,
      reference: payout.id,
      note: choice === "REINVEST" ? "Maturity profit — reinvest in wallet" : "Maturity profit credited to wallet",
    });
    await investDb.wallet.update({
      where: { investorId: payout.investorId },
      data: {
        available: { increment: payout.profitAmount },
        earnings: { increment: payout.profitAmount },
      },
    });

    await returnPrincipalToWallet(
      payout.investorId,
      payout.principal,
      payout.subscriptionId,
      `Principal returned — ${sub?.plan?.name || "Plan"} matured`
    );

    await investDb.maturityPayout.update({
      where: { id },
      data: { status: "COMPLETED", processedAt: new Date(), remarks: adminRemarks || null },
    });

    await completeSubscriptionMaturity(payout.subscriptionId, "Maturity settled — profit & principal processed");

    if (payout.investor) notifyMaturityProfitReleased(payout.investor, payout, choice);
  }

  return investDb.maturityPayout.findUnique({
    where: { id },
    include: { investor: true, subscription: { include: { plan: true } } },
  });
}

/** Called when admin releases a maturity-linked payout successfully */
export async function onMaturityPayoutReleased(payoutRecord) {
  const ref = payoutRecord.reference || "";
  if (!ref.startsWith("MATURITY:")) return false;

  const [, subscriptionId, maturityPayoutId] = ref.split(":");
  if (!subscriptionId) return false;

  if (maturityPayoutId) {
    await investDb.maturityPayout.updateMany({
      where: { id: maturityPayoutId, status: "APPROVED" },
      data: { status: "COMPLETED", processedAt: new Date() },
    });
  }

  await completeSubscriptionMaturity(subscriptionId, "Maturity withdrawal completed");
  return true;
}

export async function rejectMaturityPayout(id, remarks) {
  const payout = await investDb.maturityPayout.update({
    where: { id },
    data: { status: "REJECTED", remarks: remarks || "Rejected", processedAt: new Date() },
    include: { investor: true },
  });
  return payout;
}

export async function getInvestorMaturityChoices(investorId) {
  const tomorrow = new Date(startOfDay().getTime() + MS_DAY);
  const dayAfter = new Date(startOfDay().getTime() + 2 * MS_DAY);
  return investDb.subscription.findMany({
    where: {
      investorId,
      status: "ACTIVE",
      maturityAction: null,
      maturityDate: { gte: tomorrow, lte: dayAfter },
    },
    include: { plan: true },
  });
}
