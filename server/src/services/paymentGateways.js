import { investDb } from "../db.js";
import { config } from "../config.js";
import { MIN_WALLET_DEPOSIT } from "../utils/invest.js";
import { getSetting } from "./investSettings.js";

const ONLINE_PROVIDERS = ["razorpay", "cashfree", "payu", "easebuzz", "juspay", "eximpe", "phonepe", "paypal", "hdfc", "axis", "icici", "yesbank"];

export function parseExtraConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function serializeGateway(row) {
  if (!row) return null;
  return {
    ...row,
    extraConfig: parseExtraConfig(row.extraConfig),
  };
}

export async function listPaymentGateways({ enabledOnly = false, type } = {}) {
  const where = {};
  if (enabledOnly) where.isEnabled = true;
  if (type) where.type = type;
  const rows = await investDb.paymentGateway.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeGateway);
}

export async function getDepositAccountsForInvestor() {
  const rows = await listPaymentGateways({ enabledOnly: true });
  const grouped = { upi: [], bank: [], online: [] };
  for (const g of rows) {
    if (g.type === "upi") grouped.upi.push(g);
    else if (g.type === "bank") grouped.bank.push(g);
    else if (g.type === "online") grouped.online.push(g);
  }
  return grouped;
}

export async function getPrimaryBankDetails() {
  const [upiGw, bankGw, bankName, accountName, accountNumber, ifsc, branch, upiId] = await Promise.all([
    investDb.paymentGateway.findFirst({ where: { type: "upi", isEnabled: true }, orderBy: { sortOrder: "asc" } }),
    investDb.paymentGateway.findFirst({ where: { type: "bank", isEnabled: true }, orderBy: { sortOrder: "asc" } }),
    getSetting("company_bank_name"),
    getSetting("company_account_name"),
    getSetting("company_account_number"),
    getSetting("company_ifsc"),
    getSetting("company_branch"),
    getSetting("company_upi_id"),
  ]);

  const bank = bankGw
    ? {
        name: bankGw.bankName || bankName || config.bank.name,
        accountName: bankGw.accountHolder || accountName || config.bank.accountName,
        accountNumber: bankGw.accountNumber || accountNumber || config.bank.accountNumber,
        ifsc: bankGw.ifsc || ifsc || config.bank.ifsc,
        branch: bankGw.branchName || branch || config.bank.branch,
      }
    : {
        name: bankName || config.bank.name,
        accountName: accountName || config.bank.accountName,
        accountNumber: accountNumber || config.bank.accountNumber,
        ifsc: ifsc || config.bank.ifsc,
        branch: branch || config.bank.branch,
      };

  const upi = upiGw
    ? { vpa: upiGw.upiId || upiId || config.upi.vpa, payeeName: upiGw.accountHolder || config.upi.payeeName, qrCodeUrl: upiGw.qrCodeUrl }
    : { vpa: upiId || config.upi.vpa, payeeName: config.upi.payeeName };

  return { bank, upi };
}

export async function createPaymentGateway(data) {
  const row = await investDb.paymentGateway.create({
    data: {
      name: data.name,
      type: data.type,
      upiId: data.upiId || null,
      accountHolder: data.accountHolder || null,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      ifsc: data.ifsc || null,
      branchName: data.branchName || null,
      qrCodeUrl: data.qrCodeUrl || null,
      provider: data.provider || null,
      minAmount: Number(data.minAmount ?? MIN_WALLET_DEPOSIT),
      maxAmount: data.maxAmount != null ? Number(data.maxAmount) : null,
      isEnabled: data.isEnabled !== false,
      sortOrder: Number(data.sortOrder ?? 0),
      extraConfig: data.extraConfig ? JSON.stringify(data.extraConfig) : null,
    },
  });
  return serializeGateway(row);
}

export async function updatePaymentGateway(id, data) {
  const patch = {};
  for (const k of [
    "name", "type", "upiId", "accountHolder", "bankName", "accountNumber", "ifsc",
    "branchName", "qrCodeUrl", "provider", "isEnabled",
  ]) {
    if (data[k] !== undefined) patch[k] = data[k] || null;
  }
  if (data.minAmount !== undefined) patch.minAmount = Number(data.minAmount);
  if (data.maxAmount !== undefined) patch.maxAmount = data.maxAmount != null ? Number(data.maxAmount) : null;
  if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder);
  if (data.extraConfig !== undefined) patch.extraConfig = data.extraConfig ? JSON.stringify(data.extraConfig) : null;
  const row = await investDb.paymentGateway.update({ where: { id }, data: patch });
  return serializeGateway(row);
}

export async function deletePaymentGateway(id) {
  await investDb.paymentGateway.delete({ where: { id } });
  return { ok: true };
}

export async function seedDefaultPaymentGateways() {
  const count = await investDb.paymentGateway.count();
  if (count > 0) return;

  await investDb.paymentGateway.createMany({
    data: [
      {
        name: "Primary UPI",
        type: "upi",
        upiId: config.upi.vpa,
        accountHolder: config.upi.payeeName,
        minAmount: 100000,
        sortOrder: 0,
        isEnabled: true,
      },
      {
        name: "Company Bank Account",
        type: "bank",
        accountHolder: config.bank.accountName,
        bankName: config.bank.name,
        accountNumber: config.bank.accountNumber,
        ifsc: config.bank.ifsc,
        branchName: config.bank.branch,
        minAmount: 100000,
        sortOrder: 0,
        isEnabled: true,
      },
      ...ONLINE_PROVIDERS.map((p, i) => ({
        name: p.charAt(0).toUpperCase() + p.slice(1),
        type: "online",
        provider: p,
        minAmount: 100000,
        sortOrder: i,
        isEnabled: true,
      })),
    ],
  });
}

/** Add newly introduced online/bank providers to existing databases without wiping accounts. */
export async function ensureMissingPaymentGateways() {
  const existing = await investDb.paymentGateway.findMany({
    where: { type: "online" },
    select: { provider: true },
  });
  const have = new Set(existing.map((e) => e.provider).filter(Boolean));
  const missing = ONLINE_PROVIDERS.filter((p) => !have.has(p));
  if (!missing.length) return { added: 0 };

  const maxSort = await investDb.paymentGateway.aggregate({ _max: { sortOrder: true } });
  let sortOrder = (maxSort._max.sortOrder ?? 0) + 1;
  for (const p of missing) {
    await investDb.paymentGateway.create({
      data: {
        name: p.charAt(0).toUpperCase() + p.slice(1),
        type: "online",
        provider: p,
        minAmount: 100000,
        sortOrder: sortOrder++,
        isEnabled: true,
      },
    });
  }
  return { added: missing.length, providers: missing };
}

const DEFAULT_BANK_ACCOUNTS = [
  {
    name: "HDFC Bank — Akshaya Exim",
    bankName: "HDFC Bank",
    accountNumber: "50200012345678",
    ifsc: "HDFC0001234",
    branchName: "Mumbai Main Branch",
    sortOrder: 0,
  },
  {
    name: "ICICI Bank — Akshaya Exim",
    bankName: "ICICI Bank",
    accountNumber: "123456789012",
    ifsc: "ICIC0001234",
    branchName: "Mumbai Branch",
    sortOrder: 1,
  },
  {
    name: "Axis Bank — Akshaya Exim",
    bankName: "Axis Bank",
    accountNumber: "912345678901234",
    ifsc: "UTIB0001234",
    branchName: "Mumbai Branch",
    sortOrder: 2,
  },
  {
    name: "Yes Bank — Akshaya Exim",
    bankName: "Yes Bank",
    accountNumber: "60001234567",
    ifsc: "YESB0000123",
    branchName: "Mumbai Branch",
    sortOrder: 3,
  },
];

/** Ensure HDFC, Axis, ICICI & Yes Bank manual transfer accounts exist for investors. */
export async function ensureDefaultBankAccounts() {
  const existing = await investDb.paymentGateway.findMany({
    where: { type: "bank" },
    select: { bankName: true },
  });
  const have = new Set(existing.map((e) => (e.bankName || "").toLowerCase()));
  let added = 0;
  const accountHolder = config.bank.accountName;
  for (const b of DEFAULT_BANK_ACCOUNTS) {
    if (have.has(b.bankName.toLowerCase())) continue;
    await investDb.paymentGateway.create({
      data: {
        ...b,
        type: "bank",
        accountHolder,
        minAmount: 1000,
        isEnabled: true,
      },
    });
    added++;
  }
  return { added };
}
