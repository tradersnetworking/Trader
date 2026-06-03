/**
 * Fetch product & category images and sync across main site (DB + /public/assets).
 *
 * Usage:
 *   npm run sync-images --workspace server
 *   npm run sync-images --workspace server -- --products --limit 80 --offset 0
 *   npm run sync-images --workspace server -- --categories
 *   npm run sync-images --workspace server -- --db-only
 *   npm run sync-images --workspace server -- --catalog --limit 100
 */
import { mainDb } from "../src/db.js";
import {
  fetchAndSyncProductImages,
  fetchAndSyncCategoryImages,
  syncProductImageFields,
  syncCategoryImageFields,
  prefetchCatalogProductAssets,
} from "../src/services/productImageSync.js";

const args = process.argv.slice(2);
const products = args.includes("--products") || (!args.includes("--categories") && !args.includes("--db-only") && !args.includes("--catalog"));
const categories = args.includes("--categories");
const dbOnly = args.includes("--db-only");
const catalog = args.includes("--catalog");
const force = args.includes("--force");

const limitIdx = args.indexOf("--limit");
const offsetIdx = args.indexOf("--offset");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;
const offset = offsetIdx >= 0 ? Number(args[offsetIdx + 1]) || 0 : 0;

const report = {};

if (dbOnly) {
  report.products = await syncProductImageFields(mainDb);
  report.categories = await syncCategoryImageFields(mainDb);
} else {
  if (categories) {
    report.categoryFetch = await fetchAndSyncCategoryImages(mainDb, { force });
  }
  if (catalog) {
    report.catalogPrefetch = await prefetchCatalogProductAssets({ limit, offset, force });
    report.products = await syncProductImageFields(mainDb);
  }
  if (products) {
    report.productFetch = await fetchAndSyncProductImages(mainDb, { limit, offset, force });
  }
  if (!categories && !catalog && products) {
    report.categories = await syncCategoryImageFields(mainDb);
  }
}

console.log(JSON.stringify({ ok: true, ...report }, null, 2));
await mainDb.$disconnect();
