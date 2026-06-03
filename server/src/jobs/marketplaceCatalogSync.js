/**
 * Cron / HTTP maintenance: IndiaMART & TradeIndia images, new catalog products, price refresh.
 * Uses Google Custom Search (site:indiamart.com / site:tradeindia.com) when GOOGLE_CSE_* is set;
 * falls back to DuckDuckGo / Wikimedia image search.
 */
import { existsSync } from "fs";
import { mainDb } from "../db.js";
import { syncNewCatalogProducts, dedupeCatalogProducts } from "../services/catalogSync.js";
import { resolveBasePrice, resetPricingRunState } from "../services/productPricing.js";
import {
  ensureProductImageFile,
  productAssetFile,
  syncCategoryImageFields,
  syncProductImageFields,
  syncMissingCategoryImages,
} from "../services/productImageSync.js";
import { productImagePath } from "../data/imageSlugs.js";

const CURSOR_KEY = "marketplace_catalog_sync_offset";
const BATCH_SIZE = Number(process.env.MARKETPLACE_SYNC_BATCH || 25);
const DELAY_MS = Number(process.env.MARKETPLACE_SYNC_DELAY_MS || 400);
const CATEGORY_BATCH = Number(process.env.MARKETPLACE_CATEGORY_BATCH || 6);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getCursor() {
  const row = await mainDb.setting.findUnique({ where: { key: CURSOR_KEY } });
  return Math.max(0, Number(row?.value || 0));
}

async function setCursor(n) {
  const v = String(Math.max(0, Math.floor(n)));
  await mainDb.setting.upsert({
    where: { key: CURSOR_KEY },
    create: { key: CURSOR_KEY, value: v },
    update: { value: v },
  });
}

function categoryContext(product) {
  const cat = product?.category;
  if (!cat) return { categoryName: "", subCategoryName: "" };
  if (cat.parent) return { categoryName: cat.parent.name, subCategoryName: cat.name };
  return { categoryName: cat.name, subCategoryName: cat.name };
}

/** Rotate through products: fetch marketplace image + refresh indicative price. */
export async function runMarketplaceCatalogSyncJob() {
  const total = await mainDb.product.count({ where: { isActive: true } });
  if (!total) return { ok: true, skipped: true, reason: "no products" };

  let offset = await getCursor();
  if (offset >= total) offset = 0;

  const products = await mainDb.product.findMany({
    where: { isActive: true },
    include: { category: { include: { parent: true } } },
    orderBy: { id: "asc" },
    skip: offset,
    take: BATCH_SIZE,
  });

  if (!products.length) {
    await setCursor(0);
    return { ok: true, total, offset: 0, processed: 0 };
  }

  const prevLimit = process.env.PRODUCT_PRICE_GOOGLE_LIMIT;
  process.env.PRODUCT_PRICE_GOOGLE_LIMIT = String(Math.max(BATCH_SIZE * 4, 40));
  resetPricingRunState();
  let imagesSaved = 0;
  let pricesUpdated = 0;

  for (const p of products) {
    const sub = p.category?.name || "";
    const ctx = categoryContext(p);

    const { basePrice } = await resolveBasePrice(
      {
        name: p.name,
        unit: p.unit,
        listingType: p.listingType,
        ...ctx,
      },
      { useGoogle: true }
    );
    if (basePrice > 0 && Math.abs(basePrice - Number(p.basePrice)) > 0.01) {
      await mainDb.product.update({
        where: { id: p.id },
        data: { basePrice },
      });
      pricesUpdated += 1;
    }

    const dest = productAssetFile(p.name);
    const { ok } = await ensureProductImageFile(p.name, sub, { force: false });
    if (ok && existsSync(dest)) {
      const path = productImagePath(p.name);
      await mainDb.product.update({
        where: { id: p.id },
        data: { images: JSON.stringify([path]) },
      });
      imagesSaved += 1;
    }

    await sleep(DELAY_MS);
  }

  const nextOffset = offset + products.length >= total ? 0 : offset + products.length;
  await setCursor(nextOffset);
  await syncCategoryImageFields(mainDb);
  if (prevLimit === undefined) delete process.env.PRODUCT_PRICE_GOOGLE_LIMIT;
  else process.env.PRODUCT_PRICE_GOOGLE_LIMIT = prevLimit;

  return {
    ok: true,
    total,
    offset,
    nextOffset,
    batch: products.length,
    imagesSaved,
    pricesUpdated,
    googleConfigured: Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX),
  };
}

/**
 * Full maintenance pass: new listings, category images, product batch, DB path sync.
 * Safe to call from cron (GET) or background interval.
 */
export async function runMarketplaceMaintenanceJob() {
  const dedupe = await dedupeCatalogProducts(mainDb);
  const catalog = await syncNewCatalogProducts(mainDb);
  const categories = await syncMissingCategoryImages(mainDb, {
    limit: CATEGORY_BATCH,
    force: false,
    delayMs: DELAY_MS,
  });
  const batch = await runMarketplaceCatalogSyncJob();
  const productPaths = await syncProductImageFields(mainDb);
  const categoryPaths = await syncCategoryImageFields(mainDb);

  return {
    ok: true,
    dedupeRemoved: dedupe.removed,
    newProducts: catalog.created,
    categories,
    batch,
    productPaths,
    categoryPaths,
    googleConfigured: Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX),
  };
}

/** One-time after deploy: fill missing category + product assets (bounded). */
export async function bootstrapMarketplaceMedia() {
  const categories = await syncMissingCategoryImages(mainDb, {
    limit: Number(process.env.MARKETPLACE_BOOTSTRAP_CATEGORIES || 18),
    force: false,
    delayMs: DELAY_MS,
  });
  const catalog = await syncNewCatalogProducts(mainDb);
  const batch = await runMarketplaceCatalogSyncJob();
  await syncProductImageFields(mainDb);
  await syncCategoryImageFields(mainDb);
  return { categories, catalog, batch };
}
