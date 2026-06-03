/**
 * Backfill / refresh marketplace product basePrice.
 * Usage: npm run backfill-prices --workspace server
 *        npm run backfill-prices --workspace server -- --google
 *        npm run backfill-prices --workspace server -- --all --google
 */
import { mainDb } from "../src/db.js";
import { refreshProductPrices } from "../src/services/productPricing.js";

const useGoogle = process.argv.includes("--google");
const onlyZero = !process.argv.includes("--all");

const result = await refreshProductPrices(mainDb, { useGoogle, onlyZero });
console.log(
  JSON.stringify({
    ok: true,
    updated: result.updated,
    total: result.total,
    googleLookups: result.googleLookups,
  })
);
await mainDb.$disconnect();
