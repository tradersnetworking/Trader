import { investDb } from "../db.js";
import { mainDb } from "../db.js";
import { config } from "../config.js";

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
];

const DEFAULTS = {
  main_google_login_enabled: "false",
  main_google_client_id: "",
  main_seo_title: "Akshaya EXIM TRADERS — Global Export, Import & B2B Marketplace",
  main_seo_description:
    "Akshaya EXIM TRADERS — global export and import of agricultural products, FMCG, metals, chemicals, medical supplies, and industrial goods. B2B & B2C trade across India and worldwide.",
  main_seo_keywords:
    "export, import, B2B marketplace, EXIM, agricultural export, FMCG trade, metals, chemicals, India export house, Akshaya Exim",
  main_seo_og_image: "/assets/logo.png",
  main_seo_canonical_url: "https://akshayaexim.com",
  main_ga4_measurement_id: "",
  main_gtm_container_id: "",
  main_google_site_verification: "",
  main_bing_site_verification: "",
  main_robots_allow_index: "true",
  main_sitemap_auto_ping: "true",
  main_site_name: "Akshaya EXIM TRADERS",
  main_sitemap_last_ping: "",
  main_json_ld_description:
    "Global export, import and trade marketplace for agricultural, FMCG, metals, chemicals and industrial products.",
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

export async function getMainSiteSettings() {
  return getMap(MAIN_SITE_KEYS);
}

export async function setMainSiteSettings(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    if (!MAIN_SITE_KEYS.includes(key) || value === undefined) continue;
    await investDb.investSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
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
  const settings = await getMainSiteSettings();
  const origin = siteOrigin(settings);
  const staticPaths = [
    "/",
    "/categories",
    "/products",
    "/products?listingType=EXPORT",
    "/products?listingType=IMPORT",
    "/sell",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/returns",
  ];

  const [products, categories] = await Promise.all([
    mainDb.product.findMany({ select: { slug: true, updatedAt: true }, take: 500, orderBy: { updatedAt: "desc" } }),
    mainDb.category.findMany({ select: { slug: true, createdAt: true } }),
  ]);

  const urls = [
    ...staticPaths.map((p) => ({ loc: `${origin}${p}`, lastmod: new Date().toISOString().slice(0, 10) })),
    ...categories.filter((c) => c.slug).map((c) => ({
      loc: `${origin}/categories?cat=${encodeURIComponent(c.slug)}`,
      lastmod: c.createdAt?.toISOString?.()?.slice(0, 10),
    })),
    ...products.filter((p) => p.slug).map((p) => ({
      loc: `${origin}/products/${p.slug}`,
      lastmod: p.updatedAt?.toISOString?.()?.slice(0, 10),
    })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.7</priority></url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function buildRobotsTxt() {
  const settings = await getMainSiteSettings();
  const origin = siteOrigin(settings);
  const allow = settings.main_robots_allow_index !== "false";
  if (!allow) {
    return "User-agent: *\nDisallow: /\n";
  }
  return `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
}

/** Invest subdomain — block all crawlers; never submit to search engines. */
export function buildInvestRobotsTxt() {
  return "User-agent: *\nDisallow: /\n";
}

export async function pingSearchEngines() {
  const settings = await getMainSiteSettings();
  const origin = siteOrigin(settings);
  const sitemapUrl = `${origin}/sitemap.xml`;
  const endpoints = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  const results = [];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "GET" });
      results.push({ url, ok: res.ok, status: res.status });
    } catch (e) {
      results.push({ url, ok: false, error: e.message });
    }
  }
  const stamp = new Date().toISOString();
  await investDb.investSetting.upsert({
    where: { key: "main_sitemap_last_ping" },
    create: { key: "main_sitemap_last_ping", value: stamp },
    update: { value: stamp },
  });
  return { sitemapUrl, pingedAt: stamp, results };
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
