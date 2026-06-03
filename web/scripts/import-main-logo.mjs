/**
 * Copy main-site logo PNG into public/assets/source/akshaya-exim-logo.png
 * Usage: node scripts/import-main-logo.mjs [path-to-image.png]
 */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = join(__dirname, "../public/assets/source/akshaya-exim-logo.png");
const src = process.argv[2];

if (!src || !existsSync(src)) {
  console.error("Usage: node scripts/import-main-logo.mjs <path-to-akshaya-exim-logo.png>");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`Saved main logo → ${dest}`);
