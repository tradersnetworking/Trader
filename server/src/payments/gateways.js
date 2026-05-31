import { config } from "../config.js";
import { nanoid } from "nanoid";

// Unified collection gateway interface.
// Each adapter exposes createOrder({ amount, currency, receipt, customer }).
// When credentials are not configured the adapter returns a MOCK order so the
// full flow remains testable; wiring real SDK calls only requires filling keys.

const SUPPORTED = ["razorpay", "cashfree", "payu", "juspay", "eximpe", "upi"];

function configured(name) {
  const g = config.gateways[name];
  if (!g) return name === "upi";
  return Object.values(g).some((v) => v && v.length > 0);
}

function mockOrder(gateway, amount, currency, receipt) {
  return {
    gateway,
    mock: true,
    orderId: `mock_${gateway}_${nanoid(10)}`,
    amount,
    currency,
    receipt,
    // Frontend uses this to know it should show a simulated checkout.
    checkout: { simulate: true },
  };
}

const adapters = {
  async razorpay({ amount, currency, receipt }) {
    if (!configured("razorpay")) return mockOrder("razorpay", amount, currency, receipt);
    // Real integration: POST https://api.razorpay.com/v1/orders
    const auth = Buffer.from(
      `${config.gateways.razorpay.keyId}:${config.gateways.razorpay.keySecret}`
    ).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt }),
    });
    const data = await res.json();
    return { gateway: "razorpay", orderId: data.id, keyId: config.gateways.razorpay.keyId, amount, currency, raw: data };
  },

  async cashfree({ amount, currency, receipt, customer }) {
    if (!configured("cashfree")) return mockOrder("cashfree", amount, currency, receipt);
    const res = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": config.gateways.cashfree.appId,
        "x-client-secret": config.gateways.cashfree.secret,
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
    return { gateway: "cashfree", orderId: data.order_id, paymentSessionId: data.payment_session_id, amount, currency, raw: data };
  },

  async payu({ amount, currency, receipt }) {
    // PayU uses a hashed form post; here we return params for the frontend form.
    if (!configured("payu")) return mockOrder("payu", amount, currency, receipt);
    return {
      gateway: "payu",
      orderId: receipt,
      key: config.gateways.payu.key,
      amount,
      currency,
      action: "https://secure.payu.in/_payment",
    };
  },

  async juspay({ amount, currency, receipt }) {
    if (!configured("juspay")) return mockOrder("juspay", amount, currency, receipt);
    return { gateway: "juspay", orderId: receipt, merchantId: config.gateways.juspay.merchantId, amount, currency };
  },

  async eximpe({ amount, currency, receipt }) {
    if (!configured("eximpe")) return mockOrder("eximpe", amount, currency, receipt);
    return { gateway: "eximpe", orderId: receipt, amount, currency };
  },

  async upi({ amount, currency, receipt }) {
    // Intent URL for any UPI app.
    const url = `upi://pay?pa=${encodeURIComponent(config.upi.vpa)}&pn=${encodeURIComponent(
      config.upi.payeeName
    )}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(receipt)}`;
    return { gateway: "upi", orderId: receipt, amount, currency, intentUrl: url, vpa: config.upi.vpa, payeeName: config.upi.payeeName };
  },
};

export function listGateways() {
  return SUPPORTED.map((name) => ({ name, configured: configured(name) }));
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
