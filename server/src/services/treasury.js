import { investDb } from "../db.js";

export async function getTreasurySnapshot() {
  const [wallets, pendingDeposits, pendingPayouts, latest] = await Promise.all([
    investDb.wallet.aggregate({ _sum: { available: true, invested: true, earnings: true } }),
    investDb.deposit.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    investDb.payout.aggregate({ where: { status: { in: ["PENDING", "PROCESSING"] } }, _sum: { amount: true } }),
    investDb.treasurySnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const totalAvailable = wallets._sum.available || 0;
  const totalInvested = wallets._sum.invested || 0;
  const totalEarnings = wallets._sum.earnings || 0;
  const totalLiabilities = totalAvailable + totalInvested + totalEarnings;
  const pendingDep = pendingDeposits._sum.amount || 0;
  const pendingWd = pendingPayouts._sum.amount || 0;

  const ledgerSum = await investDb.ledgerEntry.groupBy({
    by: ["direction"],
    _sum: { amount: true },
  });
  const credits = ledgerSum.find((x) => x.direction === "CREDIT")?._sum.amount || 0;
  const debits = ledgerSum.find((x) => x.direction === "DEBIT")?._sum.amount || 0;
  const driftAmount = Math.round((credits - debits - totalLiabilities) * 100) / 100;

  return {
    totalLiabilities,
    totalAvailable,
    totalInvested,
    totalEarnings,
    pendingDeposits: pendingDep,
    pendingWithdrawals: pendingWd,
    driftAmount,
    lastSnapshot: latest,
    ledgerCredits: credits,
    ledgerDebits: debits,
  };
}

export async function runReconciliation() {
  const snap = await getTreasurySnapshot();
  const row = await investDb.treasurySnapshot.create({
    data: {
      totalLiabilities: snap.totalLiabilities,
      totalAvailable: snap.totalAvailable,
      totalInvested: snap.totalInvested,
      totalEarnings: snap.totalEarnings,
      pendingDeposits: snap.pendingDeposits,
      pendingWithdrawals: snap.pendingWithdrawals,
      driftAmount: snap.driftAmount,
      meta: JSON.stringify({ ledgerCredits: snap.ledgerCredits, ledgerDebits: snap.ledgerDebits }),
    },
  });
  return { snapshot: row, ...snap };
}
