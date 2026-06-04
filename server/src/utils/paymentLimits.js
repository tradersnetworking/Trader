/** UPI deposit/withdraw per-transaction cap (₹). Larger amounts use bank or payment gateway. */
export const UPI_MAX_AMOUNT = 100_000;

/** Minimum wallet top-up via manual UPI / bank (₹). */
export const MIN_MANUAL_DEPOSIT = 1_000;

export function validateDepositAmount(amount, method) {
  const amt = Number(amount);
  const m = String(method || "UPI").toUpperCase();
  if (!Number.isFinite(amt) || amt < MIN_MANUAL_DEPOSIT) {
    return {
      ok: false,
      error: `Minimum deposit is ₹${MIN_MANUAL_DEPOSIT.toLocaleString("en-IN")}.`,
    };
  }
  if (m === "UPI" && amt > UPI_MAX_AMOUNT) {
    return {
      ok: false,
      code: "UPI_MAX_EXCEEDED",
      error: `UPI deposits are limited to ₹${UPI_MAX_AMOUNT.toLocaleString("en-IN")} per transaction. Use bank transfer or payment gateway for larger amounts.`,
    };
  }
  return { ok: true };
}

export function validateWithdrawAmount(amount, mode) {
  const amt = Number(amount);
  const m = String(mode || "UPI").toUpperCase();
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "Enter a valid withdrawal amount." };
  }
  if (m === "UPI" && amt > UPI_MAX_AMOUNT) {
    return {
      ok: false,
      code: "UPI_MAX_EXCEEDED",
      error: `UPI withdrawals are limited to ₹${UPI_MAX_AMOUNT.toLocaleString("en-IN")} per request. Use bank transfer for larger amounts.`,
    };
  }
  return { ok: true };
}
