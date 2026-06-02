import { investShareUrl } from "./portalConfig.js";
import {
  buildPlanShareDescription,
  buildPlanShareUrl,
  INVEST_HOME_DEFAULT,
  MAIN_HOME_DEFAULT,
} from "./shareMeta.js";

/** Social / referral share links — uses additional domain when enabled, else invest subdomain. */
/** Referral invite URL — invest home with ?ref= so link previews match homepage OG meta. */
export function buildReferralLink(code) {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return "";
  try {
    const u = new URL(investShareUrl("/") || "https://invest.akshayaexim.com/");
    u.searchParams.set("ref", raw);
    return u.toString();
  } catch {
    return `https://invest.akshayaexim.com/?ref=${encodeURIComponent(raw)}`;
  }
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

  if (type === "deposit") {
    return `I deposited ${amount} to my Akshaya Invest wallet! 💳 Secure KYC, transparent ledger & monthly ROI plans.${joinLine ? `\n\nExplore plans:\n${joinLine}` : ""}`;
  }
  if (type === "withdrawal") {
    return `Withdrawal of ${amount} completed on Akshaya Invest! ✅ Payout sent to my registered account.${joinLine ? `\n\nExplore plans:\n${joinLine}` : ""}`;
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
        url && url.includes("invest")
          ? INVEST_HOME_DEFAULT.title
          : "AKSHAYA EXIM TRADERS";
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

/** Share personal milestone (profit / withdrawal / deposit) — text only so link previews stay off the marketing banner. */
export function openTransactionShare(platform, text) {
  const p = SHARE_PLATFORMS.find((x) => x.id === platform);
  if (!p) return;
  let href;
  if (platform === "whatsapp") {
    href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  } else if (platform === "telegram") {
    href = `https://t.me/share/url?url=${encodeURIComponent("https://t.me")}&text=${encodeURIComponent(text)}`;
  } else if (platform === "email") {
    href = `mailto:?subject=${encodeURIComponent("Akshaya Invest")}&body=${encodeURIComponent(text)}`;
  } else if (platform === "twitter") {
    href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  } else {
    href = p.href(text, "");
  }
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Native share with generated PNG (mobile WhatsApp / Telegram attach). */
export async function nativeShareImage({ title, text, blob, fileName = "akshaya-invest-milestone.png" }) {
  if (!navigator.share || !blob) return false;
  try {
    const file = new File([blob], fileName, { type: "image/png" });
    const payload = { files: [file] };
    if (text) payload.text = text;
    if (title) payload.title = title;
    if (navigator.canShare && !navigator.canShare(payload)) {
      return false;
    }
    await navigator.share(payload);
    return true;
  } catch (err) {
    if (err?.name === "AbortError") return true;
    return false;
  }
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
