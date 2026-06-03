/**
 * Generate logo, favicon, and default placeholder images when source PNGs are missing.
 * Usage: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync, existsSync, statSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "assets");
const catDir = join(outDir, "categories");
const shareDir = join(outDir, "share");
const planShareDir = join(shareDir, "plans");

mkdirSync(outDir, { recursive: true });
mkdirSync(catDir, { recursive: true });
mkdirSync(planShareDir, { recursive: true });

/** Invest portal favicon / PWA icon with readable brand text. */
function investFaviconSvg({ showText = true } = {}) {
  const textBlock = showText
    ? `<text x="256" y="300" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="44" font-weight="800" fill="#FFFFFF">Akshaya</text>
    <text x="256" y="352" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#D4AF37">Investments</text>`
    : `<text x="256" y="318" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="88" font-weight="800" fill="#D4AF37">AI</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#002366"/>
        <stop offset="100%" stop-color="#0a3d91"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="50%" stop-color="#D4AF37"/>
        <stop offset="100%" stop-color="#B8860B"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="96" fill="url(#bg)"/>
    <circle cx="256" cy="168" r="72" fill="none" stroke="url(#gold)" stroke-width="14"/>
    <ellipse cx="256" cy="168" rx="72" ry="30" fill="none" stroke="url(#gold)" stroke-width="10"/>
    <path d="M256 96 L256 240" stroke="url(#gold)" stroke-width="10"/>
    <path d="M184 168 Q256 132 328 168 Q256 204 184 168" fill="none" stroke="url(#gold)" stroke-width="10"/>
    <text x="256" y="188" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="56" font-weight="800" fill="url(#gold)">A</text>
    ${textBlock}
  </svg>`;
}

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
    <text x="230" y="88" font-family="Inter,Arial,sans-serif" font-size="52" font-weight="800" fill="#FFFFFF">AKASHYA EXIM</text>
    <text x="230" y="138" font-family="Inter,Arial,sans-serif" font-size="36" font-weight="700" fill="url(#gold)">TRADERS</text>
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

const SOURCE_INVEST_LOGO = join(outDir, "source", "akshaya-investments-logo.png");
const SOURCE_MAIN_LOGO = join(outDir, "source", "akshaya-exim-logo.png");
const mainFull = join(outDir, "logo-main.png");
const mainMark = join(outDir, "logo-main-mark.png");
const investFull = join(outDir, "logo-invest.png");
const investMark = join(outDir, "logo-invest-mark.png");
const fullLogo = join(outDir, "logo.png");
const markLogo = join(outDir, "logo-mark.png");
const favicon = join(outDir, "favicon.png");
const favicon16 = join(outDir, "favicon-16.png");
const favicon32 = join(outDir, "favicon-32.png");
const favicon48 = join(outDir, "favicon-48.png");
const faviconIco = join(outDir, "favicon.ico");
const appleTouch = join(outDir, "apple-touch-icon.png");
const icon192 = join(outDir, "icon-192.png");
const icon512 = join(outDir, "icon-512.png");
const defaultTrade = join(catDir, "default-trade.webp");

/** Key out black/near-black pixels — logos sit on transparent PNGs (no black box on site). */
async function pngWithoutBlackBox(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 42 || (r < 72 && g < 72 && b < 72)) data[o + 3] = 0;
  }
  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function writeTransparentPng(pipeline, dest, w, h) {
  const buf = await pipeline.resize(w, h, { fit: "inside" }).png().toBuffer();
  await sharp(buf).trim({ threshold: 10 }).png().toFile(dest);
}

function writeIcoFromPng(pngPath, icoPath) {
  const png = readFileSync(pngPath);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir[0] = 32;
  dir[1] = 32;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(22, 12);
  writeFileSync(icoPath, Buffer.concat([header, dir, png]));
}

/** Marketplace (main) — from akshaya-exim-logo.png when present, else SVG fallback. */
async function buildMainBrandAssets() {
  if (existsSync(SOURCE_MAIN_LOGO)) {
    const meta = await sharp(SOURCE_MAIN_LOGO).metadata();
    const w = meta.width || 1024;
    const h = meta.height || 1024;

    const mainFullPipeline = await pngWithoutBlackBox(SOURCE_MAIN_LOGO);
    await writeTransparentPng(mainFullPipeline, mainFull, 320, 400);

    const markSide = Math.min(w, Math.round(h * 0.52));
    const left = Math.max(0, Math.round((w - markSide) / 2));
    const cropped = await sharp(SOURCE_MAIN_LOGO)
      .extract({ left, top: 0, width: markSide, height: markSide })
      .toBuffer();
    const mainMarkPipeline = await pngWithoutBlackBox(cropped);
    await writeTransparentPng(mainMarkPipeline, mainMark, 512, 512);
    console.log("Main marketplace assets (akshaya-exim-logo.png, transparent)");
  } else {
    await writeSvgPng(logoSvg(), mainFull, 960, 240);
    await writeSvgPng(logoSvg({ compact: true }), mainMark, 512, 512);
    console.log("Main brand assets (SVG fallback — add public/assets/source/akshaya-exim-logo.png)");
  }

  copyFileSync(mainFull, fullLogo);
  copyFileSync(mainMark, markLogo);

  const markBuf = await sharp(mainMark).toBuffer();
  await sharp(markBuf).resize(32, 32).png().toFile(favicon);
  await sharp(markBuf).resize(16, 16).png().toFile(favicon16);
  await sharp(markBuf).resize(32, 32).png().toFile(favicon32);
  await sharp(markBuf).resize(48, 48).png().toFile(favicon48);
  await sharp(markBuf).resize(180, 180).png().toFile(appleTouch);
  await sharp(markBuf).resize(192, 192).png().toFile(icon192);
  await sharp(markBuf).resize(512, 512).png().toFile(icon512);
  writeIcoFromPng(favicon, faviconIco);

  const publicRoot = join(root, "public");
  copyFileSync(favicon, join(publicRoot, "favicon.png"));
  copyFileSync(faviconIco, join(publicRoot, "favicon.ico"));
}

/** Invest portal — full logo + mark + favicons from source PNG only. */
async function buildInvestBrandAssets() {
  if (!existsSync(SOURCE_INVEST_LOGO)) {
    console.warn("Missing invest source logo — skip invest assets");
    return false;
  }

  const meta = await sharp(SOURCE_INVEST_LOGO).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  const investFullPipeline = await pngWithoutBlackBox(SOURCE_INVEST_LOGO);
  await writeTransparentPng(investFullPipeline, investFull, 300, 400);

  const markSide = Math.min(w, Math.round(h * 0.48));
  const left = Math.max(0, Math.round((w - markSide) / 2));
  const cropped = await sharp(SOURCE_INVEST_LOGO)
    .extract({ left, top: 0, width: markSide, height: markSide })
    .toBuffer();
  const investMarkPipeline = await pngWithoutBlackBox(cropped);
  await writeTransparentPng(investMarkPipeline, investMark, 512, 512);

  const markBuf = await sharp(investMark).toBuffer();
  const investFavicon = join(outDir, "favicon-invest.png");
  await sharp(markBuf).resize(32, 32).png().toFile(investFavicon);
  for (const size of [16, 32, 48]) {
    await sharp(markBuf).resize(size, size).png().toFile(join(outDir, `favicon-invest-${size}.png`));
  }
  writeIcoFromPng(investFavicon, join(outDir, "favicon-invest.ico"));
  await sharp(markBuf).resize(180, 180).png().toFile(join(outDir, "apple-touch-icon-invest.png"));
  await sharp(markBuf).resize(192, 192).png().toFile(join(outDir, "icon-invest-192.png"));
  await sharp(markBuf).resize(512, 512).png().toFile(join(outDir, "icon-invest-512.png"));

  const publicRoot = join(root, "public");
  copyFileSync(investFavicon, join(publicRoot, "favicon-invest.png"));
  copyFileSync(join(outDir, "favicon-invest.ico"), join(publicRoot, "favicon-invest.ico"));
  console.log("Invest portal assets (akshaya-investments-logo.png, transparent — not used on main site)");
  return true;
}

await buildMainBrandAssets();
await buildInvestBrandAssets();
if (!existsSync(defaultTrade)) {
  await sharp(Buffer.from(defaultTradeSvg())).webp({ quality: 82 }).toFile(defaultTrade);
  console.log("Created default-trade.webp");
}

function categoryTileSvg(name, accent = "#D4AF37") {
  const initial = (name.match(/[A-Za-z]/)?.[0] || "A").toUpperCase();
  const safe = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#002366"/>
        <stop offset="55%" stop-color="#0056b3"/>
        <stop offset="100%" stop-color="#001433"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <circle cx="680" cy="120" r="160" fill="${accent}" opacity="0.12"/>
    <circle cx="120" cy="520" r="120" fill="#FFD700" opacity="0.08"/>
    <text x="400" y="250" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="120" font-weight="800" fill="url(#gold)">${initial}</text>
    <text x="400" y="330" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">${safe}</text>
    <text x="400" y="370" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="500" fill="#94A3B8" letter-spacing="3">EXIM TRADE</text>
  </svg>`;
}

function slugName(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

const accents = ["#D4AF37", "#FFD700", "#B8860B", "#0056b3", "#10b981", "#f59e0b"];
const { TAXONOMY } = await import("../../server/src/data/categories.js");
let createdCats = 0;
for (let i = 0; i < TAXONOMY.length; i++) {
  const c = TAXONOMY[i];
  const dest = join(catDir, `${slugName(c.name)}.webp`);
  if (!existsSync(dest)) {
    await sharp(Buffer.from(categoryTileSvg(c.name, accents[i % accents.length])))
      .webp({ quality: 84 })
      .toFile(dest);
    createdCats++;
  }
}
if (createdCats) console.log(`Created ${createdCats} EXIM category images`);

/** 1200×630 Open Graph plan card (matches dashboard PlanCard tiers). */
const PLAN_TIERS = [
  { type: "STARTER", label: "Starter", icon: "🌱", from: "#059669", to: "#065f46", monthly: 10, capital: "₹1 – 5 Lakhs" },
  { type: "BRONZE", label: "Bronze", icon: "🥉", from: "#b45309", to: "#78350f", monthly: 12, capital: "₹6 – 10 Lakhs" },
  { type: "SILVER", label: "Silver", icon: "🥈", from: "#64748b", to: "#334155", monthly: 15, capital: "₹11 – 15 Lakhs" },
  { type: "GOLD", label: "Gold", icon: "👑", from: "#eab308", to: "#b45309", monthly: 17, capital: "₹16 – 30 Lakhs" },
  { type: "PLATINUM", label: "Platinum", icon: "💎", from: "#2563eb", to: "#3730a3", monthly: 19, capital: "₹31 – 50 Lakhs" },
  { type: "DIAMOND", label: "Diamond", icon: "💠", from: "#7c3aed", to: "#581c87", monthly: 20, capital: "Above ₹50 Lakhs" },
];

function planShareCardSvg(tier) {
  const annual = tier.monthly * 12;
  const safe = tier.label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${tier.from}"/>
        <stop offset="100%" stop-color="${tier.to}"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="100%" stop-color="#D4AF37"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="48" y="48" width="520" height="534" rx="28" fill="url(#card)"/>
    <text x="88" y="130" font-size="64">${tier.icon}</text>
    <text x="88" y="210" font-family="Inter,Arial,sans-serif" font-size="44" font-weight="800" fill="#FFFFFF">${safe}</text>
    <text x="88" y="258" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="600" fill="rgba(255,255,255,0.85)">${tier.type} · ${tier.capital}</text>
    <text x="88" y="360" font-family="Inter,Arial,sans-serif" font-size="72" font-weight="900" fill="#FFFFFF">${tier.monthly}%</text>
    <text x="88" y="410" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="600" fill="rgba(255,255,255,0.9)">Monthly ROI</text>
    <text x="88" y="460" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700" fill="#FDE68A">~${annual}% annual</text>
    <text x="620" y="140" font-family="Inter,Arial,sans-serif" font-size="36" font-weight="800" fill="url(#gold)">Akshaya Exim Invest</text>
    <text x="620" y="200" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="600" fill="#E2E8F0">Investment Plan Card</text>
    <text x="620" y="260" font-family="Inter,Arial,sans-serif" font-size="20" fill="#94A3B8">Transparent monthly returns · KYC verified</text>
    <text x="620" y="300" font-family="Inter,Arial,sans-serif" font-size="20" fill="#94A3B8">Wallet, ledger &amp; digital agreements</text>
    <text x="620" y="340" font-family="Inter,Arial,sans-serif" font-size="20" fill="#94A3B8">KYC onboarding · Wallet &amp; ledger</text>
    <rect x="620" y="400" width="520" height="120" rx="16" fill="rgba(212,175,55,0.15)" stroke="#D4AF37" stroke-width="2"/>
    <text x="640" y="455" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#FDE68A">invest.akshayaexim.com</text>
    <text x="640" y="490" font-family="Inter,Arial,sans-serif" font-size="16" fill="#94A3B8">Flexible lock-in · 1 to 60 months</text>
  </svg>`;
}

function investPlansOverviewSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#002366"/>
        <stop offset="50%" stop-color="#0a3d91"/>
        <stop offset="100%" stop-color="#001433"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <text x="600" y="220" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="52" font-weight="800" fill="#FFD700">AKSHAYA Exim Invest</text>
    <text x="600" y="290" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="32" font-weight="600" fill="#FFFFFF">Investment Plans · Transparent Returns</text>
    <text x="600" y="350" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="22" fill="#94A3B8">Starter · Bronze · Silver · Gold · Platinum · Diamond</text>
    <text x="600" y="400" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" fill="#94A3B8">From ₹1 Lakh · Monthly ROI published · KYC &amp; secure payouts</text>
  </svg>`;
}

let createdPlans = 0;
for (const tier of PLAN_TIERS) {
  const dest = join(planShareDir, `${tier.type}.png`);
  if (!existsSync(dest)) {
    await sharp(Buffer.from(planShareCardSvg(tier))).png({ quality: 90 }).toFile(dest);
    createdPlans++;
  }
}
if (createdPlans) console.log(`Created ${createdPlans} plan share card images`);

const investPlansOverview = join(shareDir, "invest-plans.png");
const investPlansStat = existsSync(investPlansOverview) ? statSync(investPlansOverview) : null;
if (!investPlansStat) {
  await sharp(Buffer.from(investPlansOverviewSvg())).png({ quality: 90 }).toFile(investPlansOverview);
  console.log("Created invest-plans.png");
} else if (investPlansStat.size < 120_000) {
  console.log("Keeping invest-plans.png (run import-invest-plans-banner.mjs to replace with custom banner)");
}

console.log("Brand assets ready.");
