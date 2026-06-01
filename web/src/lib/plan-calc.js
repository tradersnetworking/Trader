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

export function parseSettlementCycles(str) {
  return String(str || "MONTHLY")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function settlementPayoutAmount(principal, monthlyRoiPct, cycle) {
  const monthly = monthlyReturn(principal, monthlyRoiPct);
  const c = String(cycle || "MONTHLY").toUpperCase();
  if (c === "WEEKLY") return Math.round((monthly / 4) * 100) / 100;
  if (c === "QUARTERLY") return Math.round(monthly * 3 * 100) / 100;
  return monthly;
}

export function maturityDate(startDate, lockInDays) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + Number(lockInDays));
  return d;
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
  const mat = maturityDate(new Date(), plan.lockInDays);
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
