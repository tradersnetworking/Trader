import { useState } from "react";
import { Alert, Badge } from "../ui.jsx";
import InvestorKycSubmissionPanel from "./InvestorKycSubmissionPanel.jsx";
import InvestorKycViewModal from "./InvestorKycViewModal.jsx";

/** Shown while KYC is PENDING — dashboard visible behind blur but not usable */
export default function KycUnderReviewCard({
  kyc,
  onRefresh,
  compact = false,
  onOpenProfile,
  onOpenAccount,
  onOpenSupport,
  onEditKyc,
  onViewSubmission,
  onLogout,
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const submittedAt = kyc?.createdAt || kyc?.updatedAt;

  const openView = () => {
    if (onViewSubmission) onViewSubmission();
    else setViewOpen(true);
  };

  return (
    <>
      <div
        className={`card mx-auto w-full space-y-4 shadow-2xl ring-2 ring-amber-500/30 ${
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
            Your application was submitted. Plans and investments unlock after approval — usually 24–48 hours.
            You can view or update your KYC, contact support, or sign out below.
          </p>
          {submittedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted on {new Date(submittedAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>

        <Alert type="info">
          Tap Refresh to check approval status. Use View / edit KYC to change details while your case is reviewed.
        </Alert>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button type="button" className="btn-gold text-sm" onClick={() => onRefresh?.()}>
            Refresh
          </button>
          {kyc && (
            <button type="button" className="btn-outline text-sm" onClick={openView}>
              View KYC
            </button>
          )}
          {onEditKyc && (
            <button type="button" className="btn-outline text-sm" onClick={onEditKyc}>
              Edit KYC
            </button>
          )}
        </div>

        {kyc && (
          <div className="border-t border-border pt-4 text-left">
            <InvestorKycSubmissionPanel kyc={kyc} phase="pending_review" compact />
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account &amp; help</p>
          <div className="flex flex-wrap gap-2">
            {onOpenProfile && (
              <button type="button" className="btn-outline text-sm" onClick={onOpenProfile}>
                Profile
              </button>
            )}
            {onOpenAccount && (
              <button type="button" className="btn-outline text-sm" onClick={onOpenAccount}>
                Security
              </button>
            )}
            {onOpenSupport && (
              <button type="button" className="btn-outline text-sm" onClick={onOpenSupport}>
                Support
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                className="btn-outline text-sm text-red-600 dark:text-red-400"
                onClick={() => onLogout()}
              >
                Logout
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Floating buttons: Share (left) and Support — WhatsApp, Telegram, or in-app chat.
          </p>
        </div>
      </div>

      {!onViewSubmission && (
        <InvestorKycViewModal open={viewOpen} onClose={() => setViewOpen(false)} kyc={kyc} />
      )}
    </>
  );
}
