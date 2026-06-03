import { Alert, Badge } from "../ui.jsx";
import { canAccessInvestDashboard, getKycUiPhase } from "../../lib/investCompliance.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import KycPanel from "./KycPanel.jsx";

function KycGateLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading your account…</p>
    </div>
  );
}

function KycUnderReview({ kyc, onRefresh }) {
  const submittedAt = kyc?.createdAt || kyc?.updatedAt;

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <div className="card space-y-4 p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500/40 bg-amber-500/10">
          <span className="text-3xl">⏳</span>
        </div>
        <div>
          <Badge status="PENDING" />
          <h2 className="mt-3 text-xl font-bold text-foreground">KYC under review</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you for submitting your KYC details and documents. Our compliance team is verifying your application.
            Please visit again after some time — typically within 24–48 hours.
          </p>
          {submittedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted on {new Date(submittedAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>
        <Alert type="info">
          You will get full access to the investor dashboard (plans, wallet, investments) once your KYC is fully approved.
          You may refresh this page to check your status.
        </Alert>
        <button type="button" className="btn-outline text-sm" onClick={() => onRefresh?.()}>
          Refresh status
        </button>
      </div>

      {kyc && (
        <div className="card p-5 text-left">
          <h3 className="mb-3 text-sm font-bold text-foreground">Documents you submitted</h3>
          <p className="mb-3 text-xs text-muted-foreground">These are locked while review is in progress.</p>
          <KycDocumentsList kyc={kyc} scope="invest" locked />
        </div>
      )}
    </div>
  );
}

/**
 * Blocks investor dashboard until KYC is admin-approved.
 * NOT_SUBMITTED → full KYC form
 * REJECTED → fix rejected sections only (approved sections locked)
 * PENDING → under review message
 * APPROVED → full dashboard (children)
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

  if (canAccessInvestDashboard(kyc)) {
    return children;
  }

  if (phase === "pending_review") {
    return <KycUnderReview kyc={kyc} onRefresh={onRefresh} />;
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
