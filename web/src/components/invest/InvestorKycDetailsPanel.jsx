import { useState } from "react";
import { Alert, Badge } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import InvestorKycViewModal from "./InvestorKycViewModal.jsx";
import { KYC_DETAIL_FIELDS } from "../../lib/kyc-detail-display.js";
import { getRejectedSections, KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";

/** KYC tab before approval (submitted) — personal/bank details and all uploaded files. */
export default function InvestorKycDetailsPanel({ kyc, onEditKyc, phase = "pending_review" }) {
  const [viewOpen, setViewOpen] = useState(false);

  if (!kyc || kyc.status === "NOT_SUBMITTED") return null;

  const submittedAt = kyc.createdAt || kyc.updatedAt;
  const rejectedSections = getRejectedSections(kyc);
  const isRejected = phase === "needs_fix" || kyc.status === "REJECTED";

  return (
    <div className="page-stack mx-auto w-full max-w-3xl">
      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge status={kyc.status} />
            <h2 className="mt-2 text-lg font-bold text-foreground">Your KYC details</h2>
            {submittedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last submitted {new Date(submittedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11rem] sm:shrink-0">
            <button type="button" className="btn-outline w-full text-sm" onClick={() => setViewOpen(true)}>
              Full-screen view
            </button>
            {onEditKyc && (
              <button type="button" className="btn-gold w-full text-sm" onClick={onEditKyc}>
                {isRejected ? "Update KYC" : "Edit while under review"}
              </button>
            )}
          </div>
        </div>

        {isRejected && kyc.remarks && <Alert type="error">Admin remarks: {kyc.remarks}</Alert>}
        {isRejected && rejectedSections.length > 0 && (
          <Alert type="info">
            Sections to correct: {rejectedSections.map((id) => KYC_SECTION_LABELS[id] || id).join(", ")}.
          </Alert>
        )}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {KYC_DETAIL_FIELDS.map(([label, get]) => {
            const v = get(kyc);
            if (!v) return null;
            return (
              <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-0.5 break-words font-medium text-foreground">{v}</div>
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold text-foreground">Uploaded documents & images</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Tap View on each file to preview. Images include photo, ID, and signature.
          </p>
          <KycDocumentsList kyc={kyc} scope="invest" showMissing compact />
        </div>
      </div>

      <InvestorKycViewModal open={viewOpen} onClose={() => setViewOpen(false)} kyc={kyc} />
    </div>
  );
}
