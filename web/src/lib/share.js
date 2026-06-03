import { investShareUrl } from "./portalConfig.js";
import { BRAND_INVEST } from "./brand.js";
import {
  buildPlanShareDescription,
  buildPlanShareUrl,
  INVEST_HOME_DEFAULT,
  MAIN_HOME_DEFAULT,
} from "./shareMeta.js";

/** Social / referral share links — uses additional domain when enabled, else invest subdomain. */
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

/** Default share URL for current portal page. */
export function currentPageShareUrl(fallback = "") {
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href.split("#")[0];
  }
  return fallback;
}

/** Ensure message includes the share link (WhatsApp/Telegram need URL in text or url param). */
export function composeShareMessage(text, url = "") {
  const base = String(text || "").trim();
  const link = String(url || "").trim();
  if (!link) return base;
  if (base.includes(link)) return base;
  return base ? `${base}\n\n🔗 ${link}` : link;
}

export function buildShareText({ type, amount, planName, plan, userName, referralCode, planId, pageUrl }) {
  const referralLink = referralCode ? buildReferralLink(referralCode) : "";
  const planLink = planId || plan?.id ? buildPlanShareUrl(planId || plan?.id, referralCode) : referralLink;
  const page = String(pageUrl || "").trim();
  const joinLine = planLink || referralLink || page;

  if (plan && (type === "investment" || type === "profit")) {
    const body = buildPlanShareDescription(plan, { amount, userName });
    return composeShareMessage(body, planLink || page);
  }

  if (type === "deposit") {
    return composeShareMessage(
      `I deposited ${amount} to my ${BRAND_INVEST} wallet! 💳 Secure KYC, transparent ledger & monthly ROI plans.`,
      joinLine || investShareUrl("/")
    );
  }
  if (type === "withdrawal") {
    return composeShareMessage(
      `Withdrawal of ${amount} completed on ${BRAND_INVEST}! ✅ Payout sent to my registered account.`,
      joinLine || investShareUrl("/")
    );
  }
  if (type === "investment") {
    const planLine = planName ? ` — ${planName}` : "";
    return composeShareMessage(
      `I'm earning with ${BRAND_INVEST}${planLine} — invested ${amount}! 📈 Published monthly ROI, KYC-verified accounts & transparent ledger.`,
      planLink || page || investShareUrl("/#plans")
    );
  }
  if (type === "profit") {
    return composeShareMessage(
      `${userName || "I"} earned ${amount} profit on ${BRAND_INVEST}! 💰${planName ? ` Plan: ${planName}.` : ""} Published monthly ROI, KYC-verified wallet & transparent ledger.`,
      planLink || referralLink || page || investShareUrl("/")
    );
  }
  if (type === "achievement") {
    return composeShareMessage(
      `${userName || "I"} unlocked "${planName || "an achievement"}" on ${BRAND_INVEST}! 🏆`,
      joinLine || investShareUrl("/")
    );
  }
  if (type === "referral") {
    return composeShareMessage(
      `${INVEST_HOME_DEFAULT.description}${referralCode ? `\n\nReferral code: ${String(referralCode).toUpperCase()}` : ""}`,
      referralLink || page || investShareUrl("/")
    );
  }
  if (type === "main") {
    return composeShareMessage(MAIN_HOME_DEFAULT.description, page || "https://akshayaexim.com/");
  }
  return composeShareMessage(INVEST_HOME_DEFAULT.description, joinLine || page || investShareUrl("/"));
}

export const SHARE_PLATFORMS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    href: (text, url) => `https://wa.me/?text=${encodeURIComponent(composeShareMessage(text, url))}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "✈️",
    href: (text, url) => {
      const link = String(url || "").trim() || currentPageShareUrl();
      const message = composeShareMessage(text, link);
      return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
    },
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: "𝕏",
    href: (text, url) => {
      const link = String(url || "").trim();
      const u = link ? `&url=${encodeURIComponent(link)}` : "";
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(composeShareMessage(text, link))}${u}`;
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "📘",
    href: (text, url) => {
      const shareUrl = String(url || "").trim() || currentPageShareUrl("https://invest.akshayaexim.com/");
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
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeShareMessage(text, url))}`;
    },
  },
];

/** Open share target — uses anchor click to avoid popup blockers. */
export function openShare(platform, text, url = "") {
  const p = SHARE_PLATFORMS.find((x) => x.id === platform);
  if (!p) return;
  const link = String(url || "").trim() || currentPageShareUrl();
  const href = p.href(text, link);
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Share personal milestone — includes invite/page link in text for WhatsApp/Telegram. */
export function openTransactionShare(platform, text, url = "") {
  const link = String(url || "").trim() || investShareUrl("/");
  openShare(platform, text, link);
}

/** Native share with generated PNG (mobile WhatsApp / Telegram attach). */
export async function nativeShareImage({ title, text, blob, fileName = "akshaya-invest-milestone.png", url }) {
  if (!navigator.share || !blob) return false;
  try {
    const file = new File([blob], fileName, { type: "image/png" });
    const link = String(url || "").trim() || investShareUrl("/");
    const payload = { files: [file] };
    if (text) payload.text = composeShareMessage(text, link);
    if (title) payload.title = title;
    if (link && navigator.canShare?.({ ...payload, url: link })) payload.url = link;
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
    const link = String(url || "").trim() || currentPageShareUrl();
    await navigator.share({
      title: title || BRAND_INVEST,
      text: composeShareMessage(text, link),
      url: link || undefined,
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
