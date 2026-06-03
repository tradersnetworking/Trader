/**
 * Image search biased toward India B2B / wholesale marketplaces.
 * Uses Google Custom Search (image) when GOOGLE_CSE_* is set; else Wikimedia + DuckDuckGo.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** B2B listing sources for India wholesale imagery & pricing. */
export const MARKETPLACE_SITES = [
  "indiamart.com",
  "dir.indiamart.com",
  "tradeindia.com",
  "exportersindia.com",
];

export function isMarketplaceHost(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return MARKETPLACE_SITES.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

export function filterMarketplaceUrls(urls) {
  return (urls || []).filter(isMarketplaceHost);
}

export function buildProductImageQueries(productName, subCategory = "") {
  const base = String(productName || "").trim();
  const sub = String(subCategory || "").trim();
  const short = base.split(/[(&,/]/)[0].trim();
  const queries = [
    `site:indiamart.com ${base} product image`,
    `site:tradeindia.com ${base} product photo`,
    `site:exportersindia.com ${base} wholesale`,
  ];
  if (sub) {
    queries.push(`site:indiamart.com ${short} ${sub}`);
    queries.push(`site:tradeindia.com ${short} ${sub}`);
  }
  return [...new Set(queries.filter(Boolean))];
}

export function buildCategoryImageQueries(categoryName) {
  const base = String(categoryName || "").trim();
  const short = base.split(/[&/]/)[0].trim();
  return [
    `site:indiamart.com ${base} products wholesale India`,
    `site:tradeindia.com ${base} export manufacturers`,
    `site:indiamart.com ${short} B2B product photo`,
    `site:tradeindia.com ${short} suppliers India`,
    `site:exportersindia.com ${base} products`,
  ];
}

export async function findCategoryImageUrls(categoryName, env = process.env) {
  const queries = buildCategoryImageQueries(categoryName);
  const collected = [];
  for (const query of queries) {
    const google = await googleImageSearch(query, env);
    if (google?.length) collected.push(...filterMarketplaceUrls(google));
    if (collected.length >= 6) break;
  }
  if (collected.length) return [...new Set(collected)];

  const fallbackQuery = `${categoryName} export wholesale India B2B products`;
  const wiki = await wikiImageSearch(fallbackQuery);
  if (wiki.length) return wiki;
  const ddg = await duckDuckGoImages(`site:indiamart.com ${categoryName} products`);
  if (ddg.length) return filterMarketplaceUrls(ddg).length ? filterMarketplaceUrls(ddg) : ddg;
  return duckDuckGoImages(fallbackQuery);
}

export function buildWebPriceQueries(productName, unit, categoryName = "") {
  const base = String(productName || "").trim();
  return [
    `site:indiamart.com ${base} price ${unit}`,
    `site:tradeindia.com ${base} price per ${unit}`,
    `site:exportersindia.com ${base} export price INR`,
    `site:indiamart.com ${base} rate ${categoryName || "B2B"}`,
    `site:tradeindia.com ${base} wholesale price India`,
  ];
}

export async function googleImageSearch(query, env = process.env) {
  const key = env.GOOGLE_CSE_API_KEY;
  const cx = env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&searchType=image&num=8&q=${encodeURIComponent(query)}&safe=active&imgSize=large`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.map((i) => i.link).filter(Boolean) || [];
}

async function wikiImageSearch(query) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`;
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  const urls = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    const u = info?.thumburl || info?.url;
    if (u && /\.(jpe?g|png|webp)(\?|$)/i.test(u)) urls.push(u);
  }
  return urls;
}

async function duckDuckGoImages(query) {
  try {
    const landing = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA },
    });
    const html = await landing.text();
    const vqd = html.match(/vqd=['"]([^'"]+)['"]/)?.[1];
    if (!vqd) return [];
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`,
      { headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/" } }
    );
    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    return (data.results || [])
      .map((r) => r.image)
      .filter((u) => u && /^https?:\/\//i.test(u));
  } catch {
    return [];
  }
}

export async function findProductImageUrls(productName, subCategory = "", env = process.env) {
  const queries = buildProductImageQueries(productName, subCategory);
  const collected = [];
  for (const query of queries) {
    const google = await googleImageSearch(query, env);
    if (google?.length) collected.push(...filterMarketplaceUrls(google));
    if (collected.length >= 5) break;
  }
  if (collected.length) return [...new Set(collected)];
  for (const query of queries) {
    const wiki = await wikiImageSearch(query);
    if (wiki.length) return wiki;
    const ddg = await duckDuckGoImages(query);
    if (ddg.length) return ddg;
  }
  return [];
}

export async function googleWebSearch(query, env = process.env) {
  const key = env.GOOGLE_CSE_API_KEY;
  const cx = env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&num=6&q=${encodeURIComponent(query.slice(0, 120))}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
