/**
 * Run product image fetch in batches until catalog is covered.
 * Usage: npm run sync-all-images --workspace server
 */
import { mainDb } from "../src/db.js";
import { fetchAndSyncProductImages, syncProductImageFields, syncCategoryImageFields } from "../src/services/productImageSync.js";

const BATCH = Number(process.env.IMAGE_SYNC_BATCH || 40);
const total = await mainDb.product.count();
let offset = 0;
const summary = [];

while (offset < total) {
  console.log(`\n--- Batch offset=${offset} limit=${BATCH} ---`);
  const r = await fetchAndSyncProductImages(mainDb, { limit: BATCH, offset });
  summary.push(r);
  offset += BATCH;
}

const paths = await syncProductImageFields(mainDb);
const cats = await syncCategoryImageFields(mainDb);
console.log(JSON.stringify({ ok: true, total, batches: summary.length, paths, cats }, null, 2));
await mainDb.$disconnect();
