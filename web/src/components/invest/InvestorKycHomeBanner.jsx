import { Alert } from "../ui.jsx";
import { getKycUiPhase } from "../../lib/investCompliance.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";

export default function InvestorKycHomeBanner({ kyc, kycLoadError, onGoKyc, onGoSupport }) {
  const phase = getKycUiPhase(kyc, { loaded: true, loadError: kycLoadError });

  if (phase === "approved") return null;

  const rejected = getRejectedSections(kyc);

  if (phase === "pending_review") {
    return (
      <Alert type="info">
        <p className="font-semibold text-foreground">KYC under review</p>
        <p className="mt-1 text-sm">
          Thank you for submitting your documents. Our team is verifying your details — usually within 24–48 hours.
          Use <strong>Home</strong>, <strong>KYC</strong>, <strong>My Account</strong>, <strong>Security</strong>, or <strong>Help</strong> until approval. Your dashboard preview stays on Home while we review your application.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-outline text-xs" onClick={onGoKyc}>
            View submitted KYC
          </button>
          {onGoSupport && (
            <button type="button" className="btn-outline text-xs" onClick={onGoSupport}>
              Contact support
            </button>
          )}
        </div>
      </Alert>
    );
  }

  if (phase === "needs_fix") {
    return (
      <Alert type="error">
        <p className="font-semibold text-foreground">KYC needs correction</p>
        {kyc?.remarks && (
          <p className="mt-1 text-sm">
            <span className="font-medium">Reason: </span>
            {kyc.remarks}
          </p>
        )}
        {rejected.length > 0 && (
          <p className="mt-1 text-sm">
            Please update: {rejected.map((id) => KYC_SECTION_LABELS[id]).join(", ")}.
          </p>
        )}
        <button type="button" className="btn-gold mt-3 text-sm" onClick={onGoKyc}>
          Update KYC →
        </button>
      </Alert>
    );
  }

  return (
    <Alert type="warning">
      <p className="font-semibold text-foreground">Complete KYC to unlock the full dashboard</p>
      <p className="mt-1 text-sm">
        Fill in all personal and bank details and upload PAN, Aadhaar, photo, bank proof, and signature.
        Submit is enabled only when every required field and document is provided.
      </p>
      <button type="button" className="btn-gold mt-3 text-sm" onClick={onGoKyc}>
        Start / continue KYC →
      </button>
    </Alert>
  );
}
