/**
 * Download category & product images via image search (Google CSE if configured,
 * otherwise Wikimedia Commons + DuckDuckGo). Biases queries toward India B2B sites.
 *
 * Usage:
 *   npm run fetch-images --workspace web
 *   npm run fetch-images --workspace web -- --force
 *   npm run fetch-images --workspace web -- --products-only --limit 100
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import {
  buildProductImageQueries,
  findProductImageUrls,
} from "../../server/src/services/marketplaceMedia.js";
import { flattenCatalogProducts, TAXONOMY } from "../../server/src/data/categories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const assetsRoot = join(webRoot, "public", "assets");
const catDir = join(assetsRoot, "categories");
const prodDir = join(assetsRoot, "products");

const args = process.argv.slice(2);
const force = args.includes("--force");
const productsOnly = args.includes("--products-only");
const limitIdx = args.indexOf("--limit");
const productLimit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;

mkdirSync(catDir, { recursive: true });
mkdirSync(prodDir, { recursive: true });

function loadEnv() {
  const envPath = join(webRoot, "..", "server", ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...process.env, ...loadEnv() };

function slug(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function googleImageSearch(query) {
  const key = env.GOOGLE_CSE_API_KEY;
  const cx = env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&searchType=image&num=5&q=${encodeURIComponent(query)}&safe=active&imgSize=large`;
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

async function findCategoryImageUrls(query) {
  const google = await googleImageSearch(query);
  if (google?.length) return google;
  const wiki = await wikiImageSearch(query);
  if (wiki.length) return wiki;
  return duckDuckGoImages(query);
}

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`Not an image: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error("Image too small");
  return buf;
}

async function saveImage(urls, dest, { width, height }) {
  for (const url of urls) {
    try {
      const buf = await downloadBuffer(url);
      await sharp(buf)
        .rotate()
        .resize(width, height, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toFile(dest);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function searchQuery(name, kind) {
  if (kind === "category") return `${name} products trade export wholesale`;
  return `${name} product wholesale export`;
}

async function fetchOne(name, kind, size, { force: forceFetch = false, altQueries = [] } = {}) {
  const dir = kind === "category" ? catDir : prodDir;
  const dest = join(dir, `${slug(name)}.webp`);
  if (!forceFetch && existsSync(dest)) {
    console.log(`  skip (exists) ${kind}: ${name}`);
    return dest;
  }
  if (kind === "product") {
    console.log(`  fetch product: ${name} (B2B marketplaces)…`);
    const urls = await findProductImageUrls(name, altQueries[0] || "", env);
    if (urls.length) {
      const ok = await saveImage(urls, dest, size);
      if (ok) {
        console.log(`  ✓ ${dest.replace(assetsRoot, "")}`);
        return dest;
      }
    }
  } else {
    const queries = [searchQuery(name, kind), ...altQueries, name.split(/[&/]/)[0].trim()];
    for (const query of [...new Set(queries.filter(Boolean))]) {
      console.log(`  fetch ${kind}: ${name} (${query.slice(0, 70)}…)…`);
      const urls = await findCategoryImageUrls(query);
      if (!urls.length) continue;
      const ok = await saveImage(urls, dest, size);
      if (ok) {
        console.log(`  ✓ ${dest.replace(assetsRoot, "")}`);
        return dest;
      }
      await sleep(200);
    }
  }
  console.warn(`  ! download failed: ${name}`);
  return null;
}

async function copyFallback(name, kind, fallbackPath) {
  const dir = kind === "category" ? catDir : prodDir;
  const dest = join(dir, `${slug(name)}.webp`);
  if (existsSync(dest) || !existsSync(fallbackPath)) return;
  await sharp(fallbackPath).toFile(dest);
  console.log(`  ↳ fallback copy for ${name}`);
}

console.log("Fetching marketplace images…");
console.log(env.GOOGLE_CSE_API_KEY ? "Using Google Custom Search API" : "Using Wikimedia + DuckDuckGo image search");

const manifest = { categories: {}, subcategories: {}, products: {}, generatedAt: new Date().toISOString() };

if (!productsOnly) {
  for (const c of TAXONOMY) {
    await fetchOne(c.name, "category", { width: 800, height: 600 }, { force });
    manifest.categories[c.name] = `/assets/categories/${slug(c.name)}.webp`;
    await sleep(350);
  }

  for (const c of TAXONOMY) {
    for (const sub of c.sub) {
      await fetchOne(sub.name, "category", { width: 800, height: 600 }, { force });
      manifest.subcategories[sub.name] = `/assets/categories/${slug(sub.name)}.webp`;
      await sleep(280);
    }
  }
}

const catalog = flattenCatalogProducts();
let productCount = 0;
for (const row of catalog) {
  if (productLimit > 0 && productCount >= productLimit) break;
  await fetchOne(row.name, "product", { width: 800, height: 800 }, {
    force,
    altQueries: [row.subCategory],
  });
  manifest.products[row.name] = `/assets/products/${slug(row.name)}.webp`;
  productCount += 1;
  await sleep(320);
}

if (!productsOnly) {
  const defaultDest = join(catDir, "default-trade.webp");
  if (!existsSync(defaultDest) || force) {
    const urls = await findCategoryImageUrls("global trade shipping containers port");
    await saveImage(urls, defaultDest, { width: 800, height: 600 });
  }
  manifest.default = "/assets/categories/default-trade.webp";

  for (const c of TAXONOMY) {
    const p = join(catDir, `${slug(c.name)}.webp`);
    if (!existsSync(p) && existsSync(defaultDest)) await copyFallback(c.name, "category", defaultDest);
  }
}

writeFileSync(join(assetsRoot, "image-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `\nDone. ${Object.keys(manifest.products).length} product images processed. Catalog: ${catalog.length} products.`
);
