/** Main marketplace (akshayaexim.com / .in) — SEO defaults (invest subdomain excluded). */

export const MAIN_CANONICAL_ORIGIN = "https://akshayaexim.com";

export const MAIN_MIRROR_ORIGINS = [
  "https://akshayaexim.com",
  "https://www.akshayaexim.com",
  "https://akshayaexim.in",
  "https://www.akshayaexim.in",
];

export const MAIN_STATIC_SEO_PATHS = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/categories", priority: "0.9", changefreq: "weekly" },
  { path: "/products", priority: "0.9", changefreq: "daily" },
  { path: "/products?listingType=EXPORT", priority: "0.85", changefreq: "daily" },
  { path: "/products?listingType=IMPORT", priority: "0.85", changefreq: "daily" },
  { path: "/sell", priority: "0.8", changefreq: "weekly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/faq", priority: "0.65", changefreq: "monthly" },
  { path: "/privacy", priority: "0.6", changefreq: "yearly" },
  { path: "/terms", priority: "0.6", changefreq: "yearly" },
  { path: "/returns", priority: "0.65", changefreq: "yearly" },
];

export const MAIN_SEO_DEFAULTS = {
  title: "AKSHAYA EXIM TRADERS — Global Export, Import & B2B Marketplace India",
  description:
    "AKSHAYA EXIM TRADERS — India export house for agricultural products, food grains, FMCG, metals, chemicals, medical supplies and industrial goods. B2B & B2C import export, bulk quotes, online payments. Mumbai trade desk +91 99495 75426.",
  keywords:
    "Akshaya Exim, export from India, import to India, B2B marketplace, EXIM traders, agricultural export, FMCG export, metals export, chemicals export, bulk RFQ, global trade, Mumbai export house, akshayaexim.com, akshayaexim.in",
  jsonLdDescription:
    "Global export, import and B2B marketplace for agricultural, FMCG, metals, chemicals, medical and industrial products — Akshaya Exim Traders, India.",
};
