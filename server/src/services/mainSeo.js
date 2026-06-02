import crypto from "crypto";
import { investDb } from "../db.js";
import { mainDb } from "../db.js";
import {
  MAIN_CANONICAL_ORIGIN,
  MAIN_MIRROR_ORIGINS,
  MAIN_SEO_DEFAULTS,
  MAIN_STATIC_SEO_PATHS,
} from "../constants/mainSeo.js";
import { MAIN_SUPPORT_EMAIL, MAIN_SUPPORT_PHONE, MAIN_SUPPORT_PHONE_TEL } from "../constants/mainContact.js";

const INDEXNOW_KEY_SETTING = "main_indexnow_key";
const INDEXNOW_HOST = "akshayaexim.com";

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function canonicalOrigin(settings) {
  const raw = settings?.main_seo_canonical_url || MAIN_CANONICAL_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return MAIN_CANONICAL_ORIGIN;
  }
}

export async function getOrCreateIndexNowKey() {
  const row = await investDb.investSetting.findUnique({ where: { key: INDEXNOW_KEY_SETTING } });
  if (row?.value) return row.value;
  const key = crypto.randomBytes(16).toString("hex");
  await investDb.investSetting.upsert({
    where: { key: INDEXNOW_KEY_SETTING },
    create: { key: INDEXNOW_KEY_SETTING, value: key },
    update: { value: key },
  });
  return key;
}

function hreflangLinks(path, origins = MAIN_MIRROR_ORIGINS) {
  return origins
    .map((o) => `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${o}${path}`)}" />`)
    .join("\n");
}

export async function collectMainSitemapUrls(settings) {
  const origin = canonicalOrigin(settings);
  const today = new Date().toISOString().slice(0, 10);

  const [products, categories] = await Promise.all([
    mainDb.product.findMany({ select: { slug: true, updatedAt: true }, take: 2000, orderBy: { updatedAt: "desc" } }),
    mainDb.category.findMany({ select: { slug: true, createdAt: true } }),
  ]);

  const staticUrls = MAIN_STATIC_SEO_PATHS.map((s) => ({
    loc: `${origin}${s.path}`,
    lastmod: today,
    changefreq: s.changefreq,
    priority: s.priority,
    pathOnly: s.path.split("?")[0],
  }));

  const categoryUrls = categories
    .filter((c) => c.slug)
    .map((c) => ({
      loc: `${origin}/categories?cat=${encodeURIComponent(c.slug)}`,
      lastmod: c.createdAt?.toISOString?.()?.slice(0, 10) || today,
      changefreq: "weekly",
      priority: "0.75",
      pathOnly: "/categories",
    }));

  const productUrls = products
    .filter((p) => p.slug)
    .map((p) => ({
      loc: `${origin}/products/${p.slug}`,
      lastmod: p.updatedAt?.toISOString?.()?.slice(0, 10) || today,
      changefreq: "weekly",
      priority: "0.7",
      pathOnly: `/products/${p.slug}`,
    }));

  return [...staticUrls, ...categoryUrls, ...productUrls];
}

export async function buildMainSitemapXml(settings) {
  const urls = await collectMainSitemapUrls(settings);
  const body = urls
    .map((u) => {
      const path = u.loc.replace(canonicalOrigin(settings), "") || "/";
      const alternates = hreflangLinks(path);
      return `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${alternates}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;
}

export async function buildMainRobotsTxt(settings) {
  const origin = canonicalOrigin(settings);
  const allow = settings?.main_robots_allow_index !== "false";
  if (!allow) {
    return "User-agent: *\nDisallow: /\n";
  }
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /dashboard",
    "Disallow: /admin",
    "Disallow: /staff-login",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /api/",
    "",
    "User-agent: Googlebot",
    "Allow: /",
    "",
    "User-agent: Bingbot",
    "Allow: /",
    "",
    "User-agent: Yandex",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    `Sitemap: https://akshayaexim.in/sitemap.xml`,
  ];
  return `${lines.join("\n")}\n`;
}

async function pingGet(url) {
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(15000) });
    return { url, ok: res.ok, status: res.status };
  } catch (e) {
    return { url, ok: false, error: e.message };
  }
}

async function submitIndexNow(urlList, key) {
  const keyLocation = `https://${INDEXNOW_HOST}/${key}.txt`;
  const payload = {
    host: INDEXNOW_HOST,
    key,
    keyLocation,
    urlList: urlList.slice(0, 10_000),
  };
  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
  ];
  const results = [];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      results.push({ endpoint, ok: res.ok || res.status === 202, status: res.status });
    } catch (e) {
      results.push({ endpoint, ok: false, error: e.message });
    }
  }
  return results;
}

/** Notify Google, Bing, Yandex & IndexNow (Bing/Yandex/Seznam ecosystem). Main site only. */
export async function submitMainSiteToSearchEngines(settings) {
  const origin = canonicalOrigin(settings);
  const sitemapUrl = `${origin}/sitemap.xml`;
  const urls = await collectMainSitemapUrls(settings);
  const locs = urls.map((u) => u.loc);

  const pingResults = await Promise.all([
    pingGet(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
    pingGet(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
    pingGet(`https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
  ]);

  const indexNowKey = await getOrCreateIndexNowKey();
  const indexNowResults = await submitIndexNow(locs, indexNowKey);

  const stamp = new Date().toISOString();
  await investDb.investSetting.upsert({
    where: { key: "main_sitemap_last_ping" },
    create: { key: "main_sitemap_last_ping", value: stamp },
    update: { value: stamp },
  });

  return {
    sitemapUrl,
    urlCount: locs.length,
    pingedAt: stamp,
    ping: pingResults,
    indexNow: { key: indexNowKey, keyUrl: `https://${INDEXNOW_HOST}/${indexNowKey}.txt`, results: indexNowResults },
  };
}

export function buildMainOrganizationJsonLd(settings, origin) {
  const siteName = settings?.main_site_name || "AKSHAYA EXIM TRADERS";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: siteName,
        url: origin,
        logo: `${origin}/assets/logo.png`,
        description: settings?.main_json_ld_description || MAIN_SEO_DEFAULTS.jsonLdDescription,
        email: MAIN_SUPPORT_EMAIL,
        telephone: MAIN_SUPPORT_PHONE_TEL,
        areaServed: "Worldwide",
        sameAs: ["https://akshayaexim.in"],
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: siteName,
        publisher: { "@id": `${origin}/#organization` },
        inLanguage: "en-IN",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${origin}/products?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "LocalBusiness",
        "@id": `${origin}/#localbusiness`,
        name: siteName,
        url: origin,
        telephone: MAIN_SUPPORT_PHONE,
        email: MAIN_SUPPORT_EMAIL,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mumbai",
          addressRegion: "Maharashtra",
          addressCountry: "IN",
        },
        openingHours: "Mo-Sa 09:00-19:00",
        priceRange: "$$",
      },
    ],
  };
}
