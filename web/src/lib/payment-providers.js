/** Display labels for deposit/payout providers (INR invest portal). */
export const PROVIDER_LABELS = {
  razorpay: "Razorpay",
  cashfree: "Cashfree",
  payu: "PayU",
  easebuzz: "Easebuzz",
  juspay: "Juspay",
  eximpe: "EximPe",
  litepay: "LitePay",
  stripe: "Stripe",
  payglocal: "PayGlocal",
  xflowpay: "XflowPay",
  pinlabs: "Pine Labs",
  phonepe: "PhonePe",
  paypal: "PayPal",
  hdfc: "HDFC Bank API",
  axis: "Axis Bank API",
  icici: "ICICI Bank API",
  yesbank: "Yes Bank API",
  upi: "UPI",
};

export const BANK_API_PROVIDERS = new Set(["hdfc", "axis", "icici", "yesbank"]);

export function providerLabel(name) {
  const key = String(name || "").toLowerCase();
  return PROVIDER_LABELS[key] || String(name || "").toUpperCase();
}

export function gatewayOptionLabel(name, configured = true) {
  return `${providerLabel(name)}${configured ? "" : " (mock)"}`;
}
