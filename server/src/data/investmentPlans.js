/**
 * Investment plan catalog — capital category × lock-in sub-category (months).
 * Category = plan tier by investment capital (₹).
 * Sub-category = lock-in period in months (1–60, multiples of 30 days).
 */
import {
  PLAN_TYPES,
  PLAN_CAPITAL,
  lockInDaysFromMonths,
  annualRoiPct,
  monthlyRoiForLockInMonths,
} from "../utils/invest.js";

/** Lock-in options (months) — ROI depends on duration, not capital tier. */
export const LOCK_IN_SUB_CATEGORIES = [1, 3, 6, 9, 12, 24, 36];

/** Default / recommended lock-in (months) per tier — matches Akshaya flyer. */
export const DEFAULT_LOCK_IN_MONTHS = {
  STARTER: 1,
  BRONZE: 3,
  SILVER: 6,
  GOLD: 12,
  PLATINUM: 24,
  DIAMOND: 36,
};

const TIER_NAMES = {
  STARTER: "Starter",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
};

export function planCatalogEntry(planType, lockInMonths) {
  const cap = PLAN_CAPITAL[planType];
  const m = Number(lockInMonths);
  const monthlyRoiPct = monthlyRoiForLockInMonths(m);
  const capitalLabel = cap.label || planType;
  return {
    planType,
    name: `${TIER_NAMES[planType]} • ${m} Month${m > 1 ? "s" : ""}`,
    lockInDays: lockInDaysFromMonths(m),
    lockInMonths: m,
    minInvestment: cap.min,
    maxInvestment: cap.max,
    monthlyRoiPct,
    profitSharePct: monthlyRoiPct,
    annualRoiPct: annualRoiPct(monthlyRoiPct),
    settlementCycles: "MONTHLY",
    color: cap.color,
    description: `${capitalLabel} • ${m}-month lock-in • ${monthlyRoiPct}% monthly ROI (${annualRoiPct(monthlyRoiPct)}% annual)`,
    isActive: true,
    isDefaultLockIn: DEFAULT_LOCK_IN_MONTHS[planType] === m,
  };
}

/** Full matrix: 6 categories × 7 lock-in sub-categories = 42 plans. */
export function buildPlanCatalog() {
  const plans = [];
  for (const planType of PLAN_TYPES) {
    for (const months of LOCK_IN_SUB_CATEGORIES) {
      plans.push(planCatalogEntry(planType, months));
    }
  }
  return plans;
}

export function catalogKey(planType, lockInDays) {
  return `${planType}:${lockInDays}`;
}
