/** Kuber-style deposit / withdraw header actions */
export default function WalletQuickActions({ onDeposit, onWithdraw, compact = false, layout = "inline" }) {
  const btn = compact
    ? "rounded-lg px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-xs"
    : "rounded-lg px-3 py-2 text-xs font-bold sm:text-sm";

  const container =
    layout === "row"
      ? "flex flex-wrap gap-2"
      : "inline-flex flex-wrap items-center gap-1.5 sm:gap-2";

  return (
    <div className={container}>
      <button
        type="button"
        onClick={onDeposit}
        className={`${btn} bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:opacity-90`}
      >
        ↓ Deposit
      </button>
      <button
        type="button"
        onClick={onWithdraw}
        className={`${btn} border border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400`}
      >
        ↑ Withdraw
      </button>
    </div>
  );
}
