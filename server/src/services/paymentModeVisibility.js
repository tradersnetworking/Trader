import { getSetting, setSettings } from "./investSettings.js";
import { parseExtraConfig } from "./paymentGateways.js";

export const VISIBILITY_SETTING_KEY = "payment_mode_visibility";

/** High-level deposit categories shown on investor wallet. */
export const DEPOSIT_CATEGORIES = [
  { id: "upi", label: "UPI" },
  { id: "bank", label: "Bank Transfer" },
  { id: "gateway", label: "Payment Gateway" },
];

export const WITHDRAW_METHOD_IDS = [
  { id: "UPI", label: "UPI" },
  { id: "BANK", label: "Bank Account" },
];

export const MANUAL_BANK_TYPES = ["IMPS", "NEFT", "RTGS"];

const DEFAULT_MODE = { deposit: true, withdraw: true };

function normalizeEntry(entry) {
  if (entry == null || typeof entry !== "object") return { ...DEFAULT_MODE };
  return {
    deposit: entry.deposit !== false,
    withdraw: entry.withdraw !== false,
  };
}

export async function getPaymentModeVisibilityMap() {
  const raw = await getSetting(VISIBILITY_SETTING_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function getModeVisibility(map, modeId) {
  return normalizeEntry(map[String(modeId || "").toLowerCase()] ?? map[String(modeId || "").toUpperCase()]);
}

export async function isDepositModeVisible(modeId) {
  const map = await getPaymentModeVisibilityMap();
  return getModeVisibility(map, modeId).deposit;
}

export async function isWithdrawModeVisible(modeId) {
  const map = await getPaymentModeVisibilityMap();
  return getModeVisibility(map, modeId).withdraw;
}

export async function savePaymentModeVisibility(updates = {}) {
  const map = await getPaymentModeVisibilityMap();
  for (const [key, val] of Object.entries(updates)) {
    const id = String(key).toLowerCase();
    const prev = normalizeEntry(map[id]);
    map[id] = {
      deposit: val.deposit !== undefined ? Boolean(val.deposit) : prev.deposit,
      withdraw: val.withdraw !== undefined ? Boolean(val.withdraw) : prev.withdraw,
    };
  }
  await setSettings({ [VISIBILITY_SETTING_KEY]: JSON.stringify(map) });
  return map;
}

export function accountShowsForDeposit(gateway) {
  const ec = parseExtraConfig(gateway?.extraConfig);
  if (ec.showDeposit === false) return false;
  return gateway?.isEnabled !== false;
}

export function accountShowsForWithdraw(gateway) {
  const ec = parseExtraConfig(gateway?.extraConfig);
  return ec.showWithdraw !== false;
}

export async function filterCollectionGatewaysForInvestors(gateways = []) {
  const map = await getPaymentModeVisibilityMap();
  if (getModeVisibility(map, "gateway").deposit === false) return [];
  return gateways.filter((g) => getModeVisibility(map, g.name).deposit);
}

export async function getInvestorPaymentOptions() {
  const map = await getPaymentModeVisibilityMap();
  return {
    depositCategories: {
      upi: getModeVisibility(map, "upi").deposit,
      bank: getModeVisibility(map, "bank").deposit,
      gateway: getModeVisibility(map, "gateway").deposit,
    },
    withdrawMethods: {
      UPI: getModeVisibility(map, "upi").withdraw || getModeVisibility(map, "UPI").withdraw,
      BANK: getModeVisibility(map, "bank").withdraw || getModeVisibility(map, "BANK").withdraw,
    },
    bankTransferTypes: Object.fromEntries(
      MANUAL_BANK_TYPES.map((t) => [t, getModeVisibility(map, t).deposit])
    ),
  };
}

export async function assertDepositGatewayAllowed(gatewayName) {
  const map = await getPaymentModeVisibilityMap();
  if (getModeVisibility(map, "gateway").deposit === false) {
    const err = new Error("Online payment gateways are not available right now.");
    err.status = 400;
    throw err;
  }
  const key = String(gatewayName || "").toLowerCase();
  if (!getModeVisibility(map, key).deposit) {
    const err = new Error(`Payment gateway ${gatewayName} is not available for deposits.`);
    err.status = 400;
    throw err;
  }
}

export async function buildAdminVisibilityView(collection = [], payouts = []) {
  const map = await getPaymentModeVisibilityMap();
  const modes = {};
  for (const c of DEPOSIT_CATEGORIES) {
    modes[c.id] = getModeVisibility(map, c.id);
  }
  for (const w of WITHDRAW_METHOD_IDS) {
    modes[w.id] = getModeVisibility(map, w.id);
  }
  for (const t of MANUAL_BANK_TYPES) {
    modes[t] = getModeVisibility(map, t);
  }
  for (const g of collection) {
    const id = String(g.name).toLowerCase();
    modes[id] = getModeVisibility(map, id);
  }
  for (const g of payouts) {
    const id = String(g.name).toLowerCase();
    const prev = getModeVisibility(map, id);
    modes[id] = { deposit: prev.deposit, withdraw: getModeVisibility(map, g.name).withdraw };
  }
  return { map, modes };
}
