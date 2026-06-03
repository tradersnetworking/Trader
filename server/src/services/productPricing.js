/**
 * Indicative B2B listing prices (INR) for marketplace products.
 * Uses Google Custom Search when GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX are set;
 * otherwise category / keyword heuristics (India wholesale benchmarks).
 */

import { buildWebPriceQueries, googleWebSearch } from "./marketplaceMedia.js";

const priceCache = new Map();
let googleCallsThisRun = 0;

/** Max Google lookups per process (seed/script); avoids quota burn. */
const GOOGLE_MAX_PER_RUN = Number(process.env.PRODUCT_PRICE_GOOGLE_LIMIT || 80);

/** Indicative INR per metric ton by sub-category (wholesale / FOB India). */
const SUB_MT_INR = {
  "Food Grains": 32000,
  "Pulses & Lentils": 62000,
  "Oil Seeds": 48000,
  Spices: 145000,
  "Fresh Vegetables": 22000,
  "Fresh Fruits": 38000,
  "Dry Fruits & Nuts": 520000,
  "Plantation Products": 185000,
  "Agricultural Seeds": 85000,
  "Vegetable Seeds": 120000,
  "Fruit Seeds": 95000,
  "Organic Food": 42000,
  "Organic Inputs": 35000,
  "Raw Herbs": 280000,
  "Processed Herbal Products": 420000,
  "Essential Oils": 850000,
  "Coconut Products": 65000,
  "Coir Products": 45000,
  Cotton: 72000,
  Jute: 55000,
  "Surgical Consumables": 380000,
  "Medical Equipment": 650000,
  Diagnostics: 520000,
  Pharmaceuticals: 1200000,
  Chemicals: 95000,
  Fertilizers: 28000,
  Pesticides: 185000,
  "Industrial Machinery": 2500000,
  "Construction Materials": 8500,
  Textiles: 185000,
  Garments: 420000,
  "Leather Products": 380000,
  "Plastic Products": 125000,
  "Rubber Products": 165000,
  "Paper Products": 72000,
  "Metal Products": 185000,
  "Electrical Equipment": 420000,
  "Auto Parts": 380000,
  "Solar Products": 520000,
  "Packaging Materials": 95000,
};

const TOP_MT_INR = {
  "Agriculture & Food Products": 45000,
  "Seeds Category": 90000,
  "Organic Products": 40000,
  "Ayurvedic & Herbal Products": 320000,
  "Coconut & Fiber Products": 55000,
  "Cotton & Jute Products": 65000,
  "Medical & Surgical Products": 450000,
  "Chemicals & Fertilizers": 75000,
  "Industrial & Engineering": 850000,
  "Textiles & Garments": 220000,
  "Plastics, Rubber & Packaging": 140000,
  "Metals & Minerals": 120000,
  "Electronics & Electricals": 380000,
  "Automotive & Transport": 320000,
  "Energy & Renewables": 480000,
};

/** Per-unit overrides when not sold by weight (INR per unit). */
const FIXED_UNIT_INR = {
  Piece: 850,
  Box: 2400,
  Carton: 12500,
  Drum: 185000,
  Barrel: 210000,
  Container: 1850000,
  "Truck Load": 420000,
  Pallet: 65000,
  Roll: 4200,
  Bundle: 8500,
  Bag: 1800,
  Sack: 2200,
};

const NAME_FACTORS = [
  { re: /saffron/i, mtMult: 28 },
  { re: /basmati/i, mtMult: 2.4 },
  { re: /cardamom|vanilla/i, mtMult: 6.5 },
  { re: /cashew|pistachio|almond|walnut/i, mtMult: 1.15 },
  { re: /rice|paddy/i, mtMult: 1.05 },
  { re: /wheat/i, mtMult: 0.95 },
  { re: /turmeric|pepper|clove|cinnamon/i, mtMult: 1.2 },
  { re: /rubber/i, mtMult: 0.9 },
  { re: /tea|coffee/i, mtMult: 1.35 },
  { re: /copra|coconut/i, mtMult: 1.1 },
  { re: /cotton/i, mtMult: 1.0 },
  { re: /steel|iron|copper|aluminium|aluminum/i, mtMult: 1.25 },
  { re: /solar|panel|inverter/i, mtMult: 1.4 },
  { re: /onion|potato|tomato/i, mtMult: 0.88 },
  { re: /mango|banana|apple/i, mtMult: 1.12 },
  { re: /maize|corn/i, mtMult: 0.92 },
  { re: /barley|sorghum|millet/i, mtMult: 0.85 },
  { re: /chickpea|gram|dal|lentil/i, mtMult: 1.08 },
  { re: /mustard|sesame|groundnut/i, mtMult: 1.05 },
  { re: /pharma|tablet|capsule|api/i, mtMult: 1.65 },
  { re: /ore|scrap|ingot/i, mtMult: 1.18 },
];

/** Stable per-product multiplier so siblings in a subcategory do not share one price. */
export function productNameVariationFactor(name) {
  const s = String(name || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h >>> 0) % 1000;
  return 0.72 + t / 1000 * 0.66;
}

function normUnit(unit) {
  const u = String(unit || "MT").trim().toLowerCase();
  if (u === "kg") return "kg";
  if (u === "mt" || u === "ton" || u === "tonne") return "mt";
  if (u === "quintal" || u === "qt") return "quintal";
  return u;
}

function roundPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 100000) return Math.round(v / 100) * 100;
  if (v >= 1000) return Math.round(v / 10) * 10;
  return Math.round(v * 100) / 100;
}

function mtToUnit(pricePerMt, unit) {
  const u = normUnit(unit);
  if (u === "mt") return pricePerMt;
  if (u === "kg") return pricePerMt / 1000;
  if (u === "quintal") return pricePerMt / 10;
  const fixed = FIXED_UNIT_INR[unit] || FIXED_UNIT_INR[unit?.trim?.()];
  if (fixed) return fixed;
  return pricePerMt / 1000;
}

function estimateMtInr({ name, categoryName, subCategoryName, listingType }) {
  let mt = SUB_MT_INR[subCategoryName] || TOP_MT_INR[categoryName] || 45000;
  for (const { re, mtMult } of NAME_FACTORS) {
    if (re.test(name)) mt *= mtMult;
  }
  if (listingType === "IMPORT") mt *= 1.08;
  return mt;
}

export function estimateBasePrice({ name, unit, listingType, categoryName, subCategoryName }) {
  const u = String(unit || "MT").trim();
  const variation = productNameVariationFactor(name);
  if (FIXED_UNIT_INR[u]) return roundPrice(FIXED_UNIT_INR[u] * variation);
  const mt = estimateMtInr({ name, categoryName, subCategoryName, listingType });
  return roundPrice(mtToUnit(mt, u) * variation);
}

function parseInrFromText(text) {
  if (!text) return [];
  const found = [];
  const r1 = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/gi;
  const r2 = /([\d,]+(?:\.\d+)?)\s*(?:INR|₹|per\s*MT|\/MT|per\s*kg|\/kg)/gi;
  let m;
  while ((m = r1.exec(text))) {
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (n > 10 && n < 50_000_000) found.push(n);
  }
  while ((m = r2.exec(text))) {
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (n > 10 && n < 50_000_000) found.push(n);
  }
  return found;
}

function normalizeParsedPrice(mid, unit) {
  const u = normUnit(unit);
  let price = mid;
  if (u === "kg" && mid > 5000) price = mid;
  else if (u === "kg" && mid > 500) price = mid;
  else if (u === "mt" && mid < 5000 && mid > 50) price = mid * 1000;
  else if (u === "quintal" && mid < 8000) price = mid * 10;
  return roundPrice(price);
}

async function fetchGooglePriceInr({ name, unit, categoryName }) {
  if (googleCallsThisRun >= GOOGLE_MAX_PER_RUN) return 0;

  const cacheKey = `g:${name}|${unit}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey);

  const queries = buildWebPriceQueries(name, unit, categoryName);
  const nums = [];

  for (const q of queries) {
    if (googleCallsThisRun >= GOOGLE_MAX_PER_RUN) break;
    googleCallsThisRun += 1;
    try {
      const data = await googleWebSearch(q);
      if (!data) break;
      for (const item of data.items || []) {
        nums.push(...parseInrFromText(`${item.title || ""} ${item.snippet || ""}`));
      }
      if (nums.length >= 3) break;
    } catch {
      /* try next query */
    }
  }

  if (!nums.length) {
    priceCache.set(cacheKey, 0);
    return 0;
  }
  nums.sort((a, b) => a - b);
  const mid = nums[Math.floor(nums.length / 2)];
  const price = normalizeParsedPrice(mid, unit);
  priceCache.set(cacheKey, price);
  return price;
}

/**
 * Resolve listing price: Google (if configured) then heuristic estimate.
 */
export async function resolveBasePrice(ctx, { useGoogle = true } = {}) {
  const cacheKey = `r:${ctx.name}|${ctx.unit}|${ctx.subCategoryName}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey);

  let basePrice = 0;
  let priceSource = "estimate";

  if (useGoogle) {
    basePrice = await fetchGooglePriceInr(ctx);
    if (basePrice > 0) priceSource = "google";
  }
  if (!basePrice) {
    basePrice = estimateBasePrice(ctx);
    priceSource = "estimate";
  }

  const out = { basePrice, priceSource };
  priceCache.set(cacheKey, out);
  return out;
}

function categoryContext(product) {
  const cat = product?.category;
  if (!cat) return { categoryName: "", subCategoryName: "" };
  if (cat.parent) return { categoryName: cat.parent.name, subCategoryName: cat.name };
  return { categoryName: cat.name, subCategoryName: cat.name };
}

export function enrichProductForDisplay(product) {
  const p = { ...product };
  if (Number(p.basePrice) > 0) {
    p.priceEstimated = false;
    return p;
  }
  const { categoryName, subCategoryName } = categoryContext(p);
  p.basePrice = estimateBasePrice({
    name: p.name,
    unit: p.unit,
    listingType: p.listingType,
    categoryName,
    subCategoryName,
  });
  p.priceEstimated = true;
  return p;
}

export function resetPricingRunState() {
  googleCallsThisRun = 0;
}

/** Persist indicative prices for products still at ₹0. */
export async function backfillZeroProductPrices(db, { useGoogle = false } = {}) {
  return refreshProductPrices(db, { useGoogle, onlyZero: true });
}

/**
 * Refresh listing prices (all products or only ₹0).
 * Re-applies Google (when configured) and per-product heuristic variation.
 */
export async function refreshProductPrices(db, { useGoogle = false, onlyZero = false } = {}) {
  resetPricingRunState();
  const products = await db.product.findMany({
    where: onlyZero ? { basePrice: { lte: 0 } } : undefined,
    include: { category: { include: { parent: true } } },
    orderBy: { name: "asc" },
  });
  let updated = 0;
  for (const p of products) {
    const { categoryName, subCategoryName } = categoryContext(p);
    const { basePrice } = await resolveBasePrice(
      {
        name: p.name,
        unit: p.unit,
        listingType: p.listingType,
        categoryName,
        subCategoryName,
      },
      { useGoogle }
    );
    if (basePrice > 0 && Math.abs(basePrice - Number(p.basePrice)) > 0.01) {
      await db.product.update({ where: { id: p.id }, data: { basePrice } });
      updated += 1;
    }
  }
  return { updated, total: products.length, googleLookups: googleCallsThisRun };
}
