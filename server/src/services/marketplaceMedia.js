/**
 * Image search biased toward India B2B / wholesale marketplaces.
 * Uses Google Custom Search (image) when GOOGLE_CSE_* is set; else Wikimedia + DuckDuckGo.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Domains commonly used for product imagery in India trade listings. */
export const MARKETPLACE_SITES = [
  "tradeindia.com",
  "indiamart.com",
  "exportersindia.com",
  "dir.indiamart.com",
  "udaan.com",
  "alibaba.com",
  "bigbasket.com",
];

export function buildProductImageQueries(productName, subCategory = "") {
  const base = String(productName || "").trim();
  const sub = String(subCategory || "").trim();
  const short = base.split(/[(&,/]/)[0].trim();
  const queries = [];
  for (const site of MARKETPLACE_SITES.slice(0, 5)) {
    queries.push(`site:${site} ${base} product`);
    if (sub) queries.push(`site:${site} ${short} ${sub}`);
  }
  queries.push(`${base} wholesale product India export`);
  queries.push(`${short} ${sub} bulk commodity photo`.trim());
  queries.push(`${base} product packshot`);
  return [...new Set(queries.filter(Boolean))];
}

export function buildWebPriceQueries(productName, unit, categoryName = "") {
  const base = String(productName || "").trim();
  const queries = [
    `${base} wholesale price India INR ${unit}`,
    `site:indiamart.com ${base} price`,
    `site:tradeindia.com ${base} price per ${unit}`,
    `site:exportersindia.com ${base} export price`,
    `${base} bulk rate ${categoryName || "B2B"} India`,
  ];
  return [...new Set(queries)];
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
  for (const query of queries) {
    const google = await googleImageSearch(query, env);
    if (google?.length) return google;
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
