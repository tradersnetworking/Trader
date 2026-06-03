import { Badge } from "../ui.jsx";
import InvestorKycStatusHero from "./InvestorKycStatusHero.jsx";
import { getKycUiPhase } from "../../lib/investCompliance.js";

/** Pre-approval Home — KYC status hero + quick links (not the full investment dashboard). */
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

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <InvestorKycStatusHero
        kyc={kyc}
        kycLoadError={kycLoadError}
        onGoKyc={onGoKyc}
        onGoSupport={onGoSupport}
      />

      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={status} />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{displayName}</h2>
            {investorEmail && <p className="text-sm text-muted-foreground">{investorEmail}</p>}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Until KYC is approved, use <strong className="text-foreground">KYC</strong>,{" "}
          <strong className="text-foreground">My Account</strong>, <strong className="text-foreground">Security</strong>, and{" "}
          <strong className="text-foreground">Help</strong> from the menu. Plans, wallet, and investments unlock after approval.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
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
          {phase !== "needs_submit" && (
            <button type="button" className="btn-outline text-sm sm:col-span-2" onClick={onGoKyc}>
              Open KYC tab
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
