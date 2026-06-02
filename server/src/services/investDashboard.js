import { investDb } from "../db.js";
import { monthlyReturn } from "../utils/invest.js";
import { getTodayMaturityStats, calcMaturityProfit } from "./maturityPayments.js";
import { parseQueryDateRange, dateRangeWhere } from "../utils/statsPeriod.js";

const MS_DAY = 86400000;

function daysUntil(date) {
  if (!date) return 0;
  return Math.max(0, Math.ceil((new Date(date) - Date.now()) / MS_DAY));
}

function nextMonthlyPayoutDate(startDate, from = new Date()) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date(from);
  now.setHours(0, 0, 0, 0);
  const next = new Date(start);
  while (next <= now) next.setMonth(next.getMonth() + 1);
  return next;
}

function buildUpcomingMaturities(activeSubs) {
  return activeSubs
    .filter((s) => new Date(s.maturityDate) >= new Date())
    .map((s) => {
      const { profitAmount, maturityValue } = calcMaturityProfit(s);
      return {
        id: s.id,
        planName: s.plan?.name || "Investment",
        principal: s.amount,
        profitAmount,
        maturityValue,
        maturityDate: s.maturityDate,
        daysLeft: daysUntil(s.maturityDate),
        maturityAction: s.maturityAction || null,
      };
    })
    .sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate));
}

function buildNextMonthlyReturn(activeSubs) {
  const events = activeSubs
    .map((s) => {
      const nextDate = nextMonthlyPayoutDate(s.startDate);
      if (nextDate > new Date(s.maturityDate)) return null;
      return {
        subscriptionId: s.id,
        planName: s.plan?.name,
        amount: monthlyReturn(s.amount, s.monthlyRoiPct),
        date: nextDate,
        daysLeft: daysUntil(nextDate),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!events.length) return null;

  const earliest = events[0].date.toISOString().slice(0, 10);
  const sameDay = events.filter((e) => e.date.toISOString().slice(0, 10) === earliest);
  return {
    date: events[0].date,
    daysLeft: events[0].daysLeft,
    amount: sameDay.reduce((n, e) => n + e.amount, 0),
    plans: sameDay.map((e) => e.planName).filter(Boolean),
  };
}

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

function buildPortfolioHistory(ledgerEntries, currentTotal) {
  const sorted = [...ledgerEntries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!sorted.length) {
    if (currentTotal > 0) {
      return [{ date: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" }), value: currentTotal }];
    }
    return [];
  }

  let balance = 0;
  const points = sorted.map((e) => {
    balance += e.direction === "CREDIT" ? e.amount : -e.amount;
    return {
      date: new Date(e.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      value: Math.max(0, Math.round(balance)),
    };
  });

  if (currentTotal > 0 && points.length) {
    points[points.length - 1].value = Math.round(currentTotal);
  }
  return points.slice(-12);
}

function buildMonthlyReturns(ledgerEntries, activeSubs) {
  const months = {};
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[monthKey(d)] = { month: monthLabel(monthKey(d)), return: 0, invested: 0 };
  }

  for (const e of ledgerEntries) {
    if (!["RETURN", "ROI"].includes(e.type)) continue;
    const key = monthKey(e.createdAt);
    if (!months[key]) months[key] = { month: monthLabel(key), return: 0, invested: 0 };
    months[key].return += e.amount;
  }

  const investedTotal = activeSubs.reduce((n, s) => n + s.amount, 0);
  for (const key of Object.keys(months)) {
    months[key].invested = investedTotal;
    if (investedTotal > 0) {
      months[key].returnPct = Math.round((months[key].return / investedTotal) * 1000) / 10;
    } else {
      months[key].returnPct = 0;
    }
  }

  return Object.values(months).map(({ month, return: ret, invested, returnPct }) => ({
    month,
    return: returnPct ?? 0,
    invested,
    amount: Math.round(ret),
  }));
}

export async function getAdminDashboard(query = {}) {
  const { period, from, to, label: periodLabel } = parseQueryDateRange(query);
  const rangeWhere = dateRangeWhere(from, to);

  const [
    investors,
    plans,
    activeSubs,
    pendingKyc,
    pendingDeposits,
    pendingPayouts,
    maturedSubs,
    walletAgg,
    recentLedger,
    recentDeposits,
    recentSubscriptions,
    allPlans,
    activeSubscriptions,
    ledgerByType,
    periodDeposits,
    periodApprovedDeposits,
    periodPayouts,
    periodSuccessPayouts,
    periodSubscriptions,
    periodLedger,
  ] = await Promise.all([
    investDb.investor.count({ where: { role: "INVESTOR" } }),
    investDb.plan.count(),
    investDb.subscription.count({ where: { status: "ACTIVE" } }),
    investDb.kyc.count({ where: { status: "PENDING" } }),
    investDb.deposit.count({ where: { status: "PENDING" } }),
    investDb.payout.count({ where: { status: "PENDING" } }),
    investDb.subscription.count({ where: { status: "MATURED" } }),
    investDb.wallet.aggregate({ _sum: { available: true, invested: true, earnings: true } }),
    investDb.ledgerEntry.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      where: Object.keys(rangeWhere).length ? rangeWhere : undefined,
      include: { investor: { select: { name: true, email: true } } },
    }),
    investDb.deposit.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: Object.keys(rangeWhere).length ? rangeWhere : undefined,
      include: { investor: { select: { name: true, email: true } } },
    }),
    investDb.subscription.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      where: Object.keys(rangeWhere).length ? rangeWhere : undefined,
      include: { investor: { select: { name: true, email: true } }, plan: true },
    }),
    investDb.plan.findMany({ orderBy: { lockInDays: "asc" } }),
    investDb.subscription.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
    investDb.ledgerEntry.groupBy({
      by: ["type"],
      where: Object.keys(rangeWhere).length ? rangeWhere : undefined,
      _sum: { amount: true },
      _count: true,
    }),
    investDb.deposit.aggregate({ _sum: { amount: true }, where: { ...rangeWhere } }),
    investDb.deposit.aggregate({ _sum: { amount: true }, where: { status: "APPROVED", ...rangeWhere } }),
    investDb.payout.aggregate({ _sum: { amount: true }, where: { ...rangeWhere } }),
    investDb.payout.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", ...rangeWhere } }),
    investDb.subscription.aggregate({ _sum: { amount: true }, where: { ...rangeWhere } }),
    investDb.ledgerEntry.aggregate({ _sum: { amount: true }, where: { ...rangeWhere } }),
  ]);

  const invested = await investDb.subscription.aggregate({
    _sum: { amount: true },
    where: { status: "ACTIVE" },
  });

  const planBreakdown = allPlans.map((plan) => {
    const subs = activeSubscriptions.filter((s) => s.planId === plan.id);
    const total = subs.reduce((n, s) => n + s.amount, 0);
    return {
      planId: plan.id,
      planType: plan.planType,
      name: plan.name,
      color: plan.color,
      lockInDays: plan.lockInDays,
      count: subs.length,
      amount: total,
      monthlyRoiPct: plan.monthlyRoiPct,
    };
  });

  const monthlyPayoutEstimate = activeSubscriptions.reduce(
    (n, s) => n + monthlyReturn(s.amount, s.monthlyRoiPct),
    0
  );

  const ledgerSummary = ledgerByType.map((row) => ({
    type: row.type,
    count: row._count,
    volume: row._sum.amount || 0,
  }));

  const totalPortfolio =
    (walletAgg._sum.available || 0) + (walletAgg._sum.invested || 0) + (walletAgg._sum.earnings || 0);

  const todayMaturity = await getTodayMaturityStats();

  return {
    period,
    periodLabel,
    stats: {
      investors,
      plans,
      activeSubs,
      maturedSubs,
      pendingKyc,
      pendingDeposits,
      pendingPayouts,
      totalInvested: invested._sum.amount || 0,
      totalPortfolio,
      walletAvailable: walletAgg._sum.available || 0,
      walletInvested: walletAgg._sum.invested || 0,
      walletEarnings: walletAgg._sum.earnings || 0,
      approvedDeposits: periodApprovedDeposits._sum.amount || 0,
      totalDepositsVolume: periodDeposits._sum.amount || 0,
      successPayouts: periodSuccessPayouts._sum.amount || 0,
      totalPayoutVolume: periodPayouts._sum.amount || 0,
      periodSubscriptions: periodSubscriptions._sum.amount || 0,
      periodLedgerVolume: periodLedger._sum.amount || 0,
      monthlyPayoutEstimate,
      todayMaturityCount: todayMaturity.count,
      todayMaturityTotal: todayMaturity.totalDue,
    },
    planBreakdown,
    ledgerSummary,
    recentLedger,
    recentDeposits,
    recentSubscriptions,
  };
}

export async function getWalletHistory(investorId, query = {}) {
  const { from, to, label: periodLabel } = parseQueryDateRange(query);
  const rangeWhere = dateRangeWhere(from, to);
  const typeFilter = query.type && query.type !== "all" ? String(query.type).toLowerCase() : "all";

  const depositWhere = { investorId, ...rangeWhere };
  const payoutWhere = { investorId, ...rangeWhere };
  const ledgerWhere = { investorId, ...rangeWhere };

  const [deposits, payouts, ledger, wallet] = await Promise.all([
    typeFilter === "all" || typeFilter === "deposit"
      ? investDb.deposit.findMany({ where: depositWhere, orderBy: { createdAt: "desc" }, take: 100 })
      : [],
    typeFilter === "all" || typeFilter === "withdrawal"
      ? investDb.payout.findMany({ where: payoutWhere, orderBy: { createdAt: "desc" }, take: 100 })
      : [],
    investDb.ledgerEntry.findMany({ where: ledgerWhere, orderBy: { createdAt: "desc" }, take: 100 }),
    investDb.wallet.findUnique({ where: { investorId } }),
  ]);

  const approvedDeposits = deposits.filter((d) => d.status === "APPROVED");
  const successPayouts = payouts.filter((p) => p.status === "SUCCESS");

  const payoutTypeLabel = (p) => {
    if (p.payoutKind === "ROI_RETURN") return "ROI PAYOUT";
    if (p.payoutKind === "MANUAL_CREDIT") return "CREDIT";
    return "WITHDRAWAL";
  };

  const payoutAccountDetails = (p) => {
    if (!p.destination) return null;
    if (p.mode === "UPI") return `UPI: ${p.destination}`;
    return `Bank account: ${p.destination}`;
  };

  const requests = [
    ...deposits.map((d) => ({
      id: d.id,
      kind: "deposit",
      type: "DEPOSIT",
      amount: d.amount,
      method: d.method,
      status: d.status,
      reference: d.reference || d.gatewayRef || null,
      paymentRef: d.gatewayRef || d.reference || null,
      gatewayRef: d.gatewayRef,
      remarks: d.remarks,
      accountDetails: "Wallet balance",
      proofImage: d.proofImage,
      createdAt: d.createdAt,
    })),
    ...payouts.map((p) => ({
      id: p.id,
      kind: p.payoutKind === "WITHDRAWAL" ? "withdrawal" : "payout",
      type: payoutTypeLabel(p),
      amount: p.amount,
      method: p.mode || p.gateway,
      status: p.status,
      destination: p.destination,
      reference: p.reference || p.gatewayRef || null,
      paymentRef: p.gatewayRef || p.reference || null,
      gatewayRef: p.gatewayRef,
      remarks: p.remarks,
      payoutKind: p.payoutKind,
      accountDetails: payoutAccountDetails(p),
      createdAt: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    periodLabel,
    wallet: wallet || { available: 0, invested: 0, earnings: 0 },
    kpis: {
      deposited: approvedDeposits.reduce((n, d) => n + d.amount, 0),
      withdrawn: successPayouts.reduce((n, p) => n + p.amount, 0),
      pendingDeposits: deposits.filter((d) => d.status === "PENDING").length,
      pendingPayouts: payouts.filter((p) => p.status === "PENDING").length,
      ledgerCount: ledger.length,
    },
    requests,
    ledger,
  };
}

export async function getInvestorDashboard(investorId, query = {}) {
  const { from, to, label: periodLabel } = parseQueryDateRange(query);
  const rangeWhere = dateRangeWhere(from, to);

  const [wallet, subs, ledger, deposits, payouts, kyc, pendingWithdrawals, maturityPayouts, ledgerForCharts, roiLedger] = await Promise.all([
    investDb.wallet.findUnique({ where: { investorId } }),
    investDb.subscription.findMany({
      where: { investorId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    investDb.ledgerEntry.findMany({
      where: { investorId, ...rangeWhere },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    investDb.deposit.findMany({
      where: { investorId, ...rangeWhere },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    investDb.payout.findMany({
      where: { investorId, ...rangeWhere },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    investDb.kyc.findUnique({ where: { investorId } }),
    investDb.payout.findMany({
      where: { investorId, status: { in: ["PENDING", "PROCESSING"] } },
      orderBy: { createdAt: "desc" },
    }),
    investDb.maturityPayout.findMany({
      where: { investorId, status: { in: ["PENDING", "APPROVED"] } },
      include: { subscription: { include: { plan: true } } },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    investDb.ledgerEntry.findMany({
      where: { investorId },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    investDb.ledgerEntry.findMany({
      where: { investorId, type: { in: ["RETURN", "ROI"] }, ...rangeWhere },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const w = wallet || { available: 0, invested: 0, earnings: 0 };
  const active = subs.filter((s) => s.status === "ACTIVE");
  const monthlyIncome = active.reduce((n, s) => n + monthlyReturn(s.amount, s.monthlyRoiPct), 0);
  const totalPortfolio = w.available + w.invested + w.earnings;

  const planAllocation = active.reduce((acc, s) => {
    const key = s.plan?.planType || "OTHER";
    if (!acc[key]) acc[key] = { planType: key, name: s.plan?.name || key, color: s.plan?.color || "#0a3d91", amount: 0, count: 0 };
    acc[key].amount += s.amount;
    acc[key].count += 1;
    return acc;
  }, {});

  const upcomingMaturities = buildUpcomingMaturities(active);
  const upcomingMaturity = upcomingMaturities[0] || null;
  const nextMonthlyReturn = buildNextMonthlyReturn(active);
  const latestInvestment = subs[0]
    ? {
        id: subs[0].id,
        planName: subs[0].plan?.name || "Investment",
        amount: subs[0].amount,
        status: subs[0].status,
        investedAt: subs[0].createdAt,
        startDate: subs[0].startDate,
        maturityDate: subs[0].maturityDate,
      }
    : null;

  const pendingWithdrawal = pendingWithdrawals[0]
    ? {
        id: pendingWithdrawals[0].id,
        amount: pendingWithdrawals[0].amount,
        mode: pendingWithdrawals[0].mode,
        status: pendingWithdrawals[0].status,
        destination: pendingWithdrawals[0].destination,
        requestedAt: pendingWithdrawals[0].createdAt,
      }
    : null;

  const upcomingSchedule = [
    ...upcomingMaturities.map((m) => ({
      id: `mat-${m.id}`,
      kind: "MATURITY",
      title: m.planName,
      amount: m.profitAmount,
      date: m.maturityDate,
      daysLeft: m.daysLeft,
      meta: `Principal ${m.principal}`,
    })),
    ...pendingWithdrawals.map((p) => ({
      id: `wd-${p.id}`,
      kind: "WITHDRAWAL",
      title: `${p.mode} withdrawal`,
      amount: p.amount,
      date: p.createdAt,
      daysLeft: null,
      meta: p.status,
    })),
    ...(nextMonthlyReturn
      ? [{
          id: "monthly-return",
          kind: "MONTHLY",
          title: "Monthly profit return",
          amount: nextMonthlyReturn.amount,
          date: nextMonthlyReturn.date,
          daysLeft: nextMonthlyReturn.daysLeft,
          meta: nextMonthlyReturn.plans?.slice(0, 2).join(", ") || "Active plans",
        }]
      : []),
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);

  const allocation = [
    { label: "Available", key: "available", value: w.available, color: "#10b981" },
    { label: "Invested", key: "invested", value: w.invested, color: "#3b82f6" },
    { label: "Earnings", key: "earnings", value: w.earnings, color: "#8b5cf6" },
  ].filter((a) => a.value > 0);

  const recentActivity = [
    ...ledger.map((e) => ({
      id: e.id,
      kind: "ledger",
      type: e.type,
      direction: e.direction,
      amount: e.amount,
      note: e.note,
      createdAt: e.createdAt,
    })),
    ...deposits.map((d) => ({
      id: d.id,
      kind: "deposit",
      type: "DEPOSIT",
      direction: "CREDIT",
      amount: d.amount,
      note: `${d.method} • ${d.status}`,
      createdAt: d.createdAt,
    })),
    ...payouts.map((p) => ({
      id: p.id,
      kind: "payout",
      type: "WITHDRAWAL",
      direction: "DEBIT",
      amount: p.amount,
      note: `${p.mode} • ${p.status}`,
      createdAt: p.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);

  return {
    periodLabel,
    wallet: w,
    kyc,
    summary: {
      totalPortfolio,
      monthlyIncome,
      activeInvestments: active.length,
      totalInvested: w.invested,
      totalEarnings: w.earnings,
      available: w.available,
    },
    allocation,
    planAllocation: Object.values(planAllocation),
    upcomingMaturity,
    upcomingMaturities,
    nextMonthlyReturn,
    latestInvestment,
    pendingWithdrawal,
    pendingWithdrawals,
    maturityPayouts,
    upcomingSchedule,
    subscriptions: subs,
    recentActivity,
    recentLedger: ledger,
    charts: {
      portfolioHistory: buildPortfolioHistory(ledgerForCharts, totalPortfolio),
      monthlyReturns: buildMonthlyReturns(roiLedger.length ? roiLedger : ledgerForCharts.filter((e) => ["RETURN", "ROI"].includes(e.type)), active),
      portfolioPie: allocation.map((a) => ({ name: a.label, value: a.value, key: a.key })),
    },
  };
}

export async function getPlatformLedger({ type, limit = 100, investorId } = {}) {
  const where = {};
  if (type) where.type = String(type).toUpperCase();
  if (investorId) where.investorId = investorId;

  const [entries, total, summary] = await Promise.all([
    investDb.ledgerEntry.findMany({
      where,
      take: Math.min(Number(limit) || 100, 500),
      orderBy: { createdAt: "desc" },
      include: { investor: { select: { id: true, name: true, email: true } } },
    }),
    investDb.ledgerEntry.count({ where }),
    investDb.ledgerEntry.groupBy({
      by: ["type", "direction"],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    ledger: entries,
    total,
    summary: summary.map((s) => ({
      type: s.type,
      direction: s.direction,
      count: s._count,
      volume: s._sum.amount || 0,
    })),
  };
}
