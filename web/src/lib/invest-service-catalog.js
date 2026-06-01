/**
 * Akshaya Invest subdomain — investment-only service catalog.
 * Ported from Kuber service-catalog.ts; trading/crypto services are permanently disabled here.
 */

export const INVEST_SERVICE_KEYS = [
  "investment_plans",
  "wallet",
  "kyc",
  "referrals",
  "agreements",
  "support",
];

/** Trading / crypto services — never enabled on invest.akshayaexim.com */
export const EXCLUDED_INVEST_SERVICES = [
  "staking",
  "copy_trading",
  "account_handling",
  "link_accounts",
  "algo_trading",
  "ea_strategies",
  "exchange",
  "mt5",
  "trades",
];

export const INVEST_SERVICE_CATALOG = {
  investment_plans: {
    label: "Investment Plans",
    landingAnchor: "plans",
    enabled: true,
  },
  wallet: { label: "Money Hub", landingAnchor: "payment-methods", enabled: true },
  kyc: { label: "KYC & Compliance", enabled: true },
  referrals: { label: "Referral Program", enabled: true },
  agreements: { label: "Agreements", enabled: true },
  support: { label: "Support", enabled: true },
};

export function isInvestServiceEnabled(key) {
  if (EXCLUDED_INVEST_SERVICES.includes(key)) return false;
  return INVEST_SERVICE_CATALOG[key]?.enabled !== false;
}

/** Landing section order (invest-only — no copy/algo/staking/exchange blocks). */
export const INVEST_LANDING_SECTIONS = [
  "hero",
  "stats",
  "features",
  "plans",
  "calculator",
  "payment-methods",
  "about",
  "partners",
  "trust-cta",
];
