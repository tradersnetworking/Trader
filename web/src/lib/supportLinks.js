/** Build WhatsApp / Telegram URLs from admin site settings (Kuber-style). */

const DEFAULT_WHATSAPP_MESSAGE = "Hello! I need support with Akshaya Exim Invest.";

export function digitsOnlyPhone(raw) {
  return String(raw || "").replace(/\D/g, "");
}

export function buildWhatsAppUrl(number, message = DEFAULT_WHATSAPP_MESSAGE) {
  const digits = digitsOnlyPhone(number);
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildTelegramUrl(handle) {
  const raw = String(handle || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const user = raw.replace(/^@/, "").replace(/^t\.me\//i, "").split("/")[0];
  if (!user) return "";
  return `https://t.me/${encodeURIComponent(user)}`;
}
