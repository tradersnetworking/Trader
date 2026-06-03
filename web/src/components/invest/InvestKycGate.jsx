import { Alert } from "../ui.jsx";
import {
  canAccessInvestDashboard,
  getKycUiPhase,
  kycStubFromInvestor,
} from "../../lib/investCompliance.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";
import KycPanel from "./KycPanel.jsx";
import InvestorKycSubmissionPanel from "./InvestorKycSubmissionPanel.jsx";
import KycRestrictedPanel from "./KycRestrictedPanel.jsx";

function KycGateLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading your account…</p>
    </div>
  );
}

function KycLoadError({ message, onRetry, investor }) {
  const stub = kycStubFromInvestor(investor);
  return (
    <div className="page-stack mx-auto max-w-lg">
      <div className="card space-y-4 p-6 text-center">
        <Alert type="error">{message || "Could not load your KYC status. Please try again."}</Alert>
        {stub?.status === "APPROVED" && (
          <p className="text-xs text-muted-foreground">
            Your account shows KYC as approved — if this persists, refresh or contact support.
          </p>
        )}
        <button type="button" className="btn-gold text-sm" onClick={() => onRetry?.()}>
          Retry
        </button>
      </div>
    </div>
  );
}

const LIMITED_TABS = new Set(["overview", "profile", "account", "support", "kyc"]);

function KycTabContent({ kyc, phase, pendingPayoutChange, pendingKycRevision, onRefresh, onCloseRestricted }) {
  const body = (
    <div className="page-stack space-y-4">
      {kyc && kyc.status !== "NOT_SUBMITTED" && (
        <InvestorKycSubmissionPanel
          kyc={kyc}
          phase={phase === "pending_review" ? "pending_review" : phase === "needs_fix" ? "needs_fix" : "needs_submit"}
        />
      )}
      <KycPanel
        kyc={kyc}
        pendingPayoutChange={pendingPayoutChange}
        pendingKycRevision={pendingKycRevision}
        onRefresh={onRefresh}
        forced={phase === "needs_submit"}
      />
    </div>
  );

  if (!onCloseRestricted) return body;

  return (
    <KycRestrictedPanel
      title="My KYC"
      subtitle="Complete details and upload all required documents before submitting"
      onClose={onCloseRestricted}
    >
      {body}
    </KycRestrictedPanel>
  );
}

/**
 * NOT_SUBMITTED → limited dashboard (Home message + KYC form)
 * REJECTED → fix form + limited tabs
 * PENDING → blurred dashboard preview + overlay
 * APPROVED → full dashboard
 */
export default function InvestKycGate({
  kyc,
  kycLoaded = false,
  kycLoadError = null,
  investor = null,
  activeTab = "overview",
  pendingPayoutChange,
  pendingKycRevision,
  onRefresh,
  onCloseRestricted,
  children,
}) {
  const phase = getKycUiPhase(kyc, { loaded: kycLoaded, loadError: kycLoadError });

  if (phase === "loading") {
    return <KycGateLoading />;
  }

  if (phase === "error") {
    return <KycLoadError message={kycLoadError} onRetry={onRefresh} investor={investor} />;
  }

  if (canAccessInvestDashboard(kyc) || phase === "pending_review") {
    return children;
  }

  if (LIMITED_TABS.has(activeTab)) {
    if (activeTab === "kyc") {
      return (
        <KycTabContent
          kyc={kyc}
          phase={phase}
          pendingPayoutChange={pendingPayoutChange}
          pendingKycRevision={pendingKycRevision}
          onRefresh={onRefresh}
          onCloseRestricted={onCloseRestricted}
        />
      );
    }
    return children;
  }

  const rejectedSections = getRejectedSections(kyc);
  const partial = kyc?.status === "REJECTED" && rejectedSections.length > 0;

  return (
    <div className="page-stack mx-auto max-w-3xl space-y-4">
      <Alert type="info">
        {partial
          ? `Please correct: ${rejectedSections.map((id) => KYC_SECTION_LABELS[id]).join(", ")}.`
          : "Complete KYC from the KYC tab to unlock the full dashboard."}
      </Alert>
      <KycTabContent
        kyc={kyc}
        phase={phase}
        pendingPayoutChange={pendingPayoutChange}
        pendingKycRevision={pendingKycRevision}
        onRefresh={onRefresh}
      />
    </div>
  );
}
