import { Badge, Alert } from "../ui.jsx";
import { getKycUiPhase } from "../../lib/investCompliance.js";
import { KYC_REVIEW_TIME_PENDING, KYC_REVIEW_TIME_SHORT } from "../../lib/kyc-review-copy.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";

const HERO = {
  pending_review: {
    icon: "⏳",
    title: "KYC under review",
    ring: "border-amber-500/40 bg-amber-500/10",
    tone: "text-amber-700 dark:text-amber-400",
  },
  needs_fix: {
    icon: "⚠️",
    title: "KYC rejected — action required",
    ring: "border-rose-500/40 bg-rose-500/10",
    tone: "text-rose-700 dark:text-rose-400",
  },
  needs_submit: {
    icon: "📋",
    title: "Complete your KYC",
    ring: "border-amber-500/40 bg-amber-500/10",
    tone: "text-foreground",
  },
};

/** Prominent Home status — hourglass / icons like the review overlay. */
export default function InvestorKycStatusHero({ kyc, kycLoadError, onGoKyc, onGoSupport }) {
  const phase = getKycUiPhase(kyc, { loaded: true, loadError: kycLoadError });
  if (phase === "approved" || phase === "loading" || phase === "error") return null;

  const cfg = HERO[phase] || HERO.needs_submit;
  const status = kyc?.status || "NOT_SUBMITTED";
  const rejected = getRejectedSections(kyc);
  const submittedAt = kyc?.createdAt || kyc?.updatedAt;

  return (
    <div className="card space-y-4 p-6 text-center shadow-md ring-2 ring-amber-500/20 sm:p-8">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 ${cfg.ring}`}
        aria-hidden
      >
        <span className="text-3xl">{cfg.icon}</span>
      </div>
      <div>
        <Badge status={status} />
        <h2 className={`mt-3 text-xl font-bold ${cfg.tone}`}>{cfg.title}</h2>
        {submittedAt && phase === "pending_review" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted {new Date(submittedAt).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {phase === "pending_review" && (
        <p className="text-sm text-muted-foreground">{KYC_REVIEW_TIME_PENDING}</p>
      )}

      {phase === "needs_fix" && (
        <div className="space-y-2 text-left">
          <Alert type="error">
            {kyc?.remarks ? (
              <>
                <span className="font-medium">Reason: </span>
                {kyc.remarks}
              </>
            ) : (
              "Please correct the sections below and resubmit your KYC."
            )}
          </Alert>
          {rejected.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Update: {rejected.map((id) => KYC_SECTION_LABELS[id] || id).join(", ")}.
            </p>
          )}
        </div>
      )}

      {phase === "needs_submit" && (
        <>
          <p className="text-sm text-muted-foreground">
            Submit personal details, ID documents, bank proof, and signature to unlock the full dashboard.
          </p>
          <p className="text-xs text-muted-foreground">After submission: {KYC_REVIEW_TIME_SHORT}</p>
        </>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" className="btn-gold text-sm" onClick={onGoKyc}>
          {phase === "needs_submit" ? "Start / continue KYC" : phase === "needs_fix" ? "Update KYC" : "View submitted KYC"}
        </button>
        {onGoSupport && (
          <button type="button" className="btn-outline text-sm" onClick={onGoSupport}>
            Contact support
          </button>
        )}
      </div>
    </div>
  );
}
