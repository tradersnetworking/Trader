import { useState } from "react";
import { Alert, Badge } from "../ui.jsx";
import InvestorKycSubmissionPanel from "./InvestorKycSubmissionPanel.jsx";
import InvestorKycViewModal from "./InvestorKycViewModal.jsx";

/** Shown while KYC is PENDING — dashboard visible behind blur but not usable */
export default function KycUnderReviewCard({ kyc, onRefresh, compact = false, onOpenProfile, onOpenAccount }) {
  const [viewOpen, setViewOpen] = useState(false);
  const submittedAt = kyc?.createdAt || kyc?.updatedAt;

  return (
    <>
      <div
        className={`card mx-auto w-full max-w-lg space-y-4 shadow-2xl ring-2 ring-amber-500/30 ${
          compact ? "p-5 sm:p-6" : "p-6 sm:p-8"
        }`}
        role="dialog"
        aria-labelledby="kyc-review-title"
        aria-describedby="kyc-review-desc"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-500/40 bg-amber-500/10">
            <span className="text-2xl">⏳</span>
          </div>
          <Badge status="PENDING" />
          <h2 id="kyc-review-title" className="mt-3 text-xl font-bold text-foreground">
            KYC under review
          </h2>
          <p id="kyc-review-desc" className="mt-2 text-sm text-muted-foreground">
            Your application was submitted successfully. You can preview the dashboard below, but plans, wallet actions,
            and investments unlock after admin approval — usually within 24–48 hours.
          </p>
          {submittedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted on {new Date(submittedAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>

        <Alert type="info">
          Please visit again after some time or tap Refresh to check if your KYC has been approved.
        </Alert>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-gold flex-1 text-sm" onClick={() => onRefresh?.()}>
            Refresh status
          </button>
          {kyc && (
            <button type="button" className="btn-outline flex-1 text-sm" onClick={() => setViewOpen(true)}>
              View submitted KYC
            </button>
          )}
        </div>

        {kyc && (
          <div className="border-t border-border pt-4 text-left">
            <InvestorKycSubmissionPanel kyc={kyc} phase="pending_review" compact />
          </div>
        )}

        {(onOpenProfile || onOpenAccount) && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
            <div className="flex flex-wrap gap-2">
              {onOpenProfile && (
                <button type="button" className="btn-outline text-sm" onClick={onOpenProfile}>
                  Profile
                </button>
              )}
              {onOpenAccount && (
                <button type="button" className="btn-outline text-sm" onClick={onOpenAccount}>
                  Security &amp; logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <InvestorKycViewModal open={viewOpen} onClose={() => setViewOpen(false)} kyc={kyc} />
    </>
  );
}
