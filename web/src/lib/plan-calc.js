/** Client-side investment math — mirrors server/src/utils/invest.js */

export function monthlyReturn(amount, monthlyRoiPct) {
  return (Number(amount) * Number(monthlyRoiPct)) / 100;
}

export function annualRoiPct(monthlyRoiPct) {
  return Number(monthlyRoiPct) * 12;
}

export function effectiveAnnualRoiPct(monthlyRoiPct) {
  const r = Number(monthlyRoiPct) / 100;
  return Math.round((Math.pow(1 + r, 12) - 1) * 10000) / 100;
}

export function lockInMonths(lockInDays) {
  return Math.max(1, Math.round(Number(lockInDays) / 30));
}

export function simpleMaturity(amount, monthlyRoiPct, lockInDays) {
  const months = lockInMonths(lockInDays);
  const totalReturn = monthlyReturn(amount, monthlyRoiPct) * months;
  return { months, totalReturn, maturityValue: Number(amount) + totalReturn };
}

export function compoundedMaturity(amount, monthlyRoiPct, lockInDays) {
  const months = lockInMonths(lockInDays);
  const r = Number(monthlyRoiPct) / 100;
  const maturityValue = Number(amount) * Math.pow(1 + r, months);
  return { months, totalReturn: maturityValue - Number(amount), maturityValue };
}

export const SETTLEMENT_CYCLE_OPTIONS = [
  { id: "WEEKLY", label: "Weekly", days: 7 },
  { id: "MONTHLY", label: "Monthly", days: 30 },
  { id: "QUARTERLY", label: "Quarterly", days: 90 },
  { id: "HALFYEARLY", label: "Halfyearly", days: 180 },
  { id: "ANNUALLY", label: "Annually", days: 365 },
];

export function normalizeSettlementCycleId(cycle) {
  const c = String(cycle || "MONTHLY").trim().toUpperCase().replace("HALF_YEARLY", "HALFYEARLY");
  const ids = SETTLEMENT_CYCLE_OPTIONS.map((o) => o.id);
  return ids.includes(c) ? c : "MONTHLY";
}

export function settlementCycleLabel(cycle) {
  const id = normalizeSettlementCycleId(cycle);
  return SETTLEMENT_CYCLE_OPTIONS.find((o) => o.id === id)?.label || id;
}

export function settlementCycleDays(cycle) {
  const id = normalizeSettlementCycleId(cycle);
  return SETTLEMENT_CYCLE_OPTIONS.find((o) => o.id === id)?.days || 30;
}

export function parseSettlementCycles(str) {
  return String(str || "MONTHLY")
    .split(",")
    .map((s) => normalizeSettlementCycleId(s))
    .filter(Boolean);
}

export function formatSettlementCyclesDisplay(str) {
  return parseSettlementCycles(str)
    .map((id) => {
      const opt = SETTLEMENT_CYCLE_OPTIONS.find((o) => o.id === id);
      return opt ? `${opt.label} (${opt.days} days)` : id;
    })
    .join(" · ");
}

export function settlementPayoutAmount(principal, monthlyRoiPct, cycle) {
  const monthly = monthlyReturn(principal, monthlyRoiPct);
  const c = normalizeSettlementCycleId(cycle);
  if (c === "WEEKLY") return Math.round((monthly / 4) * 100) / 100;
  if (c === "QUARTERLY") return Math.round(monthly * 3 * 100) / 100;
  if (c === "HALFYEARLY") return Math.round(monthly * 6 * 100) / 100;
  if (c === "ANNUALLY") return Math.round(monthly * 12 * 100) / 100;
  return monthly;
}

export function maturityDate(startDate, lockInDays) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + Number(lockInDays));
  return d;
}

/** Use plan ROI from API/DB (same rules as server normalizePlanRoi). */
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
  const amt = Number(amount);
  const p = normalizePlanRoi(plan);
  const monthly = Number(p.monthlyRoiPct);
  const cycle = normalizeSettlementCycleId(settlementCycle);
  const monthlyReturnAmt = monthlyReturn(amt, monthly);
  const simple = simpleMaturity(amt, monthly, p.lockInDays);
  const compounded = compoundedMaturity(amt, monthly, p.lockInDays);
  const months = lockInMonths(p.lockInDays);
  const settlementPayout = settlementPayoutAmount(amt, monthly, cycle);
  const mat = maturityDate(new Date(), p.lockInDays);
  const annual = Number(p.annualRoiPct);
  return {
    amount: amt,
    monthlyReturn: monthlyReturnAmt,
    monthlyRoiPct: monthly,
    annualRoiPct: annual,
    effectiveAnnualRoiPct: effectiveAnnualRoiPct(monthly),
    lockInDays: p.lockInDays,
    lockInMonths: months,
    settlementCycle: cycle,
    settlementPayout,
    settlementLabel: settlementCycleLabel(cycle),
    maturityDate: mat.toISOString(),
    simple,
    compounded,
    totalSimpleProfit: simple.totalReturn,
    totalRoiTillMaturity: simple.totalReturn,
    capitalReturned: amt,
    expectedTotalReturn: simple.maturityValue,
    compoundingAvailable: "After lock-in completes only",
    note: "Returns paid during lock-in per settlement cycle. Compounding only after lock-in completes.",
  };
}
