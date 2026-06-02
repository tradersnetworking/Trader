/** Plan tiers by investment capital (₹) + lock-in sub-category (months). */

export const PLAN_TYPES = ["STARTER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

/** Minimum wallet top-up (₹) — matches lowest plan tier entry. */
export const MIN_WALLET_DEPOSIT = 100000;

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

/** Capital range per category (in ₹). */
export const PLAN_CAPITAL = {
  STARTER: { min: 100000, max: 500000, label: "₹1 – 5 Lakhs", color: "#2e7d32", monthlyRoiPct: 10 },
  BRONZE: { min: 600000, max: 1000000, label: "₹6 – 10 Lakhs", color: "#a9622b", monthlyRoiPct: 12 },
  SILVER: { min: 1100000, max: 1500000, label: "₹11 – 15 Lakhs", color: "#8a9099", monthlyRoiPct: 15 },
  GOLD: { min: 1600000, max: 3000000, label: "₹16 – 30 Lakhs", color: "#d4a017", monthlyRoiPct: 17 },
  PLATINUM: { min: 3100000, max: 5000000, label: "₹31 – 50 Lakhs", color: "#2f6db5", monthlyRoiPct: 19 },
  DIAMOND: { min: 5000001, max: 50000000, label: "Above ₹50 Lakhs", color: "#7b3fb0", monthlyRoiPct: 20 },
};

/** Standard lock-in sub-categories (months) under each capital category. */
export const LOCK_IN_SUB_CATEGORIES = [1, 3, 6, 12, 24, 36, 60];

/** Recommended lock-in per tier (Akshaya flyer defaults). */
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
  return {
    planType,
    name: `${names[planType] || planType} • ${m} Month${m > 1 ? "s" : ""}`,
    lockInDays: lockInDaysFromMonths(m),
    lockInMonths: m,
    minInvestment: c.min,
    maxInvestment: c.max,
    monthlyRoiPct: c.monthlyRoiPct,
    profitSharePct: c.monthlyRoiPct,
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
