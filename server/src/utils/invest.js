// Investment math helpers.
// monthlyRoiPct is "profit % per month". Annual ROI ~= monthly * 12.
// Compounding is ONLY applied once the lock-in period is completed.

export const SETTLEMENT_CYCLES = ["WEEKLY", "MONTHLY", "QUARTERLY"];
const MS_DAY = 86400000;

export function parseSettlementCycles(str) {
  return String(str || "MONTHLY")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function settlementCycleMs(cycle) {
  const c = String(cycle || "MONTHLY").toUpperCase();
  if (c === "WEEKLY") return 7 * MS_DAY;
  if (c === "QUARTERLY") return 90 * MS_DAY;
  return 30 * MS_DAY;
}

/** Per-cycle payout amount (weekly = monthly ÷ 4, quarterly = monthly × 3). */
export function settlementPayoutAmount(principal, monthlyRoiPct, cycle) {
  const monthly = monthlyReturn(principal, monthlyRoiPct);
  const c = String(cycle || "MONTHLY").toUpperCase();
  if (c === "WEEKLY") return Math.round((monthly / 4) * 100) / 100;
  if (c === "QUARTERLY") return Math.round(monthly * 3 * 100) / 100;
  return monthly;
}

export function nextSettlementDate(startDate, lastPaidAt, cycle) {
  const base = lastPaidAt ? new Date(lastPaidAt) : new Date(startDate);
  return new Date(base.getTime() + settlementCycleMs(cycle));
}

export function validateSettlementCycle(plan, cycle) {
  const allowed = parseSettlementCycles(plan.settlementCycles);
  const c = String(cycle || "MONTHLY").toUpperCase();
  if (!allowed.includes(c)) {
    return { ok: false, error: `Settlement must be one of: ${allowed.join(", ")}` };
  }
  return { ok: true, cycle: c };
}

/** Plan tiers by investment capital (₹). Lock-in is a separate sub-category (1–60 months). */
export const PLAN_TYPES = ["STARTER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

/** Minimum wallet deposit (₹) — aligned with Starter plan minimum investment. */
export const MIN_WALLET_DEPOSIT = 100000;

/** Sort key for plan tier (STARTER first — not alphabetical). */
export function planTierOrder(planType) {
  const i = PLAN_TYPES.indexOf(String(planType || "").toUpperCase());
  return i === -1 ? PLAN_TYPES.length : i;
}

/** Order plans: STARTER → DIAMOND, then shortest lock-in within each tier. */
export function sortPlansByTier(plans = []) {
  return [...plans].sort((a, b) => {
    const byTier = planTierOrder(a.planType) - planTierOrder(b.planType);
    if (byTier !== 0) return byTier;
    return Number(a.lockInDays || 0) - Number(b.lockInDays || 0);
  });
}

export const PLAN_CAPITAL = {
  STARTER: { min: 100000, max: 500000, label: "₹1 – 5 Lakhs", monthlyRoiPct: 10, color: "#2e7d32" },
  BRONZE: { min: 600000, max: 1000000, label: "₹6 – 10 Lakhs", monthlyRoiPct: 12, color: "#a9622b" },
  SILVER: { min: 1100000, max: 1500000, label: "₹11 – 15 Lakhs", monthlyRoiPct: 15, color: "#8a9099" },
  GOLD: { min: 1600000, max: 3000000, label: "₹16 – 30 Lakhs", monthlyRoiPct: 17, color: "#d4a017" },
  PLATINUM: { min: 3100000, max: 5000000, label: "₹31 – 50 Lakhs", monthlyRoiPct: 19, color: "#2f6db5" },
  DIAMOND: { min: 5000001, max: 50000000, label: "Above ₹50 Lakhs", monthlyRoiPct: 20, color: "#7b3fb0" },
};

export function lockInDaysFromMonths(months) {
  return Math.min(60, Math.max(1, Number(months))) * 30;
}

export function lockInForPlanType(_planType, lockInMonths = 12) {
  return lockInDaysFromMonths(lockInMonths);
}

export function lockInCategoryLabel(lockInDays) {
  const months = Math.max(1, Math.round(Number(lockInDays) / 30));
  return months === 1 ? "1 Month" : `${months} Months`;
}

export function monthlyReturn(amount, monthlyRoiPct) {
  return (Number(amount) * Number(monthlyRoiPct)) / 100;
}

/** Simple linear annual ROI (monthly × 12). */
export function annualRoiPct(monthlyRoiPct) {
  return Number(monthlyRoiPct) * 12;
}

/** Effective annual ROI with monthly compounding: (1 + r/100)^12 − 1. */
export function effectiveAnnualRoiPct(monthlyRoiPct) {
  const r = Number(monthlyRoiPct) / 100;
  return Math.round((Math.pow(1 + r, 12) - 1) * 10000) / 100;
}

export function normalizePlanRoi(plan) {
  if (!plan) return plan;
  const monthly = Number(plan.monthlyRoiPct ?? plan.profitSharePct ?? 0);
  return {
    ...plan,
    monthlyRoiPct: monthly,
    profitSharePct: Number(plan.profitSharePct ?? monthly),
    annualRoiPct: annualRoiPct(monthly),
    effectiveAnnualRoiPct: effectiveAnnualRoiPct(monthly),
  };
}

export function planCalcPreview(amount, plan, settlementCycle = "MONTHLY") {
  const amt = Number(amount);
  const monthly = Number(plan.monthlyRoiPct);
  const cycle = String(settlementCycle || "MONTHLY").toUpperCase();
  const monthlyReturnAmt = monthlyReturn(amt, monthly);
  const simple = simpleMaturity(amt, monthly, plan.lockInDays);
  const compounded = compoundedMaturity(amt, monthly, plan.lockInDays);
  const months = lockInMonths(plan.lockInDays);
  const settlementPayout = settlementPayoutAmount(amt, monthly, cycle);
  const start = new Date();
  const mat = maturityDate(start, plan.lockInDays);
  return {
    amount: amt,
    monthlyReturn: monthlyReturnAmt,
    monthlyRoiPct: monthly,
    annualRoiPct: annualRoiPct(monthly),
    effectiveAnnualRoiPct: effectiveAnnualRoiPct(monthly),
    lockInDays: plan.lockInDays,
    lockInMonths: months,
    settlementCycle: cycle,
    settlementPayout,
    settlementLabel: cycle === "WEEKLY" ? "Weekly" : cycle === "QUARTERLY" ? "Quarterly" : "Monthly",
    nextSettlementDate: nextSettlementDate(start, null, cycle).toISOString(),
    maturityDate: mat.toISOString(),
    simple,
    compounded,
    totalSimpleProfit: simple.totalReturn,
    totalRoiTillMaturity: simple.totalReturn,
    capitalReturned: amt,
    expectedTotalReturn: simple.maturityValue,
    compoundingAvailable: "After lock-in completes only",
    note: "Monthly returns are paid during lock-in per your settlement cycle. Compounding applies only after lock-in completes.",
  };
}

export function lockInMonths(lockInDays) {
  return Math.max(1, Math.round(Number(lockInDays) / 30));
}

// Simple (non-compounded) total return over the lock-in period.
export function simpleMaturity(amount, monthlyRoiPct, lockInDays) {
  const months = lockInMonths(lockInDays);
  const totalReturn = monthlyReturn(amount, monthlyRoiPct) * months;
  return { months, totalReturn, maturityValue: Number(amount) + totalReturn };
}

// Compounded maturity (monthly compounding) - only valid after lock-in completes.
export function compoundedMaturity(amount, monthlyRoiPct, lockInDays) {
  const months = lockInMonths(lockInDays);
  const r = Number(monthlyRoiPct) / 100;
  const maturityValue = Number(amount) * Math.pow(1 + r, months);
  return { months, totalReturn: maturityValue - Number(amount), maturityValue };
}

export function maturityDate(startDate, lockInDays) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + Number(lockInDays));
  return d;
}
