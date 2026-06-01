/**
 * Generate logo, favicon, and default placeholder images when source PNGs are missing.
 * Usage: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "assets");
const catDir = join(outDir, "categories");

mkdirSync(outDir, { recursive: true });
mkdirSync(catDir, { recursive: true });

function logoSvg({ compact = false } = {}) {
  if (compact) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFD700"/>
          <stop offset="50%" stop-color="#D4AF37"/>
          <stop offset="100%" stop-color="#B8860B"/>
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="220" fill="none" stroke="url(#g)" stroke-width="28"/>
      <ellipse cx="256" cy="256" rx="220" ry="88" fill="none" stroke="url(#g)" stroke-width="16"/>
      <path d="M256 36 L256 476" stroke="url(#g)" stroke-width="16"/>
      <path d="M36 256 Q256 120 476 256 Q256 392 36 256" fill="none" stroke="url(#g)" stroke-width="16"/>
      <text x="256" y="280" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="120" font-weight="800" fill="url(#g)">A</text>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240" viewBox="0 0 960 240">
    <defs>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="50%" stop-color="#D4AF37"/>
        <stop offset="100%" stop-color="#B8860B"/>
      </linearGradient>
    </defs>
    <g transform="translate(20,20)">
      <circle cx="100" cy="100" r="88" fill="none" stroke="url(#gold)" stroke-width="12"/>
      <ellipse cx="100" cy="100" rx="88" ry="36" fill="none" stroke="url(#gold)" stroke-width="8"/>
      <path d="M100 12 L100 188" stroke="url(#gold)" stroke-width="8"/>
      <path d="M12 100 Q100 52 188 100 Q100 148 12 100" fill="none" stroke="url(#gold)" stroke-width="8"/>
      <text x="100" y="118" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="52" font-weight="800" fill="url(#gold)">A</text>
    </g>
    <text x="230" y="88" font-family="Inter,Arial,sans-serif" font-size="52" font-weight="800" fill="#FFFFFF">Akshaya Exim</text>
    <text x="230" y="138" font-family="Inter,Arial,sans-serif" font-size="36" font-weight="700" fill="url(#gold)">Traders</text>
    <text x="230" y="178" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="500" fill="#94A3B8" letter-spacing="4">INVEST · EARN · GROW</text>
  </svg>`;
}

function defaultTradeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#002366"/>
        <stop offset="100%" stop-color="#0056b3"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <circle cx="400" cy="260" r="100" fill="none" stroke="#D4AF37" stroke-width="8" opacity="0.8"/>
    <path d="M320 260 L480 260 M400 180 L400 340" stroke="#D4AF37" stroke-width="6" opacity="0.6"/>
    <text x="400" y="420" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="36" font-weight="700" fill="#FFFFFF">Global Trade</text>
    <text x="400" y="465" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" fill="#94A3B8">Export &amp; Import</text>
  </svg>`;
}

async function writeSvgPng(svg, dest, w, h) {
  await sharp(Buffer.from(svg)).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(dest);
}

const fullLogo = join(outDir, "logo.png");
const markLogo = join(outDir, "logo-mark.png");
const favicon = join(outDir, "favicon.png");
const icon192 = join(outDir, "icon-192.png");
const icon512 = join(outDir, "icon-512.png");
const defaultTrade = join(catDir, "default-trade.webp");

if (!existsSync(fullLogo)) {
  await writeSvgPng(logoSvg(), fullLogo, 960, 240);
  console.log("Created logo.png");
}
if (!existsSync(markLogo)) {
  await writeSvgPng(logoSvg({ compact: true }), markLogo, 512, 512);
  console.log("Created logo-mark.png");
}
if (!existsSync(favicon)) {
  await sharp(markLogo).resize(32, 32).png().toFile(favicon);
  copyFileSync(favicon, join(root, "public", "favicon.png"));
  console.log("Created favicon.png");
}
if (!existsSync(icon192)) {
  await sharp(markLogo).resize(192, 192).png().toFile(icon192);
  console.log("Created icon-192.png");
}
if (!existsSync(icon512)) {
  await sharp(markLogo).resize(512, 512).png().toFile(icon512);
  console.log("Created icon-512.png");
}
if (!existsSync(defaultTrade)) {
  await sharp(Buffer.from(defaultTradeSvg())).webp({ quality: 82 }).toFile(defaultTrade);
  console.log("Created default-trade.webp");
}

console.log("Brand assets ready.");
