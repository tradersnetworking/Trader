import { investDb } from "../db.js";
import { mainDb } from "../db.js";
import { config } from "../config.js";
import {
  DEFAULT_MAIN_CONTACT_PAGE,
  MAIN_SUPPORT_EMAIL,
  MAIN_SUPPORT_PHONE,
  MAIN_SUPPORT_WHATSAPP,
  normalizePublicContact,
} from "../constants/mainContact.js";
import { MAIN_SEO_DEFAULTS } from "../constants/mainSeo.js";
import {
  buildMainRobotsTxt,
  buildMainSitemapXml,
  submitMainSiteToSearchEngines,
} from "./mainSeo.js";

export const MAIN_SITE_KEYS = [
  "main_google_login_enabled",
  "main_google_client_id",
  "main_seo_title",
  "main_seo_description",
  "main_seo_keywords",
  "main_seo_og_image",
  "main_seo_canonical_url",
  "main_ga4_measurement_id",
  "main_gtm_container_id",
  "main_google_site_verification",
  "main_bing_site_verification",
  "main_robots_allow_index",
  "main_sitemap_auto_ping",
  "main_site_name",
  "main_sitemap_last_ping",
  "main_json_ld_description",
  "main_contact_page",
  "main_support_telegram",
];

const DEFAULT_CONTACT_PAGE = DEFAULT_MAIN_CONTACT_PAGE;

const DEFAULTS = {
  main_google_login_enabled: "false",
  main_google_client_id: "",
  main_seo_title: MAIN_SEO_DEFAULTS.title,
  main_seo_description: MAIN_SEO_DEFAULTS.description,
  main_seo_keywords: MAIN_SEO_DEFAULTS.keywords,
  main_seo_og_image: "/assets/logo.png",
  main_seo_canonical_url: "https://akshayaexim.com",
  main_ga4_measurement_id: "",
  main_gtm_container_id: "",
  main_google_site_verification: "",
  main_bing_site_verification: "",
  main_robots_allow_index: "true",
  main_sitemap_auto_ping: "true",
  main_site_name: "AKSHAYA EXIM TRADERS",
  main_sitemap_last_ping: "",
  main_json_ld_description: MAIN_SEO_DEFAULTS.jsonLdDescription,
  main_contact_page: JSON.stringify(DEFAULT_CONTACT_PAGE),
  main_support_telegram: "",
};

async function getRaw(key) {
  const row = await investDb.investSetting.findUnique({ where: { key } });
  if (row?.value != null && row.value !== "") return row.value;
  return DEFAULTS[key] ?? "";
}

async function getMap(keys = MAIN_SITE_KEYS) {
  const rows = await investDb.investSetting.findMany({ where: { key: { in: keys } } });
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export function parseContactPage(raw) {
  if (!raw) return normalizePublicContact(DEFAULT_CONTACT_PAGE);
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return normalizePublicContact({
      intro: parsed.intro ?? DEFAULT_CONTACT_PAGE.intro,
      desks: parsed.desks,
      office: parsed.office,
    });
  } catch {
    return normalizePublicContact(DEFAULT_CONTACT_PAGE);
  }
}

export async function getContactPageConfig() {
  const raw = await getRaw("main_contact_page");
  return parseContactPage(raw);
}

export async function getMainSiteSettings() {
  const settings = await getMap(MAIN_SITE_KEYS);
  return settings;
}

export async function setMainSiteSettings(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    if (!MAIN_SITE_KEYS.includes(key) || value === undefined) continue;
    const stored = key === "main_contact_page" && typeof value === "object"
      ? JSON.stringify(parseContactPage(value))
      : String(value);
    await investDb.investSetting.upsert({
      where: { key },
      create: { key, value: stored },
      update: { value: stored },
    });
  }
  return getMainSiteSettings();
}

export async function getEffectiveGoogleClientId() {
  const fromDb = await getRaw("main_google_client_id");
  return fromDb || config.googleClientId || "";
}

export async function isGoogleLoginEnabled() {
  const enabled = (await getRaw("main_google_login_enabled")) === "true";
  const clientId = await getEffectiveGoogleClientId();
  return enabled && Boolean(clientId);
}

export async function getPublicMainSiteConfig() {
  const s = await getMainSiteSettings();
  const googleLoginEnabled = s.main_google_login_enabled === "true";
  const clientId = (await getEffectiveGoogleClientId()) || "";
  return {
    siteName: s.main_site_name,
    seo: {
      title: s.main_seo_title,
      description: s.main_seo_description,
      keywords: s.main_seo_keywords,
      ogImage: s.main_seo_og_image,
      canonicalUrl: s.main_seo_canonical_url,
      jsonLdDescription: s.main_json_ld_description,
    },
    googleLoginEnabled: googleLoginEnabled && Boolean(clientId),
    googleClientId: googleLoginEnabled && clientId ? clientId : "",
    analytics: {
      ga4MeasurementId: s.main_ga4_measurement_id || "",
      gtmContainerId: s.main_gtm_container_id || "",
    },
    verification: {
      google: s.main_google_site_verification || "",
      bing: s.main_bing_site_verification || "",
    },
    robotsAllowIndex: s.main_robots_allow_index !== "false",
    contact: normalizePublicContact(parseContactPage(s.main_contact_page)),
    supportLinks: {
      phone: MAIN_SUPPORT_PHONE,
      phoneTel: "+919949575426",
      whatsapp: MAIN_SUPPORT_WHATSAPP,
      telegram: (await getRaw("main_support_telegram")) || (await getRaw("support_telegram")) || "",
      email: MAIN_SUPPORT_EMAIL,
    },
  };
}

function siteOrigin(settings) {
  const raw = settings.main_seo_canonical_url || DEFAULTS.main_seo_canonical_url;
  try {
    return new URL(raw).origin;
  } catch {
    return "https://akshayaexim.com";
  }
}

export async function buildSitemapXml() {
  return buildMainSitemapXml(await getMainSiteSettings());
}

export async function buildRobotsTxt() {
  return buildMainRobotsTxt(await getMainSiteSettings());
}

/** Invest subdomain — block all crawlers; never submit to search engines. */
export function buildInvestRobotsTxt() {
  return "User-agent: *\nDisallow: /\n";
}

export async function pingSearchEngines() {
  const settings = await getMainSiteSettings();
  const out = await submitMainSiteToSearchEngines(settings);
  return {
    sitemapUrl: out.sitemapUrl,
    pingedAt: out.pingedAt,
    urlCount: out.urlCount,
    results: out.ping,
    indexNow: out.indexNow,
  };
}

export async function getMainSiteAdminStats() {
  const settings = await getMainSiteSettings();
  const origin = siteOrigin(settings);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [users, products, quotes, orders, openQuotes, invoices, newUsers, newQuotes, recentUsers] =
    await Promise.all([
      mainDb.user.count(),
      mainDb.product.count(),
      mainDb.quote.count(),
      mainDb.order.count(),
      mainDb.quote.count({ where: { status: "PENDING" } }),
      mainDb.invoice.count(),
      mainDb.user.count({ where: { createdAt: { gte: since } } }),
      mainDb.quote.count({ where: { createdAt: { gte: since } } }),
      mainDb.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

  const clientId = await getEffectiveGoogleClientId();
  return {
    marketplace: { users, products, quotes, orders, openQuotes, invoices, newUsers30d: newUsers, newQuotes30d: newQuotes },
    recentUsers,
    integrations: {
      googleLogin: {
        enabled: settings.main_google_login_enabled === "true",
        configured: Boolean(clientId),
        clientIdSet: Boolean(clientId),
      },
      ga4: { configured: Boolean(settings.main_ga4_measurement_id), id: settings.main_ga4_measurement_id || null },
      gtm: { configured: Boolean(settings.main_gtm_container_id), id: settings.main_gtm_container_id || null },
      searchConsole: { configured: Boolean(settings.main_google_site_verification) },
      bing: { configured: Boolean(settings.main_bing_site_verification) },
      sitemapUrl: `${origin}/sitemap.xml`,
      robotsUrl: `${origin}/robots.txt`,
      lastSitemapPing: settings.main_sitemap_last_ping || null,
      robotsAllowIndex: settings.main_robots_allow_index !== "false",
    },
  };
}
