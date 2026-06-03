import { Alert } from "../ui.jsx";
import { canAccessInvestDashboard, getKycUiPhase } from "../../lib/investCompliance.js";
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

/**
 * NOT_SUBMITTED → full KYC form
 * REJECTED → fix rejected sections only
 * PENDING → children shown (shell blurs dashboard + overlay)
 * APPROVED → full dashboard
 */
export default function InvestKycGate({
  kyc,
  kycLoaded = true,
  pendingPayoutChange,
  pendingKycRevision,
  onRefresh,
  children,
}) {
  const phase = getKycUiPhase(kyc, { loaded: kycLoaded });

  if (phase === "loading") {
    return <KycGateLoading />;
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
