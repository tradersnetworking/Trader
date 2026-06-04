import crypto from "crypto";
import { config } from "../config.js";
import { nanoid } from "nanoid";
import { getSetting } from "../services/investSettings.js";
import { BANK_PROVIDERS, createBankDepositOrder, isBankConfigured } from "./bankApis.js";
import { payReturnPair } from "../utils/paymentUrls.js";

function returnContext(payload = {}) {
  const ctx = { portal: payload.portal || "invest", kind: payload.kind || "deposit" };
  if (payload.depositId) ctx.depositId = payload.depositId;
  if (payload.orderId) ctx.orderId = payload.orderId;
  if (payload.tradePaymentId) ctx.tradePaymentId = payload.tradePaymentId;
  return ctx;
}

function sha512(str) {
  return crypto.createHash("sha512").update(str).digest("hex");
}

const SETTING_KEYS = {
  razorpay: { keyId: "gateway_razorpay_key_id", keySecret: "gateway_razorpay_key_secret" },
  cashfree: { appId: "gateway_cashfree_app_id", secret: "gateway_cashfree_secret" },
  payu: { key: "gateway_payu_key", salt: "gateway_payu_salt" },
  easebuzz: { key: "gateway_easebuzz_key", salt: "gateway_easebuzz_salt" },
  juspay: { merchantId: "gateway_juspay_merchant_id" },
  eximpe: { apiKey: "gateway_eximpe_api_key" },
  litepay: { vendorId: "gateway_litepay_vendor_id", secret: "gateway_litepay_secret" },
  stripe: { secretKey: "gateway_stripe_secret_key", publishableKey: "gateway_stripe_publishable_key" },
  payglocal: { merchantId: "gateway_payglocal_merchant_id", apiKey: "gateway_payglocal_api_key" },
  xflowpay: { merchantId: "gateway_xflowpay_merchant_id", apiKey: "gateway_xflowpay_api_key" },
  pinlabs: { clientId: "gateway_pinlabs_client_id", clientSecret: "gateway_pinlabs_client_secret" },
};

async function resolveCreds(name) {
  const env = config.gateways[name] || {};
  const keys = SETTING_KEYS[name];
  if (!keys) return env;
  const out = { ...env };
  for (const [field, settingKey] of Object.entries(keys)) {
    const dbVal = await getSetting(settingKey);
    if (dbVal) out[field === "keyId" ? "keyId" : field === "keySecret" ? "keySecret" : field] = dbVal;
  }
  if (name === "razorpay") {
    out.keyId = (await getSetting("gateway_razorpay_key_id")) || env.keyId;
    out.keySecret = (await getSetting("gateway_razorpay_key_secret")) || env.keySecret;
  }
  if (name === "cashfree") {
    out.appId = (await getSetting("gateway_cashfree_app_id")) || env.appId;
    out.secret = (await getSetting("gateway_cashfree_secret")) || env.secret;
  }
  if (name === "payu") {
    out.key = (await getSetting("gateway_payu_key")) || env.key;
    out.salt = (await getSetting("gateway_payu_salt")) || env.salt;
  }
  if (name === "easebuzz") {
    out.key = (await getSetting("gateway_easebuzz_key")) || env.key;
    out.salt = (await getSetting("gateway_easebuzz_salt")) || env.salt;
  }
  if (name === "juspay") {
    out.merchantId = (await getSetting("gateway_juspay_merchant_id")) || env.merchantId;
  }
  return out;
}

async function isConfigured(name) {
  if (BANK_PROVIDERS.includes(name)) return isBankConfigured(name);
  if (name === "upi") return Boolean(config.upi.vpa);
  if (name === "phonepe") {
    const creds = await resolveCreds("phonepe");
    return Boolean(process.env.PHONEPE_MERCHANT_ID || creds.merchantId);
  }
  if (name === "paypal") {
    return Boolean(process.env.PAYPAL_CLIENT_ID || (await getSetting("gateway_paypal_client_id")));
  }
  if (name === "litepay") {
    const vendor = (await getSetting("gateway_litepay_vendor_id")) || process.env.LITEPAY_VENDOR_ID;
    const secret = (await getSetting("gateway_litepay_secret")) || process.env.LITEPAY_SECRET;
    return Boolean(vendor && secret);
  }
  if (name === "stripe") {
    return Boolean(
      (await getSetting("gateway_stripe_secret_key")) || process.env.STRIPE_SECRET_KEY
    );
  }
  if (name === "payglocal") {
    return Boolean(
      ((await getSetting("gateway_payglocal_merchant_id")) || process.env.PAYGLOCAL_MERCHANT_ID) &&
        ((await getSetting("gateway_payglocal_api_key")) || process.env.PAYGLOCAL_API_KEY)
    );
  }
  if (name === "xflowpay") {
    return Boolean(
      ((await getSetting("gateway_xflowpay_merchant_id")) || process.env.XFLOWPAY_MERCHANT_ID) &&
        ((await getSetting("gateway_xflowpay_api_key")) || process.env.XFLOWPAY_API_KEY)
    );
  }
  if (name === "pinlabs") {
    const clientId =
      (await getSetting("gateway_pinlabs_client_id")) || process.env.PINLABS_CLIENT_ID;
    const clientSecret =
      (await getSetting("gateway_pinlabs_client_secret")) || process.env.PINLABS_CLIENT_SECRET;
    return Boolean(clientId && clientSecret);
  }
  const creds = await resolveCreds(name);
  return Object.values(creds).some((v) => v && String(v).length > 0);
}

/** PayGlocal / XflowPay — POST to merchant-configured API; expects { url } or { redirectUrl }. */
async function createPartnerPaymentLink(
  gateway,
  { amount, currency, receipt, depositId, customer, defaultApiUrl, ...rest }
) {
  const merchantId =
    (await getSetting(`gateway_${gateway}_merchant_id`)) ||
    process.env[`${gateway.toUpperCase()}_MERCHANT_ID`] ||
    "";
  const apiKey =
    (await getSetting(`gateway_${gateway}_api_key`)) ||
    process.env[`${gateway.toUpperCase()}_API_KEY`] ||
    "";
  if (!merchantId || !apiKey) return mockOrder(gateway, amount, currency, receipt);

  const { payReturnUrl } = await import("../utils/paymentUrls.js");
  const ctx = returnContext({ depositId, ...rest });
  const returnUrl = payReturnUrl({ ...ctx, status: "success", gateway });
  const webhookUrl = payReturnUrl({ ...ctx, status: gateway, gateway });
  const orderId = String(receipt || depositId || nanoid(10));
  const apiUrl =
    (await getSetting(`gateway_${gateway}_api_url`)) ||
    process.env[`${gateway.toUpperCase()}_API_URL`] ||
    defaultApiUrl;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Merchant-Id": merchantId,
      },
      body: JSON.stringify({
        merchantId,
        orderId,
        amount: Number(amount),
        currency: currency || "INR",
        returnUrl,
        callbackUrl: webhookUrl,
        customerEmail: customer?.email,
        customerName: customer?.name,
        customerPhone: customer?.phone,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const redirectUrl = data?.url || data?.redirectUrl || data?.paymentUrl || data?.data?.url;
    if (redirectUrl) {
      return { gateway, orderId, amount, currency, redirectUrl, raw: data };
    }
    console.error(`[${gateway}]`, data?.message || data?.error || res.status);
  } catch (e) {
    console.error(`[${gateway}]`, e.message);
  }
  return mockOrder(gateway, amount, currency, receipt);
}

function pinelabHeaders() {
  return {
    accept: "application/json",
    "Content-Type": "application/json",
    "Request-ID": nanoid(),
    "Request-Timestamp": new Date().toISOString(),
  };
}

/** Pine Labs Online (Plural) — token → order → payment → challenge_url redirect. */
async function createPinlabsCheckout({
  amount,
  currency,
  receipt,
  depositId,
  customer,
  ...rest
}) {
  const clientId =
    (await getSetting("gateway_pinlabs_client_id")) || process.env.PINLABS_CLIENT_ID || "";
  const clientSecret =
    (await getSetting("gateway_pinlabs_client_secret")) || process.env.PINLABS_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) return mockOrder("pinlabs", amount, currency, receipt);

  const base =
    (
      (await getSetting("gateway_pinlabs_api_base")) ||
      process.env.PINLABS_API_BASE ||
      "https://api.pluralpay.in"
    ).replace(/\/$/, "");
  const { payReturnUrl } = await import("../utils/paymentUrls.js");
  const ctx = returnContext({ depositId, ...rest });
  const callbackUrl = payReturnUrl({ ...ctx, status: "success", gateway: "pinlabs" });
  const failureUrl = payReturnUrl({ ...ctx, status: "failed", gateway: "pinlabs" });
  const merchantRef = String(receipt || depositId || nanoid(10)).replace(/\D/g, "").slice(-12) || String(Date.now());
  const amountPaise = Math.round(Number(amount) * 100);
  const cur = currency || "INR";

  try {
    const tokenRes = await fetch(`${base}/api/auth/v1/token`, {
      method: "POST",
      headers: pinelabHeaders(),
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      console.error("[pinlabs] token", tokenData?.message || tokenData?.error || tokenRes.status);
      return mockOrder("pinlabs", amount, currency, receipt);
    }

    const authHeaders = { ...pinelabHeaders(), Authorization: `Bearer ${accessToken}` };
    const nameParts = String(customer?.name || "Investor").trim().split(/\s+/);
    const orderRes = await fetch(`${base}/api/pay/v1/orders`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        merchant_order_reference: Number(merchantRef) || Date.now(),
        order_amount: { value: amountPaise, currency: cur },
        pre_auth: false,
        callback_url: callbackUrl,
        failure_callback_url: failureUrl,
        allowed_payment_methods: ["CARD", "UPI", "NETBANKING", "WALLET"],
        notes: String(receipt || depositId || "").slice(0, 200),
        purchase_details: {
          customer: {
            email_id: customer?.email || "investor@akshayaexim.in",
            first_name: nameParts[0] || "Investor",
            last_name: nameParts.slice(1).join(" ") || "User",
            customer_id: String(customer?.id || customer?.email || merchantRef).slice(0, 32),
            mobile_number: String(customer?.phone || "9999999999").replace(/\D/g, "").slice(-10),
            country_code: "91",
          },
        },
      }),
    });
    const orderData = await orderRes.json().catch(() => ({}));
    const orderId = orderData?.data?.order_id || orderData?.order_id;
    if (!orderId) {
      console.error("[pinlabs] order", orderData?.message || orderData?.error || orderRes.status);
      return mockOrder("pinlabs", amount, currency, receipt);
    }

    const payRes = await fetch(`${base}/api/pay/v1/orders/${encodeURIComponent(orderId)}/payments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        payments: [
          {
            payment_method: "UPI",
            payment_amount: { value: amountPaise, currency: cur },
          },
        ],
      }),
    });
    const payData = await payRes.json().catch(() => ({}));
    const challengeUrl =
      payData?.data?.challenge_url || payData?.challenge_url || payData?.data?.redirect_url;
    if (challengeUrl) {
      return {
        gateway: "pinlabs",
        orderId,
        amount,
        currency: cur,
        redirectUrl: challengeUrl,
        raw: payData,
      };
    }
    console.error("[pinlabs] payment", payData?.message || payData?.error || payRes.status);
  } catch (e) {
    console.error("[pinlabs]", e.message);
  }
  return mockOrder("pinlabs", amount, currency, receipt);
}

function mockOrder(gateway, amount, currency, receipt) {
  return {
    gateway,
    mock: true,
    orderId: `mock_${gateway}_${nanoid(10)}`,
    amount,
    currency,
    receipt,
    checkout: { simulate: true },
  };
}

const SUPPORTED = [
  "razorpay", "cashfree", "payu", "easebuzz", "juspay", "eximpe", "litepay",
  "stripe", "payglocal", "xflowpay", "pinlabs", "upi", "phonepe", "paypal", ...BANK_PROVIDERS,
];

const adapters = {
  async razorpay({ amount, currency, receipt }) {
    const creds = await resolveCreds("razorpay");
    if (!creds.keyId || !creds.keySecret) return mockOrder("razorpay", amount, currency, receipt);
    const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt }),
    });
    const data = await res.json();
    return { gateway: "razorpay", orderId: data.id, keyId: creds.keyId, amount, currency, raw: data };
  },

  async cashfree({ amount, currency, receipt, customer }) {
    const creds = await resolveCreds("cashfree");
    if (!creds.appId || !creds.secret) return mockOrder("cashfree", amount, currency, receipt);
    const res = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": creds.appId,
        "x-client-secret": creds.secret,
      },
      body: JSON.stringify({
        order_amount: amount,
        order_currency: currency,
        order_id: receipt,
        customer_details: {
          customer_id: customer?.id || nanoid(8),
          customer_email: customer?.email,
          customer_phone: customer?.phone || "9999999999",
        },
      }),
    });
    const data = await res.json();
    const mode = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
    return {
      gateway: "cashfree",
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      cashfreeMode: mode,
      amount,
      currency,
      raw: data,
    };
  },

  async payu({ amount, currency, receipt, customer, ...rest }) {
    const creds = await resolveCreds("payu");
    if (!creds.key || !creds.salt) return mockOrder("payu", amount, currency, receipt);
    const urls = payReturnPair(returnContext(rest));
    const txnid = receipt;
    const productinfo = rest.productinfo || "Akshaya Exim payment";
    const firstname = (customer?.name || "Investor").split(" ")[0] || "Investor";
    const email = customer?.email || "investor@akshayaexim.com";
    const phone = customer?.phone || "9999999999";
    const hashStr = `${creds.key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${creds.salt}`;
    return {
      gateway: "payu",
      orderId: txnid,
      amount,
      currency,
      action: "https://secure.payu.in/_payment",
      formFields: {
        key: creds.key,
        txnid,
        amount: String(amount),
        productinfo,
        firstname,
        email,
        phone,
        surl: urls.success,
        furl: urls.failure,
        hash: sha512(hashStr),
      },
    };
  },

  async easebuzz({ amount, currency, receipt, customer, ...rest }) {
    const creds = await resolveCreds("easebuzz");
    if (!creds.key || !creds.salt) return mockOrder("easebuzz", amount, currency, receipt);
    const urls = payReturnPair(returnContext(rest));
    const txnid = receipt;
    const productinfo = rest.productinfo || "Akshaya Exim payment";
    const firstname = (customer?.name || "Investor").split(" ")[0] || "Investor";
    const email = customer?.email || "investor@akshayaexim.com";
    const phone = customer?.phone || "9999999999";
    const udf = ["", "", "", "", "", "", "", "", "", ""];
    const hashStr = [creds.key, txnid, amount, productinfo, firstname, email, ...udf, creds.salt].join("|");
    return {
      gateway: "easebuzz",
      orderId: txnid,
      amount,
      currency,
      action: "https://pay.easebuzz.in/pay/secure",
      formFields: {
        key: creds.key,
        txnid,
        amount: String(amount),
        productinfo,
        firstname,
        email,
        phone,
        surl: urls.success,
        furl: urls.failure,
        hash: sha512(hashStr),
      },
    };
  },

  async juspay({ amount, currency, receipt }) {
    const creds = await resolveCreds("juspay");
    if (!creds.merchantId) return mockOrder("juspay", amount, currency, receipt);
    return { gateway: "juspay", orderId: receipt, merchantId: creds.merchantId, amount, currency };
  },

  async eximpe({ amount, currency, receipt }) {
    const creds = await resolveCreds("eximpe");
    if (!creds.apiKey) return mockOrder("eximpe", amount, currency, receipt);
    return { gateway: "eximpe", orderId: receipt, amount, currency };
  },

  async litepay({ amount, currency, receipt, depositId, customer, ...rest }) {
    const vendor =
      (await getSetting("gateway_litepay_vendor_id")) || process.env.LITEPAY_VENDOR_ID || "";
    const secret = (await getSetting("gateway_litepay_secret")) || process.env.LITEPAY_SECRET || "";
    if (!vendor || !secret) return mockOrder("litepay", amount, currency, receipt);

    const { payReturnUrl } = await import("../utils/paymentUrls.js");
    const invoice = `DEP-${String(depositId || receipt || nanoid(8)).slice(-16)}`;
    const ctx = returnContext({ depositId, ...rest });
    const callbackUrl = payReturnUrl({ ...ctx, status: "litepay", gateway: "litepay" });
    const returnUrl = payReturnUrl({ ...ctx, status: "success" });
    const apiUrl =
      (await getSetting("gateway_litepay_api_url")) || process.env.LITEPAY_API_URL || "https://litepay.ch/p/";

    const body = new URLSearchParams({
      vendor,
      invoice,
      secret,
      price: String(amount),
      currency: currency || "INR",
      email: customer?.email || "",
      callbackUrl,
      returnUrl,
    });

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        return { gateway: "litepay", orderId: invoice, amount, currency, redirectUrl: data.url, raw: data };
      }
      if (data?.status === "success" && data?.url) {
        return { gateway: "litepay", orderId: invoice, amount, currency, redirectUrl: data.url, raw: data };
      }
    } catch (e) {
      console.error("[litepay]", e.message);
    }
    return mockOrder("litepay", amount, currency, receipt);
  },

  async stripe({ amount, currency, receipt, depositId, customer, ...rest }) {
    const secret =
      (await getSetting("gateway_stripe_secret_key")) || process.env.STRIPE_SECRET_KEY || "";
    if (!secret) return mockOrder("stripe", amount, currency, receipt);

    const { payReturnUrl } = await import("../utils/paymentUrls.js");
    const ctx = returnContext({ depositId, ...rest });
    const successUrl = payReturnUrl({ ...ctx, status: "success", gateway: "stripe" });
    const cancelUrl = payReturnUrl({ ...ctx, status: "cancelled", gateway: "stripe" });
    const cur = String(currency || "INR").toLowerCase();

    const params = new URLSearchParams({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(receipt || depositId || nanoid(8)),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": cur,
      "line_items[0][price_data][unit_amount]": String(Math.round(Number(amount) * 100)),
      "line_items[0][price_data][product_data][name]": "Akshaya Exim wallet deposit",
    });
    if (customer?.email) params.set("customer_email", customer.email);

    try {
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        return { gateway: "stripe", orderId: data.id, amount, currency, redirectUrl: data.url, raw: data };
      }
      console.error("[stripe]", data?.error?.message || res.status);
    } catch (e) {
      console.error("[stripe]", e.message);
    }
    return mockOrder("stripe", amount, currency, receipt);
  },

  async payglocal({ amount, currency, receipt, depositId, customer, ...rest }) {
    return createPartnerPaymentLink("payglocal", {
      amount,
      currency,
      receipt,
      depositId,
      customer,
      ...rest,
      defaultApiUrl: "https://api.payglocal.in/pg/v1/payments",
    });
  },

  async xflowpay({ amount, currency, receipt, depositId, customer, ...rest }) {
    return createPartnerPaymentLink("xflowpay", {
      amount,
      currency,
      receipt,
      depositId,
      customer,
      ...rest,
      defaultApiUrl: "https://api.xflowpay.com/v1/checkout/sessions",
    });
  },

  async pinlabs(payload) {
    return createPinlabsCheckout(payload);
  },

  async hdfc(payload) {
    return createBankDepositOrder("hdfc", payload);
  },
  async axis(payload) {
    return createBankDepositOrder("axis", payload);
  },
  async icici(payload) {
    return createBankDepositOrder("icici", payload);
  },
  async yesbank(payload) {
    return createBankDepositOrder("yesbank", payload);
  },

  async upi({ amount, currency, receipt }) {
    const url = `upi://pay?pa=${encodeURIComponent(config.upi.vpa)}&pn=${encodeURIComponent(
      config.upi.payeeName
    )}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(receipt)}`;
    return { gateway: "upi", orderId: receipt, amount, currency, intentUrl: url, vpa: config.upi.vpa, payeeName: config.upi.payeeName };
  },

  async phonepe({ amount, currency, receipt, depositId, customer, ...rest }) {
    const { createPhonePeOrder } = await import("../services/paymentWebhooks.js");
    const { payReturnUrl } = await import("../utils/paymentUrls.js");
    const txnId = `PP${(depositId || receipt || "").slice(-12)}${Date.now().toString(36)}`;
    return createPhonePeOrder({
      amount,
      merchantTransactionId: txnId,
      redirectUrl: payReturnUrl({ ...returnContext({ depositId, ...rest }), status: "phonepe" }),
    });
  },

  async paypal({ amount, currency, receipt, depositId, customer }) {
    const { createPayPalOrder } = await import("../services/paymentWebhooks.js");
    return createPayPalOrder({
      amount: Number(amount),
      currency: "INR",
      depositId: depositId || receipt,
    });
  },
};

export async function listGateways() {
  const rows = await Promise.all(
    SUPPORTED.map(async (name) => ({ name, configured: await isConfigured(name) }))
  );
  return rows;
}

export async function createOrder(gateway, payload) {
  const g = (gateway || "razorpay").toLowerCase();
  if (!adapters[g]) {
    const err = new Error(`Unsupported gateway: ${gateway}`);
    err.status = 400;
    throw err;
  }
  return adapters[g](payload);
}
