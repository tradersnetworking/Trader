import { investDb } from "../db.js";
import { config } from "../config.js";
import { BRAND_INVEST, INVEST_HOME_DESCRIPTION } from "../data/brand.js";

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

export async function getAllSettings(includeSecrets = false) {
  const rows = await investDb.investSetting.findMany();
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  if (!includeSecrets) {
    map.smtp_pass = map.smtp_pass ? "••••••••" : "";
    map.telegram_bot_token = map.telegram_bot_token ? "••••••••" : "";
  }
  return map;
}

export async function setSettings(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    if (value === undefined) continue;
    if (key === "smtp_pass" && (value === "••••••••" || value === "")) continue;
    if (key === "telegram_bot_token" && (value === "••••••••" || value === "")) continue;
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
