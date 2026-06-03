/**
 * Point all marketplace products at curated category images (no web scraping).
 * Usage: npm run curate-images --workspace server
 */
import { mainDb } from "../src/db.js";
import { applyCuratedProductImages, syncCategoryImageFields } from "../src/services/productImageSync.js";

const cats = await syncCategoryImageFields(mainDb);
const products = await applyCuratedProductImages(mainDb);
console.log(JSON.stringify({ ok: true, categories: cats, products }, null, 2));
await mainDb.$disconnect();
