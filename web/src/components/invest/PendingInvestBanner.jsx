import { inr } from "../../lib/format.js";
import { Alert } from "../ui.jsx";
import { pendingDepositAmount } from "../../lib/pendingInvest.js";

export default function PendingInvestBanner({ pending, walletAvailable, onContinue, onDismiss, compact }) {
  if (!pending) return null;

  const shortfall = pendingDepositAmount(pending, walletAvailable);
  const canContinue = shortfall <= 0;

  return (
    <Alert type={canContinue ? "success" : "info"}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "text-sm" : ""}`}>
        <div>
          <p className="font-semibold">
            {canContinue ? "Ready to invest" : "Deposit to continue investing"}
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            {pending.planName} · {inr(pending.amount)}
            {!canContinue && shortfall > 0 && (
              <> · add at least <b>{inr(shortfall)}</b> to your wallet</>
            )}
            {!canContinue && (
              <> · after admin approves your deposit, return here to complete the investment</>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canContinue && (
            <button type="button" className="btn-gold text-xs" onClick={onContinue}>
              Continue Plan
            </button>
          )}
          <button type="button" className="btn-outline text-xs" onClick={onDismiss}>
            Cancel
          </button>
        </div>
      </div>
    </Alert>
  );
}
