#!/usr/bin/env node
/** Copy custom investment plans OG banner → public/assets/share/invest-plans.png */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(__dirname, "..", "public", "assets", "share", "invest-plans.png");
const src = process.argv[2];

if (!src || !fs.existsSync(src)) {
  console.error("Usage: node scripts/import-invest-plans-banner.mjs <path-to-banner.png>");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied ${src} → ${dest} (${fs.statSync(dest).size} bytes)`);
