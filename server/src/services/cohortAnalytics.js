import { investDb } from "../db.js";

export async function getCohortAnalytics(months = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const investors = await investDb.investor.findMany({
    where: { role: "INVESTOR", createdAt: { gte: since } },
    select: { id: true, createdAt: true, kyc: { select: { status: true } }, deposits: { select: { status: true, amount: true } } },
    orderBy: { createdAt: "asc" },
  });

  const cohorts = {};
  for (const inv of investors) {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!cohorts[key]) cohorts[key] = { month: key, signups: 0, kycApproved: 0, firstDeposit: 0, depositTotal: 0 };
    cohorts[key].signups++;
    if (inv.kyc?.status === "APPROVED") cohorts[key].kycApproved++;
    const approved = inv.deposits.filter((dep) => dep.status === "APPROVED");
    if (approved.length) {
      cohorts[key].firstDeposit++;
      cohorts[key].depositTotal += approved.reduce((s, x) => s + x.amount, 0);
    }
  }

  const rows = Object.values(cohorts).map((c) => ({
    ...c,
    kycRate: c.signups ? Math.round((c.kycApproved / c.signups) * 100) : 0,
    depositRate: c.signups ? Math.round((c.firstDeposit / c.signups) * 100) : 0,
  }));

  const summary = rows.reduce(
    (acc, c) => ({
      signups: acc.signups + c.signups,
      kycApproved: acc.kycApproved + c.kycApproved,
      firstDeposit: acc.firstDeposit + c.firstDeposit,
      depositTotal: acc.depositTotal + c.depositTotal,
    }),
    { signups: 0, kycApproved: 0, firstDeposit: 0, depositTotal: 0 }
  );

  return { cohorts: rows, summary, months };
}
