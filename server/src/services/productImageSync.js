/**
 * Fetch product/category images (B2B marketplaces) and sync paths across MAIN DB + web assets.
 */
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { findProductImageUrls, googleImageSearch } from "./marketplaceMedia.js";
import { productImagePath, categoryImagePath, resolveCategorySlug } from "../data/imageSlugs.js";
import { flattenCatalogProducts, TAXONOMY } from "../data/categories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "../../../web");
export const prodDir = join(webRoot, "public", "assets", "products");
export const catDir = join(webRoot, "public", "assets", "categories");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

export async function saveWebpFromUrls(urls, dest, { width, height }) {
  mkdirSync(dirname(dest), { recursive: true });
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

export function productAssetFile(name) {
  return join(prodDir, `${slug(name)}.webp`);
}

export function categoryAssetFile(name) {
  return join(catDir, `${slug(name)}.webp`);
}

async function fetchCategoryImageUrls(name) {
  const q = `${name} products trade export wholesale India`;
  const google = await googleImageSearch(`site:tradeindia.com ${name} products`);
  if (google?.length) return google;
  const google2 = await googleImageSearch(q);
  return google2 || [];
}

export async function ensureCategoryImageFile(name, { force = false } = {}) {
  const dest = categoryAssetFile(name);
  const publicPath = categoryImagePath(name);
  if (!force && existsSync(dest)) return { ok: true, path: publicPath, dest };
  const urls = await fetchCategoryImageUrls(name);
  if (!urls.length) return { ok: existsSync(dest), path: publicPath, dest };
  const ok = await saveWebpFromUrls(urls, dest, { width: 800, height: 600 });
  return { ok, path: publicPath, dest };
}

export async function ensureProductImageFile(name, subCategory = "", { force = false } = {}) {
  const dest = productAssetFile(name);
  const publicPath = productImagePath(name);
  if (!force && existsSync(dest)) return { ok: true, path: publicPath, dest };
  const urls = await findProductImageUrls(name, subCategory);
  if (!urls.length) return { ok: existsSync(dest), path: publicPath, dest };
  const ok = await saveWebpFromUrls(urls, dest, { width: 800, height: 800 });
  return { ok, path: publicPath, dest };
}

/** Copy nearest category webp when product download fails. */
export function copyCategoryFallbackToProduct(productName, categoryName) {
  const dest = productAssetFile(productName);
  if (existsSync(dest)) return false;
  const candidates = [
    join(catDir, `${resolveCategorySlug(categoryName)}.webp`),
    categoryAssetFile(categoryName),
    join(catDir, "default-trade.webp"),
  ];
  const src = candidates.find((p) => existsSync(p));
  if (!src) return false;
  try {
    copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

/** Assign each product the curated subcategory/parent category image (no marketplace scrapes). */
export async function applyCuratedProductImages(db) {
  const products = await db.product.findMany({
    include: { category: { include: { parent: true } } },
  });
  let updated = 0;
  for (const p of products) {
    const cat = p.category;
    const path = cat?.parent
      ? categoryImagePath(cat.name) || categoryImagePath(cat.parent.name)
      : categoryImagePath(cat?.name || "");
    const imagePath = path || categoryImagePath(cat?.parent?.name || "") || "/assets/categories/default-trade.webp";
    const next = JSON.stringify([imagePath]);
    if ((p.images || "[]") !== next) {
      await db.product.update({ where: { id: p.id }, data: { images: next } });
      updated += 1;
    }
  }
  return { updated, total: products.length };
}

/** Point every product row at bundled /assets/products/{slug}.webp when file exists. */
export async function syncProductImageFields(db) {
  const products = await db.product.findMany({
    select: { id: true, name: true, images: true },
  });
  let updated = 0;
  for (const p of products) {
    const path = productImagePath(p.name);
    const file = productAssetFile(p.name);
    if (!existsSync(file)) continue;
    const next = JSON.stringify([path]);
    if ((p.images || "[]") !== next) {
      await db.product.update({ where: { id: p.id }, data: { images: next } });
      updated += 1;
    }
  }
  return { updated, total: products.length };
}

/** Refresh category.image when bundled file exists. */
export async function syncCategoryImageFields(db) {
  const categories = await db.category.findMany({ select: { id: true, name: true, image: true } });
  let updated = 0;
  for (const c of categories) {
    const path = categoryImagePath(c.name);
    const file = categoryAssetFile(c.name);
    const legacy = join(catDir, `${slug(c.name)}.webp`);
    if (!existsSync(file) && !existsSync(legacy)) continue;
    const usePath = existsSync(file) ? path : `/assets/categories/${slug(c.name)}.webp`;
    if (c.image !== usePath) {
      await db.category.update({ where: { id: c.id }, data: { image: usePath } });
      updated += 1;
    }
  }
  return { updated, total: categories.length };
}

/**
 * Fetch missing product images from the web and sync DB.
 * @param {object} opts
 * @param {number} opts.limit 0 = all
 * @param {number} opts.offset
 * @param {boolean} opts.force re-download
 * @param {number} opts.delayMs between fetches
 */
export async function fetchAndSyncProductImages(db, opts = {}) {
  const { limit = 0, offset = 0, force = false, delayMs = 350 } = opts;
  mkdirSync(prodDir, { recursive: true });

  const products = await db.product.findMany({
    include: { category: { include: { parent: true } } },
    orderBy: { name: "asc" },
  });

  const slice =
    limit > 0 ? products.slice(offset, offset + limit) : products.slice(offset);

  const report = { fetched: 0, fallback: 0, skipped: 0, dbUpdated: 0, processed: 0, errors: 0 };

  for (const p of slice) {
    const sub = p.category?.name || "";
    const parent = p.category?.parent?.name || sub;
    const dest = productAssetFile(p.name);

    if (!force && existsSync(dest)) {
      report.skipped += 1;
    } else {
      try {
        const { ok } = await ensureProductImageFile(p.name, sub, { force });
        if (ok) report.fetched += 1;
        else if (copyCategoryFallbackToProduct(p.name, sub) || copyCategoryFallbackToProduct(p.name, parent)) {
          report.fallback += 1;
        } else {
          report.errors += 1;
        }
      } catch {
        report.errors += 1;
      }
      await sleep(delayMs);
    }

    if (existsSync(dest)) {
      const path = productImagePath(p.name);
      const next = JSON.stringify([path]);
      if ((p.images || "[]") !== next) {
        await db.product.update({ where: { id: p.id }, data: { images: next } });
        report.dbUpdated += 1;
      }
    }
    report.processed += 1;
  }

  return report;
}

/** Fetch category images for taxonomy + sync DB. */
export async function fetchAndSyncCategoryImages(db, opts = {}) {
  const { force = false, delayMs = 300 } = opts;
  mkdirSync(catDir, { recursive: true });
  const names = new Set();
  for (const top of TAXONOMY) {
    names.add(top.name);
    for (const sub of top.sub) names.add(sub.name);
  }

  let fetched = 0;
  for (const name of names) {
    const { ok } = await ensureCategoryImageFile(name, { force });
    if (ok && existsSync(categoryAssetFile(name))) fetched += 1;
    await sleep(delayMs);
  }

  const catSync = await syncCategoryImageFields(db);
  return { fetched, categories: names.size, ...catSync };
}

/** Full catalog pass from taxonomy (includes products not yet in DB). */
export async function prefetchCatalogProductAssets(opts = {}) {
  const { limit = 0, offset = 0, force = false, delayMs = 350 } = opts;
  const catalog = flattenCatalogProducts();
  const slice = limit > 0 ? catalog.slice(offset, offset + limit) : catalog.slice(offset);
  let fetched = 0;
  let fallback = 0;

  for (const row of slice) {
    const dest = productAssetFile(row.name);
    if (!force && existsSync(dest)) continue;
    const { ok } = await ensureProductImageFile(row.name, row.subCategory, { force });
    if (ok) fetched += 1;
    else if (
      copyCategoryFallbackToProduct(row.name, row.subCategory) ||
      copyCategoryFallbackToProduct(row.name, row.parentCategory)
    ) {
      fallback += 1;
    }
    await sleep(delayMs);
  }
  return { fetched, fallback, processed: slice.length, catalogTotal: catalog.length };
}
