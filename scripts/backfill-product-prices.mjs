/**
 * Backfill marketplace product basePrice where still ₹0.
 *
 * Usage (from repo root):
 *   node scripts/backfill-product-prices.mjs
 *   node scripts/backfill-product-prices.mjs --google
 *
 * Optional server/.env:
 *   GOOGLE_CSE_API_KEY=...
 *   GOOGLE_CSE_CX=...
 *   PRODUCT_PRICE_GOOGLE_LIMIT=40
 */
import { mainDb } from "../server/src/db.js";
import { backfillZeroProductPrices } from "../server/src/services/productPricing.js";

const useGoogle = process.argv.includes("--google");

const result = await backfillZeroProductPrices(mainDb, { useGoogle });
console.log(
  `Done: ${result.updated}/${result.total} products updated` +
    (useGoogle ? ` (${result.googleLookups} Google lookups)` : " (estimate only)")
);
await mainDb.$disconnect();
