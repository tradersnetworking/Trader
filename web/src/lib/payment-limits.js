export const UPI_MAX_AMOUNT = 100_000;
export const MIN_MANUAL_DEPOSIT = 1_000;

export const UPI_DEPOSIT_PRESETS = [5_000, 10_000, 25_000, 50_000, 100_000];

export function isUpiAmountOverLimit(amount) {
  return Number(amount) > UPI_MAX_AMOUNT;
}

export function depositAmountHint(method) {
  const m = String(method || "").toLowerCase();
  if (m === "upi") {
    return `Enter ₹${MIN_MANUAL_DEPOSIT.toLocaleString("en-IN")} – ₹${UPI_MAX_AMOUNT.toLocaleString("en-IN")} for UPI`;
  }
  return `Minimum ₹${MIN_MANUAL_DEPOSIT.toLocaleString("en-IN")}. Use bank transfer or payment gateway for amounts above ₹${UPI_MAX_AMOUNT.toLocaleString("en-IN")}.`;
}
