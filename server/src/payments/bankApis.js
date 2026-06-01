import crypto from "crypto";
import { nanoid } from "nanoid";
import { config } from "../config.js";
import { getSetting } from "../services/investSettings.js";
import { payReturnPair } from "../utils/paymentUrls.js";

/** HDFC, Axis, ICICI & Yes Bank — deposit collection + payout disbursement via corporate banking APIs. */
export const BANK_PROVIDERS = ["hdfc", "axis", "icici", "yesbank"];

const BANK_META = {
  hdfc: {
    label: "HDFC Bank",
    keys: {
      clientId: "bank_hdfc_client_id",
      clientSecret: "bank_hdfc_client_secret",
      corporateId: "bank_hdfc_corporate_id",
    },
    env: () => config.bankApis?.hdfc || {},
  },
  axis: {
    label: "Axis Bank",
    keys: {
      clientId: "bank_axis_client_id",
      clientSecret: "bank_axis_client_secret",
      channelId: "bank_axis_channel_id",
    },
    env: () => config.bankApis?.axis || {},
  },
  icici: {
    label: "ICICI Bank",
    keys: {
      apiKey: "bank_icici_api_key",
      apiSecret: "bank_icici_api_secret",
      corporateId: "bank_icici_corporate_id",
    },
    env: () => config.bankApis?.icici || {},
  },
  yesbank: {
    label: "Yes Bank",
    keys: {
      clientId: "bank_yesbank_client_id",
      clientSecret: "bank_yesbank_client_secret",
      merchantKey: "bank_yesbank_merchant_key",
    },
    env: () => config.bankApis?.yesbank || {},
  },
};

async function resolveBankCreds(name) {
  const meta = BANK_META[name];
  if (!meta) return {};
  const env = meta.env();
  const out = { ...env };
  for (const [field, settingKey] of Object.entries(meta.keys)) {
    const dbVal = await getSetting(settingKey);
    if (dbVal) out[field] = dbVal;
  }
  return out;
}

export async function isBankConfigured(name) {
  const creds = await resolveBankCreds(name);
  return Object.values(creds).some((v) => v && String(v).length > 0);
}

function mockDeposit(name, amount, currency, receipt) {
  return {
    gateway: name,
    mock: true,
    orderId: receipt,
    amount,
    currency,
    checkout: { simulate: true },
  };
}

function mockPayout(name, reference) {
  return { ok: true, mock: true, gatewayRef: `mock_${name}_${nanoid(10)}`, status: "SUCCESS", reference };
}

async function bankApiFetch(url, creds, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.accessToken || creds.apiKey || creds.clientId || ""}`,
      "X-Client-Id": creds.clientId || creds.apiKey || "",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/** Deposit collection — virtual account, payment link, or hosted redirect. */
export async function createBankDepositOrder(provider, payload) {
  const { amount, currency, receipt, customer, depositId, portal, kind, orderId, tradePaymentId } = payload;
  const name = (provider || "hdfc").toLowerCase();
  const creds = await resolveBankCreds(name);
  const hasCreds = Object.values(creds).some((v) => v && String(v).length > 0);
  if (!hasCreds) return mockDeposit(name, amount, currency, receipt);

  const txnId = receipt || `BNK-${nanoid(12)}`;
  const returnUrl = payReturnPair({
    portal: portal || "invest",
    kind: kind || "deposit",
    depositId,
    orderId,
    tradePaymentId,
    status: "success",
  }).success;

  if (name === "hdfc") {
    const vaNumber = `${creds.corporateId || "HDFC"}${String(amount).replace(".", "")}${txnId.slice(-6)}`.slice(0, 16);
    return {
      gateway: "hdfc",
      orderId: txnId,
      amount,
      currency,
      virtualAccount: {
        bank: "HDFC Bank",
        accountNumber: vaNumber,
        ifsc: "HDFC0000001",
        beneficiary: config.bank.accountName,
        reference: txnId,
      },
      redirectUrl: returnUrl,
    };
  }

  if (name === "axis") {
    const res = await bankApiFetch(
      process.env.AXIS_DEPOSIT_URL || "https://saksham.axisbank.co.in/gateway/api/deposit/initiate",
      creds,
      { amount, currency, txnId, customerEmail: customer?.email, returnUrl, channelId: creds.channelId }
    );
    if (res.ok && res.data?.redirectUrl) {
      return { gateway: "axis", orderId: txnId, amount, currency, redirectUrl: res.data.redirectUrl };
    }
    return {
      gateway: "axis",
      orderId: txnId,
      amount,
      currency,
      redirectUrl: returnUrl,
      formFields: res.data?.formFields,
      action: res.data?.action,
    };
  }

  if (name === "icici") {
    const hash = crypto.createHash("sha256").update(`${creds.apiKey}|${txnId}|${amount}|${creds.apiSecret}`).digest("hex");
    return {
      gateway: "icici",
      orderId: txnId,
      amount,
      currency,
      action: process.env.ICICI_DEPOSIT_URL || "https://api.icicibank.com/corp-payment/v1/initiate",
      formFields: {
        apiKey: creds.apiKey,
        txnId,
        amount: String(amount),
        corporateId: creds.corporateId || "",
        email: customer?.email || "",
        returnUrl,
        hash,
      },
    };
  }

  if (name === "yesbank") {
    const res = await bankApiFetch(
      process.env.YESBANK_DEPOSIT_URL || "https://api.yesbank.in/api/payment/v1/initiate",
      creds,
      { merchantKey: creds.merchantKey, txnId, amount, currency, returnUrl }
    );
    if (res.ok && res.data?.paymentUrl) {
      return { gateway: "yesbank", orderId: txnId, amount, currency, redirectUrl: res.data.paymentUrl };
    }
    return {
      gateway: "yesbank",
      orderId: txnId,
      amount,
      currency,
      redirectUrl: returnUrl,
    };
  }

  return mockDeposit(name, amount, currency, receipt);
}

/** Payout disbursement — IMPS / NEFT / UPI to investor destination. */
export async function bankPayout(provider, { amount, mode, destination, reference }) {
  const name = (provider || "hdfc").toLowerCase();
  const creds = await resolveBankCreds(name);
  const hasCreds = Object.values(creds).some((v) => v && String(v).length > 0);
  if (!hasCreds) return mockPayout(name, reference);

  const transferMode = mode === "UPI" ? "UPI" : "IMPS";
  const beneficiary =
    mode === "UPI"
      ? { vpa: typeof destination === "string" ? destination : destination?.vpa || destination?.account_number }
      : {
          accountNumber: typeof destination === "object" ? destination.account_number : destination,
          ifsc: typeof destination === "object" ? destination.ifsc : "",
          name: typeof destination === "object" ? destination.name : "Investor",
        };

  const payload = {
    referenceId: reference,
    amount: Number(amount),
    currency: "INR",
    mode: transferMode,
    beneficiary,
    corporateId: creds.corporateId || creds.channelId || creds.merchantKey,
  };

  const urls = {
    hdfc: process.env.HDFC_PAYOUT_URL || "https://api.hdfcbank.com/payout/v1/transfer",
    axis: process.env.AXIS_PAYOUT_URL || "https://saksham.axisbank.co.in/gateway/api/payout/transfer",
    icici: process.env.ICICI_PAYOUT_URL || "https://api.icicibank.com/corp-payout/v1/transfer",
    yesbank: process.env.YESBANK_PAYOUT_URL || "https://api.yesbank.in/api/payout/v1/transfer",
  };

  const res = await bankApiFetch(urls[name], creds, payload);
  if (res.ok) {
    const ref = res.data?.transactionId || res.data?.utr || res.data?.reference || `${name}_${nanoid(10)}`;
    return { ok: true, gatewayRef: ref, status: (res.data?.status || "PROCESSING").toUpperCase(), raw: res.data };
  }

  return { ok: false, gatewayRef: null, status: "FAILED", raw: res.data };
}

export async function listBankGateways() {
  return Promise.all(
    BANK_PROVIDERS.map(async (name) => ({
      name,
      label: BANK_META[name].label,
      configured: await isBankConfigured(name),
    }))
  );
}

export function bankGatewayLabels() {
  return Object.fromEntries(BANK_PROVIDERS.map((n) => [n, BANK_META[n].label]));
}
