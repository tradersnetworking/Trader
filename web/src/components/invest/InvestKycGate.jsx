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

const PROFILE_TABS = new Set(["profile", "account", "support", "kyc"]);

/**
 * NOT_SUBMITTED (no record) → full KYC form only
 * REJECTED → fix form + view submission; profile tabs via shell
 * PENDING → children (blurred dashboard + overlay)
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

  if ((phase === "needs_fix" || phase === "pending_review") && PROFILE_TABS.has(activeTab)) {
    if (activeTab === "kyc") {
      const body = (
        <div className="page-stack space-y-4">
          {kyc && kyc.status !== "NOT_SUBMITTED" && (
            <InvestorKycSubmissionPanel
              kyc={kyc}
              phase={phase === "pending_review" ? "pending_review" : "needs_fix"}
            />
          )}
          <KycPanel
            kyc={kyc}
            pendingPayoutChange={pendingPayoutChange}
            pendingKycRevision={pendingKycRevision}
            onRefresh={onRefresh}
          />
        </div>
      );
      return onCloseRestricted ? (
        <KycRestrictedPanel
          title="My KYC"
          subtitle="View or update your submitted details and documents"
          onClose={onCloseRestricted}
        >
          {body}
        </KycRestrictedPanel>
      ) : (
        body
      );
    }
    return children;
  }

  const rejectedSections = getRejectedSections(kyc);
  const partial = kyc?.status === "REJECTED" && rejectedSections.length > 0;
  const showSubmission = kyc && kyc.status !== "NOT_SUBMITTED";

  if (phase === "needs_fix" && activeTab !== "kyc") {
    return (
      <div className="page-stack mx-auto max-w-3xl space-y-4">
        <Alert type="error">
          {partial
            ? `Please correct the rejected section(s): ${rejectedSections.map((id) => KYC_SECTION_LABELS[id]).join(", ")}. Approved sections are locked — update only what was rejected below.`
            : `Your KYC needs updates${kyc.remarks ? `: ${kyc.remarks}` : ""}. Fix the form below and resubmit with clear documents.`}
        </Alert>
        {showSubmission && (
          <InvestorKycSubmissionPanel kyc={kyc} phase="needs_fix" onEditKyc={() => {}} />
        )}
        <KycPanel
          kyc={kyc}
          pendingPayoutChange={pendingPayoutChange}
          pendingKycRevision={pendingKycRevision}
          onRefresh={onRefresh}
          forced
        />
      </div>
    );
  }

  return (
    <div className="page-stack mx-auto max-w-3xl space-y-4">
      <Alert type="info">
        Complete KYC before using the investor dashboard. Fill in your details and upload PAN, Aadhaar, photo, bank proof, and signature, then submit.
      </Alert>
      {showSubmission && <InvestorKycSubmissionPanel kyc={kyc} phase="needs_submit" />}
      <KycPanel
        kyc={kyc}
        pendingPayoutChange={pendingPayoutChange}
        pendingKycRevision={pendingKycRevision}
        onRefresh={onRefresh}
        forced
      />
    </div>
  );
}
