/** Shared brand strings for SEO, OG tags, and UI copy. */

export const BRAND_MAIN = "AKSHAYA EXIM TRADERS";
/** Display name for the invest portal (all UI, SEO, agreements — not email addresses). */
export const BRAND_INVEST = "AKASHYA INVESTMENTS";

export const INVEST_HOME_TITLE = "Smart Investment • Secure Future • Grow Your Wealth";
export const INVEST_HERO_SUBTITLE =
  "Invest with Akshaya Investments and earn consistent monthly returns in INR. Flexible lock-in periods, transparent profit sharing, and 100% capital secured.";

export const INVEST_HOME_DESCRIPTION = INVEST_HERO_SUBTITLE;

const INVEST_BRAND_REPLACEMENTS = [
  [/Invest in Akshaya Exim Traders/gi, "Invest with Akshaya Investments"],
  [/Invest in AKSHAYA Exim Traders/gi, "Invest with Akshaya Investments"],
  [/Invest with AKASHYA INVESTMENTS/gi, "Invest with Akshaya Investments"],
  [/About Akshaya Exim Invest/gi, `About ${BRAND_INVEST}`],
  [/About AKSHAYA Exim Invest/gi, `About ${BRAND_INVEST}`],
  [/About Akashya Investments/gi, `About ${BRAND_INVEST}`],
  [/Akshaya Exim Traders/gi, BRAND_INVEST],
  [/AKSHAYA Exim Traders/gi, BRAND_INVEST],
  [/Akshaya Exim Invest/gi, BRAND_INVEST],
  [/AKSHAYA Exim Invest/gi, BRAND_INVEST],
  [/Akshaya Invest/gi, BRAND_INVEST],
];

export function normalizeInvestBrandingText(value) {
  if (!value || typeof value !== "string") return value;
  let next = value;
  for (const [pattern, replacement] of INVEST_BRAND_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}
