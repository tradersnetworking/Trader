/** Plan tiers by investment capital (₹) + lock-in sub-category (months). */

export const PLAN_TYPES = ["STARTER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

/** Minimum wallet top-up (₹) — matches lowest plan tier entry. */
export const MIN_WALLET_DEPOSIT = 100000;

/** Monthly profit share % by lock-in (same for every capital tier). */
export const LOCK_IN_MONTHLY_ROI_PCT = {
  1: 15,
  3: 16,
  6: 17,
  9: 18,
  12: 19,
  24: 20,
  36: 22,
};

export function resolveDefaultDepositAmount(suggestedAmount) {
  const n = Number(suggestedAmount);
  if (n > 0) return Math.max(MIN_WALLET_DEPOSIT, Math.ceil(n));
  return MIN_WALLET_DEPOSIT;
}

export function planTierOrder(planType) {
  const i = PLAN_TYPES.indexOf(String(planType || "").toUpperCase());
  return i === -1 ? PLAN_TYPES.length : i;
}

/** STARTER first, then lock-in ascending within each tier. */
export function sortPlansByTier(plans = []) {
  return [...plans].sort((a, b) => {
    const byTier = planTierOrder(a.planType) - planTierOrder(b.planType);
    if (byTier !== 0) return byTier;
    return Number(a.lockInDays || 0) - Number(b.lockInDays || 0);
  });
}

/** Format ROI % for UI (no trailing .0). */
export function formatRoiPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

export function monthlyRoiForLockInMonths(months) {
  const m = Number(months);
  if (LOCK_IN_MONTHLY_ROI_PCT[m] != null) return LOCK_IN_MONTHLY_ROI_PCT[m];
  const rounded = Math.max(1, Math.round(m));
  if (LOCK_IN_MONTHLY_ROI_PCT[rounded] != null) return LOCK_IN_MONTHLY_ROI_PCT[rounded];
  return LOCK_IN_MONTHLY_ROI_PCT[1];
}

export function monthlyRoiForLockInDays(lockInDays) {
  return monthlyRoiForLockInMonths(lockInMonthsFromDays(lockInDays));
}

/** Monthly + annual ROI labels for a tier from actual plans in that tier. */
export function tierRoiFromPlans(tierPlans = []) {
  if (!tierPlans.length) return { monthlyLabel: "—", annualLabel: "—" };
  const monthlies = tierPlans.map((p) => Number(p.monthlyRoiPct)).filter(Number.isFinite);
  const annuals = tierPlans
    .map((p) => Number(p.annualRoiPct ?? Number(p.monthlyRoiPct) * 12))
    .filter(Number.isFinite);
  const mMin = Math.min(...monthlies);
  const mMax = Math.max(...monthlies);
  const aMin = Math.min(...annuals);
  const aMax = Math.max(...annuals);
  return {
    monthlyLabel: mMin === mMax ? formatRoiPct(mMin) : `${formatRoiPct(mMin)}–${formatRoiPct(mMax)}`,
    annualLabel: aMin === aMax ? formatRoiPct(aMin) : `${formatRoiPct(aMin)}–${formatRoiPct(aMax)}`,
  };
}

/** Min/max monthly & annual ROI across all plans (for homepage stats). */
export function planRoiRange(plans = []) {
  if (!plans.length) {
    return { monthlyMin: 15, monthlyMax: 22, annualMin: 180, annualMax: 264 };
  }
  const monthlies = plans.map((p) => Number(p.monthlyRoiPct)).filter(Number.isFinite);
  const annuals = plans
    .map((p) => Number(p.annualRoiPct ?? Number(p.monthlyRoiPct) * 12))
    .filter(Number.isFinite);
  return {
    monthlyMin: Math.min(...monthlies),
    monthlyMax: Math.max(...monthlies),
    annualMin: Math.min(...annuals),
    annualMax: Math.max(...annuals),
  };
}

/** Capital range per category (₹). */
export const PLAN_CAPITAL = {
  STARTER: { min: 100000, max: 500000, label: "₹1 – 5 Lakhs", color: "#2e7d32" },
  BRONZE: { min: 600000, max: 1000000, label: "₹6 – 10 Lakhs", color: "#a9622b" },
  SILVER: { min: 1100000, max: 1500000, label: "₹11 – 15 Lakhs", color: "#8a9099" },
  GOLD: { min: 1600000, max: 3000000, label: "₹16 – 30 Lakhs", color: "#d4a017" },
  PLATINUM: { min: 3100000, max: 5000000, label: "₹31 – 50 Lakhs", color: "#2f6db5" },
  DIAMOND: { min: 5000001, max: 50000000, label: "Above ₹50 Lakhs", color: "#7b3fb0" },
};

/** Lock-in options (months) — monthly ROI from LOCK_IN_MONTHLY_ROI_PCT. */
export const LOCK_IN_SUB_CATEGORIES = [1, 3, 6, 9, 12, 24, 36];

/** Recommended lock-in per tier (default “popular” plan). */
export const DEFAULT_LOCK_IN_MONTHS = {
  STARTER: 1,
  BRONZE: 3,
  SILVER: 6,
  GOLD: 12,
  PLATINUM: 24,
  DIAMOND: 36,
};

export const LOCK_IN_MONTHS_OPTIONS = Array.from({ length: 60 }, (_, i) => i + 1);

export function lockInDaysFromMonths(months) {
  return Number(months) * 30;
}

export function lockInMonthsFromDays(days) {
  return Math.max(1, Math.round(Number(days) / 30));
}

export function lockInCategoryLabel(lockInDays) {
  const m = lockInMonthsFromDays(lockInDays);
  return m === 1 ? "1 Month" : `${m} Months`;
}

export function planFormFromCategory(planType, lockInMonths = 12) {
  const c = PLAN_CAPITAL[planType] || PLAN_CAPITAL.STARTER;
  const names = { STARTER: "Starter", BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", PLATINUM: "Platinum", DIAMOND: "Diamond" };
  const m = Number(lockInMonths) || 12;
  const monthlyRoiPct = monthlyRoiForLockInMonths(m);
  return {
    planType,
    name: `${names[planType] || planType} • ${m} Month${m > 1 ? "s" : ""}`,
    lockInDays: lockInDaysFromMonths(m),
    lockInMonths: m,
    minInvestment: c.min,
    maxInvestment: c.max,
    monthlyRoiPct,
    profitSharePct: monthlyRoiPct,
    color: c.color,
    capitalLabel: c.label,
  };
}

export function validatePlanCapital(planType, amount) {
  const c = PLAN_CAPITAL[planType];
  if (!c) return { ok: false, error: "Invalid plan category" };
  const amt = Number(amount);
  if (amt < c.min || amt > c.max) {
    return { ok: false, error: `Amount for ${planType} must be between ₹${c.min.toLocaleString("en-IN")} and ₹${c.max.toLocaleString("en-IN")}` };
  }
  return { ok: true };
}
