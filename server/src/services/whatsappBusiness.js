/**
 * Meta WhatsApp Business Cloud API — invest portal only.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { investDb } from "../db.js";
import { getSetting } from "./investSettings.js";

const GRAPH = "https://graph.facebook.com";

export const WHATSAPP_SETTING_KEYS = [
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
];

const WHATSAPP_DEFAULTS = {
  whatsapp_api_enabled: "false",
  whatsapp_api_phone_number_id: "",
  whatsapp_api_business_account_id: "",
  whatsapp_api_access_token: "",
  whatsapp_api_version: "v21.0",
  whatsapp_otp_enabled: "true",
  whatsapp_transactional_enabled: "true",
  whatsapp_otp_template_name: "authentication",
  whatsapp_otp_template_language: "en",
  whatsapp_tx_template_name: "invest_update",
  whatsapp_tx_template_language: "en",
};

export async function getWhatsAppSettings(includeSecrets = false) {
  const out = { ...WHATSAPP_DEFAULTS };
  for (const key of WHATSAPP_SETTING_KEYS) {
    out[key] = (await getSetting(key)) || WHATSAPP_DEFAULTS[key] || "";
  }
  if (!out.whatsapp_api_phone_number_id && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    out.whatsapp_api_phone_number_id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }
  if (!out.whatsapp_api_access_token && process.env.WHATSAPP_ACCESS_TOKEN) {
    out.whatsapp_api_access_token = process.env.WHATSAPP_ACCESS_TOKEN;
  }
  const tokenRaw = includeSecrets
    ? out.whatsapp_api_access_token || process.env.WHATSAPP_ACCESS_TOKEN || ""
    : "";
  if (!includeSecrets && out.whatsapp_api_access_token) {
    out.whatsapp_api_access_token = "••••••••";
  }
  const hasToken =
    includeSecrets
      ? String(tokenRaw).length > 10
      : Boolean(out.whatsapp_api_access_token === "••••••••" || process.env.WHATSAPP_ACCESS_TOKEN);
  out.configured =
    out.whatsapp_api_enabled === "true" && Boolean(out.whatsapp_api_phone_number_id) && hasToken;
  return out;
}

export async function saveWhatsAppSettings(pairs, { includeSecrets = false } = {}) {
  const { setSettings } = await import("./investSettings.js");
  const filtered = {};
  for (const key of WHATSAPP_SETTING_KEYS) {
    if (pairs[key] === undefined) continue;
    if (key === "whatsapp_api_access_token" && (pairs[key] === "••••••••" || pairs[key] === "")) continue;
    filtered[key] = String(pairs[key]);
  }
  await setSettings(filtered, { allowWhatsAppKeys: true });
  return getWhatsAppSettings(includeSecrets);
}

async function resolveAccessToken(includeSecrets) {
  if (includeSecrets) {
    const row = await getSetting("whatsapp_api_access_token");
    if (row && row !== "••••••••") return row;
    return process.env.WHATSAPP_ACCESS_TOKEN || "";
  }
  const stored = await getSetting("whatsapp_api_access_token");
  if (stored) return stored;
  return process.env.WHATSAPP_ACCESS_TOKEN || "";
}

export async function isWhatsAppApiReady() {
  const cfg = await getWhatsAppSettings(true);
  const token = await resolveAccessToken(true);
  return cfg.whatsapp_api_enabled === "true" && cfg.whatsapp_api_phone_number_id && token?.length > 10;
}

export async function isWhatsAppOtpEnabled() {
  if (!(await isWhatsAppApiReady())) return false;
  return (await getSetting("whatsapp_otp_enabled")) !== "false";
}

export async function isWhatsAppTransactionalEnabled() {
  if (!(await isWhatsAppApiReady())) return false;
  return (await getSetting("whatsapp_transactional_enabled")) !== "false";
}

/** E.164 digits only (no +), India default 91 prefix. */
export function normalizeWhatsAppPhone(countryCode, phone) {
  const cc = String(countryCode || "+91").replace(/\D/g, "") || "91";
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && cc === "91") digits = `91${digits}`;
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (!digits.startsWith(cc) && digits.length <= 10) digits = `${cc}${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export async function getInvestorWhatsAppPhone(investorOrId) {
  let investor = investorOrId;
  if (typeof investorOrId === "string") {
    investor = await investDb.investor.findUnique({
      where: { id: investorOrId },
      include: { kyc: { select: { whatsappNumber: true, whatsappCountryCode: true, phone: true, phoneCountryCode: true } } },
    });
  } else if (investor?.id && !investor.kyc) {
    investor = await investDb.investor.findUnique({
      where: { id: investor.id },
      include: { kyc: { select: { whatsappNumber: true, whatsappCountryCode: true, phone: true, phoneCountryCode: true } } },
    });
  }
  if (!investor) return null;
  const kyc = investor.kyc;
  const wa = normalizeWhatsAppPhone(
    kyc?.whatsappCountryCode || kyc?.phoneCountryCode || investor.phoneCountryCode || "+91",
    kyc?.whatsappNumber || kyc?.phone || investor.phone
  );
  return wa;
}

async function graphPost(path, body) {
  const cfg = await getWhatsAppSettings(true);
  const token = await resolveAccessToken(true);
  const version = cfg.whatsapp_api_version || "v21.0";
  const url = `${GRAPH}/${version}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error?.message || data?.error?.error_user_msg || res.statusText;
    return { ok: false, error: err, data };
  }
  return { ok: true, data };
}

export async function sendTemplateMessage(toDigits, templateName, languageCode, bodyParameters = []) {
  const cfg = await getWhatsAppSettings(true);
  const phoneNumberId = cfg.whatsapp_api_phone_number_id;
  if (!phoneNumberId || !templateName) return { ok: false, error: "WhatsApp API not configured" };

  const components = bodyParameters.length
    ? [{ type: "body", parameters: bodyParameters.map((text) => ({ type: "text", text: String(text) })) }]
    : [];

  return graphPost(`${phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toDigits,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || "en" },
      ...(components.length ? { components } : {}),
    },
  });
}

/** OTP via authentication template (body param = code). */
export async function sendWhatsAppOtp(investor, otp, context = "verification") {
  if (!(await isWhatsAppOtpEnabled())) return { ok: false, skipped: true, reason: "otp_disabled" };
  const to = await getInvestorWhatsAppPhone(investor);
  if (!to) return { ok: false, skipped: true, reason: "no_whatsapp_number" };

  const templateName = (await getSetting("whatsapp_otp_template_name")) || "authentication";
  const lang = (await getSetting("whatsapp_otp_template_language")) || "en";

  const result = await sendTemplateMessage(to, templateName, lang, [String(otp)]);
  if (!result.ok) {
    console.error("[whatsapp:otp]", context, result.error);
  } else if (process.env.NODE_ENV !== "production") {
    console.log(`[whatsapp:otp] ${context} → ${to}`);
  }
  return { ...result, to };
}

/** Transactional / receipt text via utility template (single body variable). */
export async function sendWhatsAppTransactional(investor, messageText) {
  if (!(await isWhatsAppTransactionalEnabled())) return { ok: false, skipped: true };
  const to = await getInvestorWhatsAppPhone(investor);
  if (!to) return { ok: false, skipped: true, reason: "no_whatsapp_number" };

  const templateName = (await getSetting("whatsapp_tx_template_name")) || "invest_update";
  const lang = (await getSetting("whatsapp_tx_template_language")) || "en";
  const text = String(messageText || "").slice(0, 900);

  const result = await sendTemplateMessage(to, templateName, lang, [text]);
  if (!result.ok) {
    console.error("[whatsapp:tx]", result.error);
  }
  return { ...result, to };
}

export async function testWhatsAppConnection(testPhone) {
  const cfg = await getWhatsAppSettings(true);
  const to = normalizeWhatsAppPhone("+91", testPhone);
  if (!to) return { ok: false, error: "Invalid test phone number" };
  if (!(await isWhatsAppApiReady())) return { ok: false, error: "WhatsApp API not enabled or missing credentials" };

  const templateName = cfg.whatsapp_tx_template_name || "invest_update";
  const lang = cfg.whatsapp_tx_template_language || "en";
  const result = await sendTemplateMessage(
    to,
    templateName,
    lang,
    ["AKSHAYA INVESTMENTS: WhatsApp Business API test message. Configuration is working."]
  );
  return { ...result, to, templateName };
}
