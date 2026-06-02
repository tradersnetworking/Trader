/**
 * Backfill marketplace product basePrice where still ₹0.
 * Usage: npm run backfill-prices --workspace server
 *        npm run backfill-prices --workspace server -- --google
 */
import { mainDb } from "../src/db.js";
import { backfillZeroProductPrices } from "../src/services/productPricing.js";

const useGoogle = process.argv.includes("--google");

const result = await backfillZeroProductPrices(mainDb, { useGoogle });
console.log(
  JSON.stringify({
    ok: true,
    updated: result.updated,
    total: result.total,
    googleLookups: result.googleLookups,
  })
);
await mainDb.$disconnect();
