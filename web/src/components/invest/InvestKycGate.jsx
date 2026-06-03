import { Alert } from "../ui.jsx";
import {
  canAccessInvestDashboard,
  getKycUiPhase,
  kycStubFromInvestor,
  INVESTOR_KYC_ALLOWED_TABS,
} from "../../lib/investCompliance.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";

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

const LIMITED_TABS = new Set(INVESTOR_KYC_ALLOWED_TABS);

/**
 * NOT_SUBMITTED / REJECTED → Home preview + status banner + limited tabs
 * PENDING → blurred Home + review overlay + limited tabs
 * APPROVED → full dashboard
 */
export default function InvestKycGate({
  kyc,
  kycLoaded = false,
  kycLoadError = null,
  investor = null,
  activeTab = "overview",
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

  if (LIMITED_TABS.has(activeTab)) {
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
      <p className="text-center text-sm text-muted-foreground">
        <button type="button" className="font-semibold text-primary underline" onClick={() => onRefresh?.()}>
          Reload
        </button>{" "}
        or open <strong>Home</strong> from the menu.
      </p>
    </div>
  );
}
