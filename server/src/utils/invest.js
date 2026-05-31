// Investment math helpers.
// monthlyRoiPct is "profit % per month". Annual ROI ~= monthly * 12.
// Compounding is ONLY applied once the lock-in period is completed.

export function monthlyReturn(amount, monthlyRoiPct) {
  return (Number(amount) * Number(monthlyRoiPct)) / 100;
}

export function annualRoiPct(monthlyRoiPct) {
  return Number(monthlyRoiPct) * 12;
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
