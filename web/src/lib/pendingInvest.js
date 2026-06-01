/** Persist in-flight investment so investor can deposit first and resume the same plan. */

const KEY = "invest_pending";

export function savePendingInvest(data) {
  sessionStorage.setItem(
    KEY,
    JSON.stringify({
      ...data,
      amount: Number(data.amount),
      savedAt: Date.now(),
    })
  );
}

export function loadPendingInvest() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.planId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingInvest() {
  sessionStorage.removeItem(KEY);
}

export function pendingDepositAmount(pending, walletAvailable = 0) {
  if (!pending?.amount) return 0;
  return Math.max(0, Number(pending.amount) - Number(walletAvailable || 0));
}

export function canAffordPending(pending, walletAvailable = 0) {
  if (!pending?.amount) return false;
  return Number(walletAvailable || 0) >= Number(pending.amount);
}
