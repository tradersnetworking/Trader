import { investShareUrl } from "./portalConfig.js";
import {
  buildPlanShareDescription,
  buildPlanShareUrl,
  INVEST_HOME_DEFAULT,
  MAIN_HOME_DEFAULT,
} from "./shareMeta.js";

/** Social / referral share links — uses additional domain when enabled, else invest subdomain. */
export function buildReferralLink(code) {
  const raw = String(code || "").trim();
  if (!raw) return "";
  const segment = encodeURIComponent(raw);
  return investShareUrl(`/ref/${segment}`);
}

/** @deprecated use buildPlanShareUrl from shareMeta.js */
export function buildPlanShareLink(planId, referralCode) {
  return buildPlanShareUrl(planId, referralCode);
}

export function buildShareText({ type, amount, planName, plan, userName, referralCode, planId }) {
  const link = referralCode ? buildReferralLink(referralCode) : "";
  const planLink = planId || plan?.id ? buildPlanShareUrl(planId || plan?.id, referralCode) : link;
  const joinLine = planLink || link;

  if (plan && (type === "investment" || type === "profit")) {
    const body = buildPlanShareDescription(plan, { amount, userName });
    return `${body}${joinLine ? `\n\n🔗 View plan & register:\n${joinLine}` : ""}`;
  }

  if (type === "withdrawal") {
    return `I just withdrew ${amount} from Akshaya Invest! 🎉 Join me and start investing with Akshaya Exim.${joinLine ? `\n\nSign up: ${joinLine}` : ""}`;
  }
  if (type === "investment") {
    const planLine = planName ? ` — ${planName}` : "";
    return `I'm earning with Akshaya Invest${planLine} — invested ${amount}! 📈 Published monthly ROI, KYC-verified accounts & transparent ledger.${joinLine ? `\n\nView plans & join:\n${joinLine}` : ""}`;
  }
  if (type === "profit") {
    return `${userName || "I"} earned ${amount} profit on Akshaya Exim Invest! 💰${planName ? ` Plan: ${planName}.` : ""} Published monthly ROI, KYC-verified wallet & transparent ledger.${joinLine ? `\n\nView plans:\n${joinLine}` : ""}`;
  }
  if (type === "achievement") {
    return `${userName || "I"} unlocked "${planName || "an achievement"}" on Akshaya Invest! 🏆${joinLine ? `\n\nJoin:\n${joinLine}` : ""}`;
  }
  if (type === "referral") {
    return `${INVEST_HOME_DEFAULT.description}${joinLine ? `\n\nUse my invite link:\n${joinLine}` : ""}`;
  }
  if (type === "main") {
    return `${MAIN_HOME_DEFAULT.description}${joinLine ? `\n\n${joinLine}` : ""}`;
  }
  return `${INVEST_HOME_DEFAULT.description}${joinLine ? `\n\n${joinLine}` : ""}`;
}

export const SHARE_PLATFORMS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    href: (text, url) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "✈️",
    href: (text, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url || "")}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: "𝕏",
    href: (text, url) => {
      const u = url ? `&url=${encodeURIComponent(url)}` : "";
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${u}`;
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "📘",
    href: (text, url) => {
      const shareUrl = url || "https://invest.akshayaexim.com";
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
    },
  },
  {
    id: "email",
    label: "Email",
    icon: "✉️",
    href: (text, url) => {
      const subject =
        url && url.includes("invest") ? "AKSHAYA Exim Invest — Investment Plan" : "AKSHAYA EXIM TRADERS";
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    },
  },
];

/** Open share target — uses anchor click to avoid popup blockers. */
export function openShare(platform, text, url = "") {
  const p = SHARE_PLATFORMS.find((x) => x.id === platform);
  if (!p) return;
  const href = p.href(text, url);
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Native share sheet when available (mobile). */
export async function nativeShare({ title, text, url }) {
  if (!navigator.share) return false;
  try {
    await navigator.share({
      title: title || "Akshaya Invest",
      text,
      url: url || undefined,
    });
    return true;
  } catch (err) {
    if (err?.name === "AbortError") return true;
    return false;
  }
}

/** Host label for share cards (domain only). */
export function shareHostLabel() {
  try {
    const url = investShareUrl("");
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "invest.akshayaexim.com";
  }
}
