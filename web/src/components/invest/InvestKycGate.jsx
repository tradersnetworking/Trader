import { Alert } from "../ui.jsx";
import {
  canAccessInvestDashboard,
  getKycUiPhase,
  kycStubFromInvestor,
} from "../../lib/investCompliance.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";
import KycPanel from "./KycPanel.jsx";

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

/**
 * NOT_SUBMITTED → full KYC form
 * REJECTED → fix rejected sections only
 * PENDING → children shown (shell blurs dashboard + overlay)
 * APPROVED → full dashboard
 */
export default function InvestKycGate({
  kyc,
  kycLoaded = false,
  kycLoadError = null,
  investor = null,
  pendingPayoutChange,
  pendingKycRevision,
  onRefresh,
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

  const rejectedSections = getRejectedSections(kyc);
  const partial = kyc?.status === "REJECTED" && rejectedSections.length > 0;

  return (
    <div className="page-stack mx-auto max-w-3xl">
      <Alert type={kyc?.status === "REJECTED" ? "error" : "info"}>
        {partial
          ? `Please correct the rejected section(s): ${rejectedSections.map((id) => KYC_SECTION_LABELS[id]).join(", ")}. Approved sections are locked — update only what was rejected below.`
          : kyc?.status === "REJECTED"
            ? `Your KYC needs updates${kyc.remarks ? `: ${kyc.remarks}` : ""}. Fix the form below and resubmit with clear documents.`
            : "Complete KYC before using the investor dashboard. Fill in your details and upload PAN, Aadhaar, photo, bank proof, and signature, then submit."}
      </Alert>
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
