/** Invest setting keys for online/bank payment gateway credentials (super admin). */
export const GATEWAY_SETTING_KEYS = [
  "gateway_razorpay_key_id",
  "gateway_razorpay_key_secret",
  "gateway_cashfree_app_id",
  "gateway_cashfree_secret",
  "gateway_payu_key",
  "gateway_payu_salt",
  "gateway_easebuzz_key",
  "gateway_easebuzz_salt",
  "bank_hdfc_client_id",
  "bank_hdfc_client_secret",
  "bank_hdfc_corporate_id",
  "bank_axis_client_id",
  "bank_axis_client_secret",
  "bank_axis_channel_id",
  "bank_icici_api_key",
  "bank_icici_api_secret",
  "bank_icici_corporate_id",
  "bank_yesbank_client_id",
  "bank_yesbank_client_secret",
  "bank_yesbank_merchant_key",
  "gateway_litepay_vendor_id",
  "gateway_litepay_secret",
  "gateway_litepay_api_url",
  "gateway_stripe_publishable_key",
  "gateway_stripe_secret_key",
  "gateway_payglocal_merchant_id",
  "gateway_payglocal_api_key",
  "gateway_payglocal_api_url",
  "gateway_xflowpay_merchant_id",
  "gateway_xflowpay_api_key",
  "gateway_xflowpay_api_url",
  "gateway_pinlabs_client_id",
  "gateway_pinlabs_client_secret",
  "gateway_pinlabs_api_base",
];

export function pickGatewaySettings(all) {
  const out = {};
  for (const key of GATEWAY_SETTING_KEYS) {
    if (all[key] != null) out[key] = all[key];
  }
  return out;
}

export function filterGatewaySettingsPayload(body) {
  const pairs = body?.settings && typeof body.settings === "object" ? body.settings : body;
  if (!pairs || typeof pairs !== "object") return {};
  const filtered = {};
  for (const key of GATEWAY_SETTING_KEYS) {
    if (pairs[key] !== undefined) filtered[key] = pairs[key];
  }
  return filtered;
}
