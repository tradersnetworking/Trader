import sharp from "sharp";
import {
  normalizePlanRoi,
  planCalcPreview,
  lockInCategoryLabel,
} from "../utils/invest.js";

const W = 1200;
const H = 630;

const TIER_GRADIENT = {
  STARTER: { from: "#059669", to: "#065f46" },
  BRONZE: { from: "#b45309", to: "#78350f" },
  SILVER: { from: "#64748b", to: "#334155" },
  GOLD: { from: "#eab308", to: "#b45309" },
  PLATINUM: { from: "#2563eb", to: "#3730a3" },
  DIAMOND: { from: "#7c3aed", to: "#581c87" },
};

const TIER_ICONS = {
  STARTER: "🌱",
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "👑",
  PLATINUM: "💎",
  DIAMOND: "💠",
};

const DEFAULT_LOCK_IN_MONTHS = {
  STARTER: 1,
  BRONZE: 3,
  SILVER: 6,
  GOLD: 12,
  PLATINUM: 24,
  DIAMOND: 36,
};

const pngCache = new Map();

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function isFeaturedPlan(plan) {
  const months = Math.max(1, Math.round(Number(plan.lockInDays || 30) / 30));
  return DEFAULT_LOCK_IN_MONTHS[plan.planType] === months;
}

/** SVG matching dashboard PlanCard (vertical card on OG canvas). */
export function buildPlanCardShareSvg(plan) {
  const p = normalizePlanRoi(plan);
  const tier = String(p.planType || "STARTER").toUpperCase();
  const grad = TIER_GRADIENT[tier] || TIER_GRADIENT.STARTER;
  const icon = TIER_ICONS[tier] || "⭐";
  const calc = planCalcPreview(p.minInvestment, p, "MONTHLY");
  const annual = Number(p.annualRoiPct ?? p.monthlyRoiPct * 12);
  const featured = isFeaturedPlan(p);
  const lockLabel = lockInCategoryLabel(p.lockInDays);
  const settlements = String(p.settlementCycles || "MONTHLY").replace(/,/g, " · ");

  const rows = [
    ["Min investment", formatInr(p.minInvestment), "#0f172a"],
    ["Max investment", formatInr(p.maxInvestment), "#0f172a"],
    ["Monthly return @ min", formatInr(calc.monthlyReturn), "#059669"],
    ["Annual return @ min", formatInr(calc.monthlyReturn * 12), "#0f172a"],
    ["Expected @ lock-in", formatInr(calc.totalSimpleProfit), "#059669"],
    ["Capital return date", formatDate(calc.maturityDate), "#0f172a"],
    ["Settlement", settlements, "#0f172a"],
    ["Compounding", "At maturity only", "#0f172a"],
  ];

  let rowY = 318;
  const rowSvg = rows
    .map(([label, value, color]) => {
      const y = rowY;
      rowY += 34;
      return `
    <line x1="72" y1="${y + 26}" x2="548" y2="${y + 26}" stroke="#e2e8f0" stroke-width="1"/>
    <text x="72" y="${y + 18}" font-family="Inter,Arial,sans-serif" font-size="15" fill="#64748b">${escapeXml(label)}</text>
    <text x="548" y="${y + 18}" text-anchor="end" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="700" fill="${color}">${escapeXml(value)}</text>`;
    })
    .join("");

  const badges = featured
    ? `<text x="72" y="98" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700" fill="#000">
        <tspan fill="#FFD700" stroke="#B8860B" stroke-width="0.5">  POPULAR  </tspan>
        <tspan dx="8" fill="#FFFFFF" opacity="0.9">  RECOMMENDED  </tspan>
      </text>
      <rect x="72" y="82" width="72" height="22" rx="11" fill="#FFD700"/>
      <text x="88" y="97" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="800" fill="#000">POPULAR</text>
      <rect x="152" y="82" width="108" height="22" rx="11" fill="rgba(255,255,255,0.2)"/>
      <text x="164" y="97" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="700" fill="#FFFFFF">RECOMMENDED</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="pageBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="hdr" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${grad.from}"/>
        <stop offset="100%" stop-color="${grad.to}"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFD700"/>
        <stop offset="100%" stop-color="#D4AF37"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#pageBg)"/>
    <g filter="url(#shadow)">
      <rect x="40" y="28" width="560" height="574" rx="24" fill="#ffffff" stroke="#D4AF37" stroke-width="2"/>
      <rect x="40" y="28" width="560" height="168" rx="24" fill="url(#hdr)"/>
      <rect x="40" y="168" width="560" height="28" fill="url(#hdr)"/>
      ${badges}
      <text x="72" y="${featured ? 138 : 108}" font-size="42">${icon}</text>
      <rect x="468" y="52" width="108" height="28" rx="8" fill="rgba(255,255,255,0.15)"/>
      <text x="522" y="72" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">${escapeXml(tier)}</text>
      <text x="72" y="${featured ? 178 : 148}" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="800" fill="#FFFFFF">${escapeXml(p.name)}</text>
      <text x="72" y="${featured ? 208 : 178}" font-family="Inter,Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.85)">${escapeXml(lockLabel)} lock-in</text>
      <rect x="72" y="218" width="228" height="72" rx="12" fill="#f1f5f9"/>
      <text x="186" y="252" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="32" font-weight="900" fill="#0f172a">${p.monthlyRoiPct}%</text>
      <text x="186" y="276" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="600" fill="#64748b">MONTHLY ROI</text>
      <rect x="312" y="218" width="228" height="72" rx="12" fill="rgba(212,175,55,0.12)"/>
      <text x="426" y="252" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="32" font-weight="900" fill="#B45309">${annual}%</text>
      <text x="426" y="276" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="600" fill="#64748b">ANNUAL ROI</text>
      ${rowSvg}
    </g>
    <text x="640" y="120" font-family="Inter,Arial,sans-serif" font-size="40" font-weight="800" fill="url(#gold)">AKSHAYA Exim Invest</text>
    <text x="640" y="175" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="600" fill="#E2E8F0">Investment plan · Live preview</text>
    <text x="640" y="230" font-family="Inter,Arial,sans-serif" font-size="18" fill="#94A3B8">Published monthly ROI · Flexible lock-in</text>
    <text x="640" y="265" font-family="Inter,Arial,sans-serif" font-size="18" fill="#94A3B8">KYC-verified accounts · Wallet &amp; ledger</text>
    <text x="640" y="300" font-family="Inter,Arial,sans-serif" font-size="18" fill="#94A3B8">Starter · Bronze · Silver · Gold · Platinum · Diamond</text>
    <rect x="640" y="380" width="520" height="100" rx="14" fill="rgba(212,175,55,0.12)" stroke="#D4AF37" stroke-width="2"/>
    <text x="660" y="430" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#FDE68A">invest.akshayaexim.com</text>
    <text x="660" y="462" font-family="Inter,Arial,sans-serif" font-size="16" fill="#94A3B8">Tap the link to view this plan &amp; register</text>
  </svg>`;
}

export async function renderPlanOgPng(plan) {
  const key = `${plan.id}:${plan.updatedAt || plan.monthlyRoiPct}:${plan.lockInDays}`;
  if (pngCache.has(key)) return pngCache.get(key);
  const svg = buildPlanCardShareSvg(plan);
  const buf = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
  if (pngCache.size > 200) pngCache.clear();
  pngCache.set(key, buf);
  return buf;
}

export function planOgImagePath(planId) {
  return `/api/share/plan/${encodeURIComponent(String(planId))}.png`;
}
