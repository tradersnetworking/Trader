/**
 * Copy invest-portal logo into public/assets/source/akshaya-investments-logo.png
 * Usage: node scripts/import-invest-logo.mjs [path-to-image.png]
 */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = join(__dirname, "../public/assets/source/akshaya-investments-logo.png");
const src = process.argv[2];

if (!src || !existsSync(src)) {
  console.error("Usage: node scripts/import-invest-logo.mjs <path-to-akshaya-investments-logo.png>");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`Saved invest logo → ${dest} (invest.akshayaexim.com only)`);
