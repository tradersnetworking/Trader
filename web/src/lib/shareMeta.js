/** Titles, descriptions & OG copy for main + invest portals (client + shared with server logic). */

import { investShareUrl } from "./portalConfig.js";
import { inr } from "./format.js";
import {
  SITE_LOGO_IMAGE,
  resolveMainShareImage,
  resolveInvestShareImage,
  absoluteOgImage,
  isInvestHomePath,
} from "./shareImages.js";
import {
  BRAND_MAIN,
  BRAND_INVEST,
  INVEST_HOME_TITLE,
  INVEST_HOME_DESCRIPTION,
} from "./brand.js";

export { BRAND_MAIN, BRAND_INVEST };

export const MAIN_HOME_DEFAULT = {
  title: `${BRAND_MAIN} — Global Export, Import & B2B Marketplace`,
  description:
    "AKSHAYA EXIM TRADERS — export and import of agricultural products, food grains, FMCG, metals, chemicals, medical supplies and industrial goods. B2B & B2C trade across India and worldwide. Request quotes, track orders and grow your business.",
};

export const INVEST_HOME_DEFAULT = {
  title: INVEST_HOME_TITLE,
  description: INVEST_HOME_DESCRIPTION,
};

const MAIN_PAGES = {
  "/products": {
    title: `Browse Products — ${BRAND_MAIN}`,
    description:
      "Explore export and import products on AKSHAYA EXIM — agricultural commodities, FMCG, metals, chemicals, machinery and more. Filter categories, view specs and request bulk quotes.",
  },
  "/sell": {
    title: `Sell / Export With Us — ${BRAND_MAIN}`,
    description:
      "List your supply offers on Akshaya EXIM. Submit product details, quantities and pricing — our trade desk reviews, negotiates and connects you with global buyers.",
  },
  "/categories": {
    title: `Product Categories — ${BRAND_MAIN}`,
    description:
      "Shop by category on AKSHAYA EXIM TRADERS — agricultural, FMCG, metals, chemicals, medical, industrial and specialty export–import lines.",
  },
  "/about": {
    title: `About Us — ${BRAND_MAIN}`,
    description:
      "Learn about AKSHAYA EXIM TRADERS — an India-based export–import house for agricultural products, FMCG, metals, chemicals and industrial goods serving B2B and B2C clients globally.",
  },
  "/contact": {
    title: `Contact Trade Desk — ${BRAND_MAIN}`,
    description:
      "Contact AKSHAYA EXIM for export, import, bulk RFQs and partnerships. General, export, import and support desks — Mon–Sat business hours IST.",
  },
  "/faq": {
    title: `FAQ — ${BRAND_MAIN}`,
    description:
      "Frequently asked questions about trading, quotes, orders, payments and policies on the AKSHAYA EXIM marketplace.",
  },
  "/login": {
    title: `Sign In — ${BRAND_MAIN}`,
    description: "Sign in to your AKSHAYA EXIM TRADERS account — manage quotes, orders, invoices and company profile.",
  },
  "/register": {
    title: `Create Account — ${BRAND_MAIN}`,
    description:
      "Register on AKSHAYA EXIM TRADERS as a buyer or seller. Submit RFQs, track shipments and access B2B trade tools.",
  },
};

function lockInLabel(lockInDays) {
  const m = Math.max(1, Math.round(Number(lockInDays || 30) / 30));
  return m === 1 ? "1 month" : `${m} months`;
}

/** Rich plain-text description for a single investment plan (copy / WhatsApp / share sheet). */
export function buildPlanShareDescription(plan, opts = {}) {
  if (!plan) return "";
  const monthly = Number(plan.monthlyRoiPct ?? 0);
  const annual = Number(plan.annualRoiPct ?? monthly * 12);
  const settlements = String(plan.settlementCycles || "MONTHLY")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase()))
    .join(", ");
  const lines = [
    `📊 ${plan.name} — ${BRAND_INVEST}`,
    "",
    `${plan.planType || "Plan"} tier · ${lockInLabel(plan.lockInDays)} lock-in`,
    `Invest between ${inr(plan.minInvestment)} and ${inr(plan.maxInvestment)}`,
    `Monthly ROI: ${monthly}% · Indicative annual ROI: ~${annual}%`,
    `Returns settled: ${settlements} · Compounding applied at maturity`,
    "KYC-verified investors · Wallet, ledger & agreement trail",
  ];
  if (opts.amount) lines.push(`My investment: ${opts.amount}`);
  if (opts.userName) lines.push(`Shared by ${opts.userName}`);
  lines.push("", "View plan details and register on Akshaya Exim Invest.");
  return lines.join("\n");
}

/** Short OG description (≤ ~300 chars) for link previews. */
export function buildPlanOgDescription(plan) {
  if (!plan) return INVEST_HOME_DEFAULT.description;
  const monthly = Number(plan.monthlyRoiPct ?? 0);
  const annual = Number(plan.annualRoiPct ?? monthly * 12);
  return `${plan.name}: invest ${inr(plan.minInvestment)}–${inr(plan.maxInvestment)}, ${monthly}% monthly ROI (~${annual}% p.a.), ${lockInLabel(plan.lockInDays)} lock-in. Transparent plans on Akshaya Exim Invest.`;
}

/** Invest home OG/title/description (CMS hero or defaults). */
function isMainMarketplaceCopy(text) {
  const s = String(text || "");
  return /marketplace|Global Export|B2B Marketplace|export and import agricultural|request quotes and track orders/i.test(s);
}

export function resolveInvestHomeMeta(homepageCms) {
  let title = homepageCms?.homepage_hero_title || INVEST_HOME_DEFAULT.title;
  let description = homepageCms?.homepage_hero_subtitle || INVEST_HOME_DEFAULT.description;
  if (isMainMarketplaceCopy(title) || /^Akshaya EXIM TRADERS/i.test(title)) title = INVEST_HOME_DEFAULT.title;
  if (isMainMarketplaceCopy(description) || (!/INR/i.test(description) && /^Explore Akshaya/i.test(description))) {
    description = INVEST_HOME_DEFAULT.description;
  }
  return {
    title,
    description,
    image: resolveInvestShareImage("/", null, false),
    siteName: BRAND_INVEST,
  };
}

export function resolveReferralShareMeta(refCode, homepageCms) {
  const home = resolveInvestHomeMeta(homepageCms);
  const ref = String(refCode || "").trim().toUpperCase();
  return {
    ...home,
    title: `Join ${BRAND_INVEST} — Referral Invite`,
    description: `Invitation to ${BRAND_INVEST}${ref ? ` (referral ${ref})` : ""}. Compare investment plans with published monthly ROI, flexible lock-in, KYC onboarding and secure wallet payouts.`,
    image: resolveInvestShareImage("/", null, false),
  };
}

export function resolveMainPageMeta(pathname, siteCfg, product = null) {
  const seo = siteCfg?.seo;
  const homeImage = SITE_LOGO_IMAGE;
  const home = {
    title: seo?.title || MAIN_HOME_DEFAULT.title,
    description: seo?.description || MAIN_HOME_DEFAULT.description,
    image: homeImage,
    siteName: siteCfg?.siteName || BRAND_MAIN,
  };
  if (pathname === "/" || pathname === "") {
    return { ...home, image: homeImage };
  }
  if (pathname.startsWith("/products/")) {
    const name = product?.name || "Product";
    return {
      ...home,
      title: `${name} — ${BRAND_MAIN}`,
      description:
        product?.description?.slice(0, 200) ||
        `View ${name} — specifications, MOQ and import/export quotes on AKSHAYA EXIM TRADERS.`,
      image: resolveMainShareImage(pathname, product),
    };
  }
  for (const [prefix, meta] of Object.entries(MAIN_PAGES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return { ...home, ...meta, image: resolveMainShareImage(pathname, null) };
    }
  }
  return {
    ...home,
    title: `${BRAND_MAIN}`,
    description: home.description,
    image: resolveMainShareImage(pathname, null),
  };
}

export function resolveInvestPageMeta({ pathname, plan, refCode, homepageCms, hasPlanQuery }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (plan) {
    const title = `${plan.name} — ${BRAND_INVEST}`;
    const description = buildPlanOgDescription(plan);
    const url = buildPlanShareUrl(plan.id, refCode);
    return {
      title,
      description,
      image: resolveInvestShareImage(pathname, plan, true),
      siteName: BRAND_INVEST,
      url: url.startsWith("http") ? url : `${origin}${url}`,
    };
  }

  const refMatch = pathname.match(/^\/ref\/([^/]+)/i);
  if (refMatch || refCode) {
    const code = refMatch?.[1] || refCode;
    const meta = resolveReferralShareMeta(code, homepageCms);
    return {
      ...meta,
      url: typeof window !== "undefined" ? window.location.href.split("#")[0] : meta.url,
    };
  }

  const home = resolveInvestHomeMeta(homepageCms);
  return {
    ...home,
    image: resolveInvestShareImage(pathname, null, hasPlanQuery),
  };
}

export function buildPlanShareUrl(planId, referralCode) {
  const base = investShareUrl("/").replace(/\/$/, "");
  const params = new URLSearchParams();
  if (planId) params.set("plan", String(planId));
  if (referralCode) params.set("ref", String(referralCode).trim());
  const qs = params.toString();
  return qs ? `${base}?${qs}#plans` : `${base}#plans`;
}

export function applyDocumentMeta({ title, description, image, url, siteName, robots }) {
  if (typeof document === "undefined") return;
  if (title) document.title = title;

  const upsert = (attr, name, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  const upsertLink = (rel, href) => {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  };

  const img = absoluteOgImage(window.location.origin, image || SITE_LOGO_IMAGE);
  const pageUrl = url || window.location.href;

  upsert("name", "description", description);
  if (robots) upsert("name", "robots", robots);

  upsert("property", "og:title", title);
  upsert("property", "og:description", description);
  upsert("property", "og:type", "website");
  upsert("property", "og:site_name", siteName || BRAND_MAIN);
  upsert("property", "og:url", pageUrl);
  upsert("property", "og:image", img);

  upsert("name", "twitter:card", "summary_large_image");
  upsert("name", "twitter:title", title);
  upsert("name", "twitter:description", description);
  upsert("name", "twitter:image", img);

  upsertLink("canonical", pageUrl.split("#")[0]);
}
