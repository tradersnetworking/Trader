/**
 * Download category & product images via image search (Google CSE if configured,
 * otherwise Wikimedia Commons + DuckDuckGo). Resize to consistent dimensions.
 *
 * Usage:
 *   node scripts/fetch-marketplace-images.mjs
 *
 * Optional .env (repo root server/.env):
 *   GOOGLE_CSE_API_KEY=...
 *   GOOGLE_CSE_CX=...
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const assetsRoot = join(webRoot, "public", "assets");
const catDir = join(assetsRoot, "categories");
const prodDir = join(assetsRoot, "products");

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

async function findImageUrls(query) {
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

async function fetchOne(name, kind, size, { force = false, altQueries = [] } = {}) {
  const dir = kind === "category" ? catDir : prodDir;
  const dest = join(dir, `${slug(name)}.webp`);
  if (!force && existsSync(dest)) {
    console.log(`  skip (exists) ${kind}: ${name}`);
    return dest;
  }
  const queries = [searchQuery(name, kind), ...altQueries, name.split(/[&/]/)[0].trim(), name.split(" ")[0]];
  for (const query of [...new Set(queries.filter(Boolean))]) {
    console.log(`  fetch ${kind}: ${name} (${query})…`);
    const urls = await findImageUrls(query);
    if (!urls.length) continue;
    const ok = await saveImage(urls, dest, size);
    if (ok) {
      console.log(`  ✓ ${dest.replace(assetsRoot, "")}`);
      return dest;
    }
    await sleep(200);
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

// Categories from server taxonomy
const { TAXONOMY } = await import("../../server/src/data/categories.js");

const PRODUCTS = [
  "Turmeric Finger (Export Grade)",
  "1121 Basmati Rice",
  "Organic Moringa Leaf Powder",
  "Cold Pressed Fruit Juice (Bulk)",
  "Iron Ore Fines Fe 62%",
  "Aluminium Ingots 99.7%",
  "Copper Cathode 99.99% (Import)",
  "Urea 46% Nitrogen (Import Requirement)",
  "Paracetamol 500mg Tablets",
  "Fresh Red Onion",
  "Copper Power Cable (Import)",
  "Acrylic Fabric Rolls",
];

const SUB_WITH_PRODUCTS = [
  "Agro Products & Commodities",
  "Ayurvedic & Herbal Powder",
  "Beverages",
  "Base Metals & Articles",
  "Aluminum & Aluminum Products",
  "Aluminium Scrap",
  "Agro Chemicals",
  "Anti Infective Drugs & Medicines",
  "Agriculture Product Stocks",
  "Cables/Cable Accessories & Conductors",
  "Acrylic Fabric",
];

console.log("Fetching marketplace images…");
console.log(env.GOOGLE_CSE_API_KEY ? "Using Google Custom Search API" : "Using Wikimedia + DuckDuckGo image search");

const manifest = { categories: {}, subcategories: {}, products: {}, generatedAt: new Date().toISOString() };

for (const c of TAXONOMY) {
  await fetchOne(c.name, "category", { width: 800, height: 600 });
  manifest.categories[c.name] = `/assets/categories/${slug(c.name)}.webp`;
  await sleep(350);
}

for (const s of SUB_WITH_PRODUCTS) {
  await fetchOne(s, "category", { width: 800, height: 600 });
  manifest.subcategories[s] = `/assets/categories/${slug(s)}.webp`;
  await sleep(350);
}

for (const p of PRODUCTS) {
  await fetchOne(p, "product", { width: 800, height: 800 });
  manifest.products[p] = `/assets/products/${slug(p)}.webp`;
  await sleep(300);
}

// Retry failed category/subcategory downloads
const RETRY = [
  ["Computer Hardware & Software", "computer hardware"],
  ["Construction & Real Estate", "construction building materials"],
  ["Consumer Electronics", "consumer electronics gadgets"],
  ["Electronics & Electrical Supplies", "electrical cables supplies"],
  ["Energy & Power", "energy power solar"],
  ["Packaging & Paper", "packaging paper boxes"],
  ["Aluminium Scrap", "aluminium scrap metal"],
  ["Agro Chemicals", "agro fertilizer chemicals"],
  ["Anti Infective Drugs & Medicines", "pharmaceutical medicine tablets"],
  ["Agriculture Product Stocks", "agriculture produce warehouse"],
  ["Cables/Cable Accessories & Conductors", "electric power cable"],
  ["Acrylic Fabric", "acrylic textile fabric rolls"],
];
for (const [name, alt] of RETRY) {
  const kind = PRODUCTS.includes(name) ? "product" : "category";
  const size = kind === "product" ? { width: 800, height: 800 } : { width: 800, height: 600 };
  await fetchOne(name, kind, size, { force: true, altQueries: [alt] });
  await sleep(300);
}

// Fill any remaining gaps from default
const defaultDest = join(catDir, "default-trade.webp");
if (!existsSync(defaultDest)) {
  const urls = await findImageUrls("global trade shipping containers port");
  await saveImage(urls, defaultDest, { width: 800, height: 600 });
}
manifest.default = "/assets/categories/default-trade.webp";

for (const c of TAXONOMY) {
  const p = join(catDir, `${slug(c.name)}.webp`);
  if (!existsSync(p) && existsSync(defaultDest)) await copyFallback(c.name, "category", defaultDest);
}
for (const s of SUB_WITH_PRODUCTS) {
  const p = join(catDir, `${slug(s)}.webp`);
  if (!existsSync(p) && existsSync(defaultDest)) await copyFallback(s, "category", defaultDest);
}

writeFileSync(join(assetsRoot, "image-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("\nDone. Manifest: public/assets/image-manifest.json");
