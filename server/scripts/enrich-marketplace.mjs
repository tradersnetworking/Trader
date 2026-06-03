/**
 * Enrich main marketplace: per-product prices, images, new catalog rows.
 *
 * Usage:
 *   npm run enrich-marketplace --workspace server
 *   npm run enrich-marketplace --workspace server -- --google
 *   npm run enrich-marketplace --workspace server -- --images --limit 50
 *   npm run enrich-marketplace --workspace server -- --maintenance
 */
import { mainDb } from "../src/db.js";
import { refreshProductPrices } from "../src/services/productPricing.js";
import { syncNewCatalogProducts, dedupeCatalogProducts } from "../src/services/catalogSync.js";
import {
  fetchAndSyncProductImages,
  fetchAndSyncCategoryImages,
  syncCategoryImageFields,
  syncProductImageFields,
  applyCuratedProductImages,
} from "../src/services/productImageSync.js";
import { runMarketplaceMaintenanceJob } from "../src/jobs/marketplaceCatalogSync.js";

const args = process.argv.slice(2);
const useGoogle = args.includes("--google");
const fetchImages = args.includes("--images");
const maintenance = args.includes("--maintenance");
const syncNew = args.includes("--sync-new") || !args.includes("--no-sync");
const limitIdx = args.indexOf("--limit");
const imageLimit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;
const offsetIdx = args.indexOf("--offset");
const imageOffset = offsetIdx >= 0 ? Number(args[offsetIdx + 1]) || 0 : 0;
const imageForce = args.includes("--force");

const report = { prices: null, sync: null, images: null, maintenance: null };

if (maintenance) {
  report.maintenance = await runMarketplaceMaintenanceJob();
  console.log(JSON.stringify({ ok: true, ...report }));
  await mainDb.$disconnect();
  process.exit(0);
}

if (syncNew) {
  const dedupe = await dedupeCatalogProducts(mainDb);
  if (dedupe.removed) console.log(`Deduped ${dedupe.removed} duplicate products`);
  report.sync = await syncNewCatalogProducts(mainDb);
  console.log(`Catalog sync: ${report.sync.created} new products`);
}

report.prices = await refreshProductPrices(mainDb, {
  useGoogle,
  onlyZero: false,
});
console.log(
  `Prices: updated ${report.prices.updated}/${report.prices.total} (Google lookups: ${report.prices.googleLookups})`
);

if (fetchImages) {
  report.categoryImages = await fetchAndSyncCategoryImages(mainDb, { force: imageForce });
  report.images = await fetchAndSyncProductImages(mainDb, {
    limit: imageLimit,
    offset: imageOffset,
    force: imageForce,
  });
  console.log(
    `Fetched images: ${report.images.fetched} products, ${report.categoryImages.fetched} categories; DB rows ${report.images.dbUpdated}`
  );
} else {
  report.images = await applyCuratedProductImages(mainDb);
  report.categoryImages = await syncCategoryImageFields(mainDb);
  report.productPaths = await syncProductImageFields(mainDb);
  if (report.images.updated || report.categoryImages.updated) {
    console.log(`Image paths synced: products ${report.images.updated}, categories ${report.categoryImages.updated}`);
  }
}

console.log(JSON.stringify({ ok: true, ...report }));
await mainDb.$disconnect();
