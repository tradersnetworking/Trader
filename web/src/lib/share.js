import { investPath } from "./site.js";

export function buildReferralLink(code) {
  const c = encodeURIComponent(code || "");
  if (typeof window === "undefined") return investPath(`/ref/${c}`);
  return `${window.location.origin}${investPath(`/ref/${c}`)}`;
}

export function buildShareText({ type, amount, planName, userName, referralCode }) {
  const link = referralCode ? buildReferralLink(referralCode) : "";
  if (type === "withdrawal") {
    return `I just withdrew ${amount} from Akshaya Invest! 🎉 Join me and start investing with Akshaya Exim.${link ? `\n\nSign up: ${link}` : ""}`;
  }
  if (type === "investment") {
    return `I'm earning with ${planName || "Akshaya Invest"} — invested ${amount}! 📈 Smart returns with Akshaya Exim Invest.${link ? `\n\nJoin: ${link}` : ""}`;
  }
  if (type === "profit") {
    return `${userName || "I"} earned ${amount} profit on Akshaya Invest! 💰${planName ? ` Plan: ${planName}.` : ""}${link ? `\n\nStart investing: ${link}` : ""}`;
  }
  if (type === "achievement") {
    return `${userName || "I"} unlocked "${planName || "an achievement"}" on Akshaya Invest! 🏆${link ? `\n\nJoin: ${link}` : ""}`;
  }
  return `Join Akshaya Exim Invest — smart investment plans with transparent returns.${link ? `\n\n${link}` : ""}`;
}

export const SHARE_PLATFORMS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    href: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "✈️",
    href: (text) => `https://t.me/share/url?url=${encodeURIComponent("")}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: "𝕏",
    href: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "📘",
    href: (text) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
  },
  {
    id: "email",
    label: "Email",
    icon: "✉️",
    href: (text) => `mailto:?subject=${encodeURIComponent("Akshaya Invest")}&body=${encodeURIComponent(text)}`,
  },
];

export function openShare(platform, text) {
  const p = SHARE_PLATFORMS.find((x) => x.id === platform);
  if (!p) return;
  window.open(p.href(text), "_blank", "noopener,noreferrer");
}
