import { useState } from "react";
import { Alert, Badge } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import InvestorKycViewModal from "./InvestorKycViewModal.jsx";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";

/**
 * Lets pending/rejected investors review what they submitted (View opens popup).
 */
export default function InvestorKycSubmissionPanel({ kyc, phase = "pending_review", compact = false }) {
  const [viewOpen, setViewOpen] = useState(false);

  if (!kyc || kyc.status === "NOT_SUBMITTED") return null;

  const submittedAt = kyc.createdAt || kyc.updatedAt;
  const rejectedSections = getRejectedSections(kyc);
  const isRejected = phase === "needs_fix" || kyc.status === "REJECTED";

  return (
    <>
      <div
        className={`rounded-xl border border-border bg-card/80 space-y-3 ${
          compact ? "p-4" : "p-5"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge status={kyc.status} />
            <h3 className="mt-2 text-sm font-bold text-foreground">
              {isRejected ? "Submitted KYC (for your reference)" : "Your submitted KYC"}
            </h3>
            {submittedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last submitted {new Date(submittedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <button type="button" className="btn-gold shrink-0 text-sm" onClick={() => setViewOpen(true)}>
            View full KYC
          </button>
        </div>

        {isRejected && kyc.remarks && (
          <Alert type="error">Admin remarks: {kyc.remarks}</Alert>
        )}

        {isRejected && rejectedSections.length > 0 && (
          <Alert type="info">
            Rejected sections:{" "}
            {rejectedSections.map((id) => KYC_SECTION_LABELS[id] || id).join(", ")}. Approved sections stay locked.
          </Alert>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Uploaded documents
          </p>
          <KycDocumentsList kyc={kyc} scope="invest" compact={compact} />
        </div>

        <p className="text-xs text-muted-foreground">
          Use <strong>View</strong> on each document to preview in a popup. You can update rejected sections in the form
          below after admin review.
        </p>
      </div>

      <InvestorKycViewModal open={viewOpen} onClose={() => setViewOpen(false)} kyc={kyc} />
    </>
  );
}
