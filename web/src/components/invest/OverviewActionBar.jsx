import WalletQuickActions from "./WalletQuickActions.jsx";
import MobileAppDownload from "./MobileAppDownload.jsx";

/** Deposit, withdraw, refer & PWA — shown above calendar on investor overview */
export default function OverviewActionBar({ onDeposit, onWithdraw, onRefer }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <WalletQuickActions onDeposit={onDeposit} onWithdraw={onWithdraw} layout="row" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRefer}
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
        >
          🔗 Refer & Earn
        </button>
        <MobileAppDownload compact />
      </div>
    </div>
  );
}
