import { investDb } from "../db.js";

const INCOME_TYPES = new Set(["RETURN", "BONUS"]);
const OUTFLOW_TYPES = new Set(["PAYOUT", "INVESTMENT"]);

/** Platform financial summary derived from ledger + operational tables (INR). */
export async function getFinancialReports() {
  const [
    byTypeDir,
    deposits,
    payouts,
    wallets,
    subs,
    roiPaid,
    referralPending,
    referralPaid,
  ] = await Promise.all([
    investDb.ledgerEntry.groupBy({
      by: ["type", "direction"],
      _sum: { amount: true },
      _count: { id: true },
    }),
    investDb.deposit.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { id: true },
    }),
    investDb.payout.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { id: true },
    }),
    investDb.wallet.aggregate({ _sum: { available: true, invested: true, earnings: true }, _count: { id: true } }),
    investDb.subscription.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { id: true },
    }),
    investDb.ledgerEntry.aggregate({
      where: { type: "RETURN", direction: "CREDIT" },
      _sum: { amount: true },
    }),
    investDb.referralEarning.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    investDb.referralEarning.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  const trialBalance = byTypeDir
    .map((row) => ({
      type: row.type,
      direction: row.direction,
      total: row._sum.amount || 0,
      count: row._count.id,
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.direction.localeCompare(b.direction));

  let totalCredits = 0;
  let totalDebits = 0;
  const byType = {};
  for (const row of byTypeDir) {
    const amt = row._sum.amount || 0;
    if (row.direction === "CREDIT") totalCredits += amt;
    else totalDebits += amt;
    byType[row.type] = byType[row.type] || { credit: 0, debit: 0, count: 0 };
    byType[row.type][row.direction === "CREDIT" ? "credit" : "debit"] += amt;
    byType[row.type].count += row._count.id;
  }

  const depositsApproved = deposits.find((d) => d.status === "APPROVED")?._sum.amount || 0;
  const depositsPending = deposits.find((d) => d.status === "PENDING")?._sum.amount || 0;
  const payoutsReleased = payouts.find((p) => p.status === "RELEASED")?._sum.amount || 0;
  const payoutsPending = payouts.filter((p) => ["PENDING", "PROCESSING"].includes(p.status)).reduce((n, p) => n + (p._sum.amount || 0), 0);

  const activeInvested = subs.find((s) => s.status === "ACTIVE")?._sum.amount || 0;
  const maturedInvested = subs.find((s) => s.status === "MATURED")?._sum.amount || 0;

  const incomeTotal = trialBalance
    .filter((r) => r.direction === "CREDIT" && (INCOME_TYPES.has(r.type) || r.type === "DEPOSIT"))
    .reduce((n, r) => n + r.total, 0);

  const expenseTotal = trialBalance
    .filter((r) => r.direction === "DEBIT" && (OUTFLOW_TYPES.has(r.type) || r.type === "ADJUSTMENT"))
    .reduce((n, r) => n + r.total, 0);

  return {
    generatedAt: new Date().toISOString(),
    currency: "INR",
    summary: {
      walletAvailable: wallets._sum.available || 0,
      walletInvested: wallets._sum.invested || 0,
      walletEarnings: wallets._sum.earnings || 0,
      investorWallets: wallets._count.id,
      depositsApproved,
      depositsPending,
      payoutsReleased,
      payoutsPending,
      roiPaidTotal: roiPaid._sum.amount || 0,
      referralPending: referralPending._sum.amount || 0,
      referralPaid: referralPaid._sum.amount || 0,
      activeInvested,
      maturedInvested,
      ledgerCredits: totalCredits,
      ledgerDebits: totalDebits,
      ledgerNet: totalCredits - totalDebits,
    },
    profitAndLoss: {
      incomeLine: incomeTotal,
      expenseLine: expenseTotal,
      netPosition: incomeTotal - expenseTotal,
      note: "Derived from platform ledger categories — not statutory GAAP.",
    },
    trialBalance,
    byType,
  };
}
