import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mainDb, investDb } from "../db.js";
import { normalizePlanRoi } from "../utils/invest.js";
import { resolveHostKindSync } from "./additionalDomains.js";
import { getPublicMainSiteConfig } from "./mainSiteSettings.js";
import {
  SITE_LOGO,
  MAIN_DEFAULT,
  INVEST_PLANS,
  planShareImage,
  productShareImageBySlug,
  isMainHome,
} from "../data/shareImages.js";
import {
  BRAND_MAIN,
  BRAND_INVEST,
  INVEST_HOME_TITLE,
  INVEST_HOME_DESCRIPTION,
} from "../data/brand.js";
import { getSetting } from "./investSettings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAIN_HOME = {
  title: `${BRAND_MAIN} — Global Export, Import & B2B Marketplace`,
  description:
    "AKSHAYA EXIM TRADERS — export and import of agricultural products, food grains, FMCG, metals, chemicals, medical supplies and industrial goods. B2B & B2C trade across India and worldwide.",
};

const INVEST_HOME = {
  title: INVEST_HOME_TITLE,
  description: INVEST_HOME_DESCRIPTION,
};

function effectiveHostKind(req, pathOnly) {
  const hostHeader = req.get("x-forwarded-host") || req.headers.host || req.hostname || "";
  const h = String(hostHeader).toLowerCase().replace(/^www\./, "").split(":")[0];
  if (h.startsWith("invest.")) return "invest";
  const kind = resolveHostKindSync(req);
  if (kind === "local" && (pathOnly === "/invest" || pathOnly.startsWith("/invest/"))) return "invest";
  return kind;
}

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function lockInLabel(lockInDays) {
  const m = Math.max(1, Math.round(Number(lockInDays || 30) / 30));
  return m === 1 ? "1 month" : `${m} months`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function planOgDescription(plan) {
  const monthly = Number(plan.monthlyRoiPct ?? 0);
  const annual = Number(plan.annualRoiPct ?? monthly * 12);
  return `${plan.name}: invest ${formatInr(plan.minInvestment)}–${formatInr(plan.maxInvestment)}, ${monthly}% monthly ROI (~${annual}% p.a.), ${lockInLabel(plan.lockInDays)} lock-in. ${BRAND_INVEST}.`;
}

let investHomeCache = null;
let investHomeCacheAt = 0;

function isMainMarketplaceCopy(text) {
  const s = String(text || "");
  return /marketplace|Global Export|B2B Marketplace|export and import agricultural|request quotes and track orders/i.test(s);
}

function normalizeInvestHomeCopy(title, description) {
  let t = title || INVEST_HOME.title;
  let d = description || INVEST_HOME.description;
  if (isMainMarketplaceCopy(t) || /^Akshaya EXIM TRADERS/i.test(t) || t.includes("Investment Plans & Monthly")) {
    t = INVEST_HOME.title;
  }
  if (isMainMarketplaceCopy(d) || (!/INR/i.test(d) && (/^Explore Akshaya/i.test(d) || /^Invest in Akshaya/i.test(d)))) {
    d = INVEST_HOME.description;
  }
  return { title: t, description: d };
}

function referralShareMeta(code, homeMeta, origin, fullUrl) {
  const ref = String(code || "").trim().toUpperCase();
  return {
    title: `Join ${BRAND_INVEST} — Referral Invite`,
    description: `Invitation to ${BRAND_INVEST}${ref ? ` (referral ${ref})` : ""}. Compare investment plans with published monthly ROI, flexible lock-in, KYC onboarding and secure wallet payouts.`,
    image: absoluteUrl(origin, INVEST_PLANS),
    url: fullUrl.split("#")[0],
    siteName: homeMeta.siteName || BRAND_INVEST,
  };
}

async function getInvestHomeMeta() {
  if (investHomeCache && Date.now() - investHomeCacheAt < 60_000) return investHomeCache;
  try {
    const rawTitle = (await getSetting("homepage_hero_title")) || INVEST_HOME.title;
    const rawDesc = (await getSetting("homepage_hero_subtitle")) || INVEST_HOME.description;
    const { title, description } = normalizeInvestHomeCopy(rawTitle, rawDesc);
    let siteName = (await getSetting("site_name")) || BRAND_INVEST;
    if (/^Akshaya/i.test(siteName) || /Exim (Traders|Invest)/i.test(siteName)) siteName = BRAND_INVEST;
    investHomeCache = { title, description, siteName };
  } catch {
    investHomeCache = { ...INVEST_HOME, siteName: BRAND_INVEST };
  }
  investHomeCacheAt = Date.now();
  return investHomeCache;
}

function requestOrigin(req) {
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host") || "akshayaexim.com";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function absoluteUrl(origin, p) {
  if (!p) return `${origin}${SITE_LOGO}`;
  if (p.startsWith("http")) return p;
  return `${origin}${p.startsWith("/") ? p : `/${p}`}`;
}

let mainSeoCache = null;
let mainSeoCacheAt = 0;

async function getMainPublicConfig() {
  if (mainSeoCache && Date.now() - mainSeoCacheAt < 60_000) return mainSeoCache;
  try {
    mainSeoCache = await getPublicMainSiteConfig();
  } catch {
    mainSeoCache = null;
  }
  mainSeoCacheAt = Date.now();
  return mainSeoCache;
}

/** Resolve OG/title/description/image for the requested HTML page (crawlers + first paint). */
export async function resolveShareMeta(req) {
  const pathOnly = req.path || "/";
  const kind = effectiveHostKind(req, pathOnly);
  const origin = requestOrigin(req);
  const fullUrl = `${origin}${req.originalUrl || req.url || pathOnly}`;
  const planId = req.query?.plan;

  if (kind === "invest" || kind === "invest-alias") {
    if (planId) {
      const plan = await investDb.plan.findFirst({ where: { id: String(planId), isActive: true } });
      if (plan) {
        const p = normalizePlanRoi(plan);
        return {
          title: `${p.name} — ${BRAND_INVEST}`,
          description: planOgDescription(p),
          image: absoluteUrl(origin, planShareImage()),
          url: fullUrl,
          siteName: BRAND_INVEST,
        };
      }
    }

    const refMatch = pathOnly.match(/^\/ref\/([^/]+)/i);
    const refQuery = req.query?.ref;
    if (refMatch || refQuery) {
      const homeMeta = await getInvestHomeMeta();
      const code = refMatch?.[1] || refQuery;
      return referralShareMeta(code, homeMeta, origin, fullUrl);
    }

    const homeMeta = await getInvestHomeMeta();
    const isInvestRoot = pathOnly === "/" || pathOnly === "";
    const canonicalUrl = `${origin}/`;
    return {
      title: isInvestRoot ? INVEST_HOME.title : homeMeta.title,
      description: isInvestRoot ? INVEST_HOME.description : homeMeta.description,
      image: absoluteUrl(origin, INVEST_PLANS),
      url: isInvestRoot ? canonicalUrl : fullUrl.split("#")[0].split("?")[0] || canonicalUrl,
      siteName: homeMeta.siteName || BRAND_INVEST,
    };
  }

  if (kind === "main" || kind === "local") {
    let title = MAIN_HOME.title;
    let description = MAIN_HOME.description;
    let imagePath = isMainHome(pathOnly) ? SITE_LOGO : MAIN_DEFAULT;

    const productSlugMatch = pathOnly.match(/^\/products\/([^/]+)/i);
    if (productSlugMatch) {
      const slug = productSlugMatch[1];
      const p = await mainDb.product.findUnique({
        where: { slug },
        include: { category: { include: { parent: true } } },
      });
      title = p ? `${p.name} — ${BRAND_MAIN}` : `Product — ${BRAND_MAIN}`;
      description =
        p?.description?.slice(0, 220) ||
        "View product details and request an import/export quote on AKSHAYA EXIM TRADERS.";
      imagePath = await productShareImageBySlug(mainDb, slug);
    } else if (pathOnly.startsWith("/products/")) {
      title = `Product — ${BRAND_MAIN}`;
      description =
        "View product details and request an import/export quote on Akshaya EXIM TRADERS — global agricultural, FMCG, metals and industrial trade.";
      imagePath = MAIN_DEFAULT;
    } else if (pathOnly === "/products") {
      title = `Browse Products — ${BRAND_MAIN}`;
      description = "Explore export and import products on AKSHAYA EXIM.";
      imagePath = MAIN_DEFAULT;
    } else if (pathOnly === "/sell") {
      title = `Sell / Export — ${BRAND_MAIN}`;
      description = "Submit your supply offers on Akshaya EXIM.";
      imagePath = MAIN_DEFAULT;
    } else if (pathOnly === "/about") {
      title = `About — ${BRAND_MAIN}`;
      description = "About AKSHAYA EXIM TRADERS — India-based export–import house.";
      imagePath = MAIN_DEFAULT;
    } else if (pathOnly === "/contact") {
      title = `Contact — ${BRAND_MAIN}`;
      description = "Contact AKSHAYA EXIM trade desks.";
      imagePath = MAIN_DEFAULT;
    }

    const cfg = await getMainPublicConfig();
    if (isMainHome(pathOnly)) {
      if (cfg?.seo?.title) title = cfg.seo.title;
      if (cfg?.seo?.description) description = cfg.seo.description;
      imagePath = SITE_LOGO;
    }

    return {
      title,
      description,
      image: absoluteUrl(origin, imagePath),
      url: fullUrl.split("#")[0],
      siteName: cfg?.siteName || BRAND_MAIN,
    };
  }

  return {
    title: MAIN_HOME.title,
    description: MAIN_HOME.description,
    image: absoluteUrl(origin, SITE_LOGO),
    url: fullUrl,
    siteName: BRAND_MAIN,
  };
}

export function injectMetaIntoHtml(html, meta) {
  if (!html || !meta) return html;
  let out = html;

  if (meta.title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);
  }

  const updated = meta.updatedTime || new Date().toISOString();

  const tags = [
    ["name", "description", meta.description],
    ["property", "og:title", meta.title],
    ["property", "og:description", meta.description],
    ["property", "og:type", "website"],
    ["property", "og:site_name", meta.siteName],
    ["property", "og:url", meta.url],
    ["property", "og:image", meta.image],
    ["property", "og:updated_time", updated],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", meta.title],
    ["name", "twitter:description", meta.description],
    ["name", "twitter:image", meta.image],
  ];

  for (const [attr, name, content] of tags) {
    if (!content) continue;
    const escaped = escapeAttr(content);
    const re = new RegExp(`<meta[^>]*${attr}=["']${name}["'][^>]*>`, "i");
    const tag = `<meta ${attr}="${name}" content="${escaped}" />`;
    if (re.test(out)) out = out.replace(re, tag);
    else out = out.replace(/<\/head>/i, `  ${tag}\n</head>`);
  }

  if (meta.url) {
    const linkRe = /<link[^>]*rel=["']canonical["'][^>]*>/i;
    const linkTag = `<link rel="canonical" href="${escapeAttr(meta.url)}" />`;
    if (linkRe.test(out)) out = out.replace(linkRe, linkTag);
    else out = out.replace(/<\/head>/i, `  ${linkTag}\n</head>`);
  }

  return out;
}
