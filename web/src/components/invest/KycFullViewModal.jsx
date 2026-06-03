import { Badge, Modal } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import KycAdminSectionReview from "./KycAdminSectionReview.jsx";
import { KYC_DETAIL_FIELDS } from "../../lib/kyc-detail-display.js";

export default function KycFullViewModal({
  open,
  onClose,
  kyc,
  readOnly = false,
  investorTitle,
  onSectionDecision,
  onFinalApprove,
  onFinalReject,
  onApprove,
  onReject,
  reviewBusy = false,
}) {
  if (!kyc) return null;

  const title = investorTitle || kyc.fullName || kyc.investor?.name || "Investor";
  const modalTitle = readOnly ? `Submitted KYC — ${title}` : `Full KYC — ${title}`;

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} wide>
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={kyc.status} />
          {kyc.investor?.email && <span className="text-sm text-muted-foreground">{kyc.investor.email}</span>}
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
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

        {kyc.remarks && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            Remarks: {kyc.remarks}
          </p>
        )}

        <div>
          <h4 className="mb-3 text-sm font-bold text-foreground">Uploaded documents</h4>
          <p className="mb-2 text-xs text-muted-foreground">
            Check each document is clear (not blurry). Reject the related section if unreadable or password-protected PDF.
          </p>
          <KycDocumentsList kyc={kyc} showMissing scope="invest" locked={kyc.status === "APPROVED"} />
        </div>

        {["PENDING", "REJECTED"].includes(kyc.status) && onSectionDecision && (
          <KycAdminSectionReview
            kyc={kyc}
            busy={reviewBusy}
            onSectionDecision={onSectionDecision}
            onFinalApprove={onFinalApprove}
            onFinalReject={onFinalReject}
          />
        )}

        {!readOnly && kyc.status === "PENDING" && onApprove && !onSectionDecision && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button type="button" className="btn-gold text-sm" onClick={() => onApprove(kyc)}>
              Approve update
            </button>
            {onReject && (
              <button type="button" className="btn-outline text-sm text-rose-600" onClick={() => onReject(kyc)}>
                Reject update
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
