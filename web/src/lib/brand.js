/** Shared brand strings for SEO, OG tags, and UI copy. */

export const BRAND_MAIN = "AKSHAYA EXIM TRADERS";
/** Display name for the invest portal (all UI, SEO, agreements — not email addresses). */
export const BRAND_INVEST = "AKSHYA INVESTMENTS";
/** Header / beside-logo site title (title case). */
export const INVEST_SITE_TITLE_1 = "Akshya";
export const INVEST_SITE_TITLE_2 = "Investments";

export const INVEST_HOME_TITLE = "Smart Investment • Secure Future • Grow Your Wealth";
export const INVEST_HERO_SUBTITLE =
  "Invest with AKSHYA INVESTMENTS and earn consistent monthly returns in INR. Flexible lock-in periods, transparent profit sharing, and 100% capital secure.";

export const INVEST_HOME_DESCRIPTION = INVEST_HERO_SUBTITLE;

/** Hero subtitle from CMS, with fallback when DB still has the previous copy. */
export function resolveInvestHeroSubtitle(value) {
  const raw = (value && String(value).trim()) || INVEST_HERO_SUBTITLE;
  if (/Invest with Akshaya Investments/i.test(raw) || /AKASHYA INVESTMENTS/i.test(raw) || /capital secured/i.test(raw)) {
    return INVEST_HERO_SUBTITLE;
  }
  return raw;
}

const INVEST_BRAND_REPLACEMENTS = [
  [/AKASHYA\s+INVESTMENTS/gi, BRAND_INVEST],
  [/Akashya\s+Investments/gi, BRAND_INVEST],
  [/Invest in Akshaya Exim Traders/gi, `Invest with ${BRAND_INVEST}`],
  [/Invest in AKSHAYA Exim Traders/gi, `Invest with ${BRAND_INVEST}`],
  [/About Akshaya Exim Invest/gi, `About ${BRAND_INVEST}`],
  [/About AKSHAYA Exim Invest/gi, `About ${BRAND_INVEST}`],
  [/About AKSHYA INVESTMENTS/gi, `About ${BRAND_INVEST}`],
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
