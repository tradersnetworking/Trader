/** Investor payment rails — deposit and withdraw toggles are independent per mode. */

export const INVESTOR_PAYMENT_VISIBILITY = [
  {
    id: "upi",
    label: "UPI",
    hint: "Deposit and withdraw can be enabled separately.",
    showDeposit: true,
    showWithdraw: true,
  },
  {
    id: "bank",
    label: "Bank transfer",
    hint: "Bank deposit (IMPS/NEFT/RTGS) and bank withdrawals are controlled together here.",
    showDeposit: true,
    showWithdraw: true,
  },
  {
    id: "gateway",
    label: "Payment gateway",
    hint: "Online checkout for deposits only.",
    showDeposit: true,
    showWithdraw: false,
  },
  {
    id: "crypto",
    label: "Crypto (USDT, TRX, BNB)",
    hint: "Crypto deposit and crypto wallet withdrawal are independent.",
    showDeposit: true,
    showWithdraw: true,
  },
];

export const BANK_TRANSFER_DEPOSIT_TYPES = [
  { id: "imps", label: "IMPS" },
  { id: "neft", label: "NEFT" },
  { id: "rtgs", label: "RTGS" },
];
