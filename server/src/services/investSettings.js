import { investDb } from "../db.js";
import { config } from "../config.js";
import { BRAND_INVEST, INVEST_HOME_DESCRIPTION, normalizeInvestBrandingText } from "../data/brand.js";
const WHATSAPP_KEYS = new Set([
  "whatsapp_api_enabled",
  "whatsapp_api_phone_number_id",
  "whatsapp_api_business_account_id",
  "whatsapp_api_access_token",
  "whatsapp_api_version",
  "whatsapp_otp_enabled",
  "whatsapp_transactional_enabled",
  "whatsapp_otp_template_name",
  "whatsapp_otp_template_language",
  "whatsapp_tx_template_name",
  "whatsapp_tx_template_language",
]);

const DEFAULTS = {
  support_email: "support@akshayaexim.in",
  support_whatsapp: "",
  support_telegram: "",
  telegram_bot_token: "",
  telegram_notify_enabled: "true",
  telegram_notify_channels: "",
  mail_from: `${BRAND_INVEST} <noreply@akshayaexim.in>`,
  site_name: BRAND_INVEST,
  invest_portal_url: config.investPortalUrl,
  homepage_hero_title: "Smart Investment • Secure Future • Grow Your Wealth",
  homepage_hero_subtitle: INVEST_HOME_DESCRIPTION,
  homepage_about_title: `About ${BRAND_INVEST}`,
  homepage_about_body:
    `${BRAND_INVEST} offers structured investment plans with transparent ROI, secure capital protection, and dedicated support for every investor.`,
  homepage_show_calculator: "true",
  homepage_show_partners: "true",
  homepage_show_trust_stats: "true",
  about_company_name: BRAND_INVEST,
  about_company_tagline: "Export • Import • Investment",
  about_company_credentials: "Registered export house • KYC-verified investors • Secure payment gateways",
  smtp_host: config.smtp.host,
  smtp_port: String(config.smtp.port),
  smtp_user: config.smtp.user,
  smtp_pass: "", // never return pass to client
  smtp_secure: String(config.smtp.secure),
  default_communication_email: "noreply@akshayaexim.in",
  default_payout_gateway: "RAZORPAYX",
  default_payout_prefer_bank: "false",
  default_deposit_gateway: "RAZORPAY",
};

export async function getSetting(key) {
  const row = await investDb.investSetting.findUnique({ where: { key } });
  if (row?.value) return row.value;
  return DEFAULTS[key] ?? "";
}

const BRAND_TEXT_KEYS = new Set([
  "site_name",
  "homepage_hero_subtitle",
  "homepage_about_title",
  "homepage_about_body",
  "about_company_name",
  "mail_from",
]);

const MASKED_PLACEHOLDER = "••••••••";

/** Gateway/bank credential fields — blank or masked values must not overwrite stored secrets. */
export function isMaskedCredentialValue(value) {
  return value === "" || value === MASKED_PLACEHOLDER;
}

export function isGatewayCredentialKey(key) {
  if (!key || typeof key !== "string") return false;
  if (key.startsWith("gateway_")) {
    return /_(secret|salt|key_secret|api_key|api_secret)$/.test(key) || key === "gateway_stripe_secret_key";
  }
  if (key.startsWith("bank_")) {
    return /_(secret|client_secret|api_secret|api_key)$/.test(key);
  }
  return false;
}

export async function getAllSettings(includeSecrets = false) {
  const rows = await investDb.investSetting.findMany();
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  for (const key of BRAND_TEXT_KEYS) {
    if (map[key]) map[key] = normalizeInvestBrandingText(map[key]);
  }
  if (!includeSecrets) {
    map.smtp_pass = map.smtp_pass ? MASKED_PLACEHOLDER : "";
    map.telegram_bot_token = map.telegram_bot_token ? MASKED_PLACEHOLDER : "";
    map.whatsapp_api_access_token = map.whatsapp_api_access_token ? MASKED_PLACEHOLDER : "";
    for (const key of Object.keys(map)) {
      if (isGatewayCredentialKey(key) && map[key]) map[key] = MASKED_PLACEHOLDER;
    }
  }
  return map;
}

export async function setSettings(pairs, { allowWhatsAppKeys = false } = {}) {
  for (const [key, value] of Object.entries(pairs)) {
    if (value === undefined) continue;
    if (WHATSAPP_KEYS.has(key) && !allowWhatsAppKeys) continue;
    if (key === "smtp_pass" && isMaskedCredentialValue(value)) continue;
    if (key === "telegram_bot_token" && isMaskedCredentialValue(value)) continue;
    if (key === "whatsapp_api_access_token" && isMaskedCredentialValue(value)) continue;
    if (isGatewayCredentialKey(key) && isMaskedCredentialValue(value)) continue;
    await investDb.investSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  return getAllSettings(false);
}

export async function getSupportEmail() {
  return (await getSetting("support_email")) || DEFAULTS.support_email;
}

export async function getMailFrom() {
  const custom = await getSetting("default_communication_email");
  if (custom) return custom.includes("<") ? custom : `${BRAND_INVEST} <${custom}>`;
  return (await getSetting("mail_from")) || DEFAULTS.mail_from;
}
