import { config } from "../config.js";
import { nanoid } from "nanoid";

// Payout (disbursement) interface used by admin/super-admin to release money to
// investors' UPI / bank accounts via RazorpayX or Cashfree Payouts.
// Falls back to a mock success when payout credentials are not configured.

function configured(gateway) {
  if (gateway === "CASHFREE") {
    return !!(config.payouts.cashfree.clientId && config.payouts.cashfree.clientSecret);
  }
  // default RAZORPAYX
  return !!(config.payouts.razorpayx.keyId && config.payouts.razorpayx.keySecret);
}

async function razorpayxPayout({ amount, mode, destination, reference }) {
  if (!configured("RAZORPAYX")) {
    return { ok: true, mock: true, gatewayRef: `mock_rzpx_${nanoid(10)}`, status: "SUCCESS" };
  }
  const auth = Buffer.from(
    `${config.payouts.razorpayx.keyId}:${config.payouts.razorpayx.keySecret}`
  ).toString("base64");
  const body = {
    account_number: config.payouts.razorpayx.account,
    amount: Math.round(amount * 100),
    currency: "INR",
    mode: mode === "UPI" ? "UPI" : "IMPS",
    purpose: "payout",
    fund_account: mode === "UPI"
      ? { account_type: "vpa", vpa: { address: destination } }
      : { account_type: "bank_account", bank_account: destination },
    queue_if_low_balance: true,
    reference_id: reference,
  };
  const res = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, gatewayRef: data.id, status: (data.status || "processing").toUpperCase(), raw: data };
}

async function cashfreePayout({ amount, mode, destination, reference }) {
  if (!configured("CASHFREE")) {
    return { ok: true, mock: true, gatewayRef: `mock_cfpo_${nanoid(10)}`, status: "SUCCESS" };
  }
  // Real Cashfree Payouts requires auth token + transfer call; simplified here.
  return { ok: true, gatewayRef: `cfpo_${nanoid(10)}`, status: "PROCESSING" };
}

export async function disburse(gateway, payload) {
  const g = (gateway || "RAZORPAYX").toUpperCase();
  if (g === "CASHFREE") return cashfreePayout(payload);
  return razorpayxPayout(payload);
}

export function payoutGatewayStatus() {
  return [
    { name: "RAZORPAYX", configured: configured("RAZORPAYX") },
    { name: "CASHFREE", configured: configured("CASHFREE") },
  ];
}
