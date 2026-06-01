import { config } from "../config.js";
import { nanoid } from "nanoid";
import { BANK_PROVIDERS, bankPayout, isBankConfigured, bankGatewayLabels } from "./bankApis.js";

async function configured(gateway) {
  const g = (gateway || "RAZORPAYX").toUpperCase();
  const bankName = g.toLowerCase();
  if (BANK_PROVIDERS.includes(bankName)) return isBankConfigured(bankName);
  if (g === "CASHFREE") {
    return !!(config.payouts.cashfree.clientId && config.payouts.cashfree.clientSecret);
  }
  if (g === "PAYU") {
    return !!(process.env.PAYU_PAYOUT_KEY || config.gateways.payu?.key);
  }
  if (g === "EASEBUZZ") {
    return !!(process.env.EASEBUZZ_KEY || process.env.EASEBUZZ_MERCHANT_KEY);
  }
  return !!(config.payouts.razorpayx.keyId && config.payouts.razorpayx.keySecret);
}

async function razorpayxPayout({ amount, mode, destination, reference }) {
  if (!(await configured("RAZORPAYX"))) {
    return { ok: true, mock: true, gatewayRef: `mock_rzpx_${nanoid(10)}`, status: "SUCCESS" };
  }
  const auth = Buffer.from(
    `${config.payouts.razorpayx.keyId}:${config.payouts.razorpayx.keySecret}`
  ).toString("base64");
  const bankDest = typeof destination === "object" ? destination : { account_number: destination, ifsc: "" };
  const body = {
    account_number: config.payouts.razorpayx.account,
    amount: Math.round(amount * 100),
    currency: "INR",
    mode: mode === "UPI" ? "UPI" : "IMPS",
    purpose: "payout",
    fund_account: mode === "UPI"
      ? { account_type: "vpa", vpa: { address: typeof destination === "string" ? destination : bankDest.account_number } }
      : {
          account_type: "bank_account",
          bank_account: typeof destination === "object"
            ? destination
            : { account_number: destination, ifsc: bankDest.ifsc || "" },
        },
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
  if (!(await configured("CASHFREE"))) {
    return { ok: true, mock: true, gatewayRef: `mock_cfpo_${nanoid(10)}`, status: "SUCCESS" };
  }
  return { ok: true, gatewayRef: `cfpo_${nanoid(10)}`, status: "PROCESSING" };
}

async function payuPayout({ amount, mode, destination, reference }) {
  if (!(await configured("PAYU"))) {
    return { ok: true, mock: true, gatewayRef: `mock_payu_${nanoid(10)}`, status: "SUCCESS" };
  }
  return { ok: true, gatewayRef: `payu_${nanoid(10)}`, status: "PROCESSING" };
}

async function easebuzzPayout({ amount, mode, destination, reference }) {
  if (!(await configured("EASEBUZZ"))) {
    return { ok: true, mock: true, gatewayRef: `mock_eb_${nanoid(10)}`, status: "SUCCESS" };
  }
  return { ok: true, gatewayRef: `eb_${nanoid(10)}`, status: "PROCESSING" };
}

export async function disburse(gateway, payload) {
  const g = (gateway || "RAZORPAYX").toUpperCase();
  const bankName = g.toLowerCase();
  if (BANK_PROVIDERS.includes(bankName)) return bankPayout(bankName, payload);
  if (g === "CASHFREE") return cashfreePayout(payload);
  if (g === "PAYU") return payuPayout(payload);
  if (g === "EASEBUZZ") return easebuzzPayout(payload);
  return razorpayxPayout(payload);
}

export async function payoutGatewayStatus() {
  const labels = bankGatewayLabels();
  const paymentGateways = [
    { name: "RAZORPAYX", label: "RazorpayX", configured: await configured("RAZORPAYX"), category: "payment" },
    { name: "CASHFREE", label: "Cashfree Payouts", configured: await configured("CASHFREE"), category: "payment" },
    { name: "PAYU", label: "PayU Payouts", configured: await configured("PAYU"), category: "payment" },
    { name: "EASEBUZZ", label: "Easebuzz Payouts", configured: await configured("EASEBUZZ"), category: "payment" },
  ];
  const bankGateways = await Promise.all(
    BANK_PROVIDERS.map(async (name) => ({
      name: name.toUpperCase(),
      label: `${labels[name]} API`,
      configured: await isBankConfigured(name),
      category: "bank",
    }))
  );
  return [...paymentGateways, ...bankGateways];
}
