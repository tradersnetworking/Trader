// Investment math helpers.
// monthlyRoiPct is "profit % per month". Annual ROI ~= monthly * 12.
// Compounding is ONLY applied once the lock-in period is completed.

export const SETTLEMENT_CYCLES = ["WEEKLY", "MONTHLY", "QUARTERLY", "HALFYEARLY", "ANNUALLY"];

export const SETTLEMENT_CYCLE_OPTIONS = [
  { id: "WEEKLY", label: "Weekly", days: 7 },
  { id: "MONTHLY", label: "Monthly", days: 30 },
  { id: "QUARTERLY", label: "Quarterly", days: 90 },
  { id: "HALFYEARLY", label: "Halfyearly", days: 180 },
  { id: "ANNUALLY", label: "Annually", days: 365 },
];

export function normalizeSettlementCycleId(cycle) {
  const c = String(cycle || "MONTHLY").trim().toUpperCase().replace("HALF_YEARLY", "HALFYEARLY");
  return SETTLEMENT_CYCLES.includes(c) ? c : "MONTHLY";
}

export function settlementCycleLabel(cycle) {
  const id = normalizeSettlementCycleId(cycle);
  return SETTLEMENT_CYCLE_OPTIONS.find((o) => o.id === id)?.label || id;
}

export function settlementCycleDays(cycle) {
  const id = normalizeSettlementCycleId(cycle);
  return SETTLEMENT_CYCLE_OPTIONS.find((o) => o.id === id)?.days || 30;
}
const MS_DAY = 86400000;

export function parseSettlementCycles(str) {
  return String(str || "MONTHLY")
    .split(",")
    .map((s) => normalizeSettlementCycleId(s))
    .filter(Boolean);
}

export function settlementCycleMs(cycle) {
  return settlementCycleDays(cycle) * MS_DAY;
}

/** Per-cycle payout amount (monthly ROI is always % per month). */
export function settlementPayoutAmount(principal, monthlyRoiPct, cycle) {
  const monthly = monthlyReturn(principal, monthlyRoiPct);
  const c = normalizeSettlementCycleId(cycle);
  if (c === "WEEKLY") return Math.round((monthly / 4) * 100) / 100;
  if (c === "QUARTERLY") return Math.round(monthly * 3 * 100) / 100;
  if (c === "HALFYEARLY") return Math.round(monthly * 6 * 100) / 100;
  if (c === "ANNUALLY") return Math.round(monthly * 12 * 100) / 100;
  return monthly;
}

export function nextSettlementDate(startDate, lastPaidAt, cycle) {
  const base = lastPaidAt ? new Date(lastPaidAt) : new Date(startDate);
  return new Date(base.getTime() + settlementCycleMs(cycle));
}

export function validateSettlementCycle(plan, cycle) {
  const allowed = parseSettlementCycles(plan?.settlementCycles);
  const defaultCycle = allowed[0] || "MONTHLY";
  const c = normalizeSettlementCycleId(cycle || defaultCycle);
  if (!SETTLEMENT_CYCLES.includes(c)) {
    return { ok: false, error: `Invalid settlement cycle: ${c}` };
  }
  if (allowed.length && !allowed.includes(c)) {
    return {
      ok: false,
      error: `This plan uses ${settlementCycleLabel(defaultCycle)} settlement (${settlementCycleDays(defaultCycle)} days)`,
    };
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

/** Monthly profit share % by lock-in period (same for every capital tier). */
export const LOCK_IN_MONTHLY_ROI_PCT = {
  1: 15,
  3: 16,
  6: 17,
  9: 18,
  12: 19,
  24: 20,
  36: 22,
};

export const PLAN_CAPITAL = {
  STARTER: { min: 100000, max: 500000, label: "₹1 – 5 Lakhs", color: "#2e7d32" },
  BRONZE: { min: 600000, max: 1000000, label: "₹6 – 10 Lakhs", color: "#a9622b" },
  SILVER: { min: 1100000, max: 1500000, label: "₹11 – 15 Lakhs", color: "#8a9099" },
  GOLD: { min: 1600000, max: 3000000, label: "₹16 – 30 Lakhs", color: "#d4a017" },
  PLATINUM: { min: 3100000, max: 5000000, label: "₹31 – 50 Lakhs", color: "#2f6db5" },
  DIAMOND: { min: 5000001, max: 50000000, label: "Above ₹50 Lakhs", color: "#7b3fb0" },
};

export function monthlyRoiForLockInMonths(months) {
  const m = Number(months);
  if (LOCK_IN_MONTHLY_ROI_PCT[m] != null) return LOCK_IN_MONTHLY_ROI_PCT[m];
  const rounded = Math.max(1, Math.round(m));
  if (LOCK_IN_MONTHLY_ROI_PCT[rounded] != null) return LOCK_IN_MONTHLY_ROI_PCT[rounded];
  return LOCK_IN_MONTHLY_ROI_PCT[1];
}

export function monthlyRoiForLockInDays(lockInDays) {
  return monthlyRoiForLockInMonths(lockInMonths(lockInDays));
}

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

/** Use plan ROI from DB; keep stored annual % when set, else monthly × 12. */
export function normalizePlanRoi(plan) {
  if (!plan) return plan;
  const monthly = Number(plan.monthlyRoiPct ?? plan.profitSharePct ?? 0);
  const storedAnnual = Number(plan.annualRoiPct);
  const annual = storedAnnual > 0 ? storedAnnual : annualRoiPct(monthly);
  return {
    ...plan,
    monthlyRoiPct: monthly,
    profitSharePct: Number(plan.profitSharePct ?? monthly),
    annualRoiPct: annual,
    effectiveAnnualRoiPct: effectiveAnnualRoiPct(monthly),
  };
}

export function planCalcPreview(amount, plan, settlementCycle = "MONTHLY") {
  const p = normalizePlanRoi(plan);
  const amt = Number(amount);
  const monthly = Number(p.monthlyRoiPct);
  const cycle = String(settlementCycle || "MONTHLY").toUpperCase();
  const monthlyReturnAmt = monthlyReturn(amt, monthly);
  const simple = simpleMaturity(amt, monthly, p.lockInDays);
  const compounded = compoundedMaturity(amt, monthly, p.lockInDays);
  const months = lockInMonths(p.lockInDays);
  const settlementPayout = settlementPayoutAmount(amt, monthly, cycle);
  const start = new Date();
  const mat = maturityDate(start, p.lockInDays);
  return {
    amount: amt,
    monthlyReturn: monthlyReturnAmt,
    monthlyRoiPct: monthly,
    annualRoiPct: Number(p.annualRoiPct),
    effectiveAnnualRoiPct: effectiveAnnualRoiPct(monthly),
    lockInDays: p.lockInDays,
    lockInMonths: months,
    settlementCycle: cycle,
    settlementPayout,
    settlementLabel: settlementCycleLabel(cycle),
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
