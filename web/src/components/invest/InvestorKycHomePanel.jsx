import { Badge } from "../ui.jsx";
import InvestorKycHomeBanner from "./InvestorKycHomeBanner.jsx";
import { getKycUiPhase } from "../../lib/investCompliance.js";

/** Pre-approval Home — KYC status only, not the full investment dashboard. */
export default function InvestorKycHomePanel({
  kyc,
  kycLoadError,
  displayName,
  investorEmail,
  onGoKyc,
  onGoSupport,
  onGoProfile,
  onGoSecurity,
}) {
  const phase = getKycUiPhase(kyc, { loaded: true, loadError: kycLoadError });
  const status = kyc?.status || "NOT_SUBMITTED";

  const phaseHint = {
    needs_submit: "Complete and submit KYC to unlock plans, wallet, and investments.",
    pending_review: "We are reviewing your documents. You will get full dashboard access after approval.",
    needs_fix: "Update the sections marked for correction and resubmit.",
    approved: "Your account is fully active.",
  };

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <InvestorKycHomeBanner
        kyc={kyc}
        kycLoadError={kycLoadError}
        onGoKyc={onGoKyc}
        onGoSupport={onGoSupport}
      />

      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={status} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
            {investorEmail && <p className="text-sm text-muted-foreground">{investorEmail}</p>}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{phaseHint[phase] || phaseHint.needs_submit}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-gold text-sm" onClick={onGoKyc}>
            {phase === "needs_submit" ? "Start KYC" : "View KYC & documents"}
          </button>
          {onGoProfile && (
            <button type="button" className="btn-outline text-sm" onClick={onGoProfile}>
              My Account
            </button>
          )}
          {onGoSecurity && (
            <button type="button" className="btn-outline text-sm" onClick={onGoSecurity}>
              Security
            </button>
          )}
          {onGoSupport && (
            <button type="button" className="btn-outline text-sm" onClick={onGoSupport}>
              Help & support
            </button>
          )}
        </div>

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Investment plans, Money Hub, referrals, and portfolio charts appear here after KYC is approved.
        </p>
      </div>
    </div>
  );
}
