import { useState } from "react";
import { Badge, Modal } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import KycAdminSectionReview from "./KycAdminSectionReview.jsx";
import KycRejectReasonDialog from "./KycRejectReasonDialog.jsx";
import { KYC_DETAIL_FIELDS } from "../../lib/kyc-detail-display.js";
import { KYC_SECTION_LABELS } from "../../lib/kyc-sections.js";

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
  const [docReject, setDocReject] = useState(null);

  if (!kyc) return null;

  const title = investorTitle || kyc.fullName || kyc.investor?.name || "Investor";
  const modalTitle = readOnly ? `Submitted KYC — ${title}` : `Review KYC — ${title}`;
  const canReview = !readOnly && ["PENDING", "REJECTED"].includes(kyc.status) && onSectionDecision;

  const approveSection = (sectionId) => onSectionDecision?.(kyc.id, sectionId, "APPROVED");

  const confirmDocReject = async (remarks) => {
    if (!docReject) return;
    await onSectionDecision?.(kyc.id, docReject.section, "REJECTED", remarks);
    setDocReject(null);
  };

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

        {canReview && (
          <KycAdminSectionReview
            kyc={kyc}
            busy={reviewBusy}
            onSectionDecision={onSectionDecision}
            onFinalApprove={onFinalApprove}
            onFinalReject={onFinalReject}
          />
        )}

        <div>
          <h4 className="mb-2 text-sm font-bold text-foreground">Uploaded documents</h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Use <strong>View</strong> to preview each file. <strong>Approve</strong> or <strong>Reject</strong> updates
            that document&apos;s KYC section for the investor.
          </p>
          <KycDocumentsList
            kyc={kyc}
            showMissing
            scope="invest"
            locked={kyc.status === "APPROVED"}
            adminReview={canReview}
            canReview={canReview}
            reviewBusy={reviewBusy}
            onApproveSection={approveSection}
            onRejectSection={(section, docLabel) =>
              setDocReject({
                section,
                title: `Reject — ${docLabel}`,
                subtitle: `This rejects the "${KYC_SECTION_LABELS[section]}" section. Reason is shown to the investor.`,
              })
            }
          />
        </div>

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

      <KycRejectReasonDialog
        open={Boolean(docReject)}
        title={docReject?.title}
        subtitle={docReject?.subtitle}
        busy={reviewBusy}
        onClose={() => setDocReject(null)}
        onConfirm={confirmDocReject}
      />
    </Modal>
  );
}
