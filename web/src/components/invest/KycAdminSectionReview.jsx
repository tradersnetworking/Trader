import { useState } from "react";
import { Alert } from "../ui.jsx";
import {
  KYC_SECTIONS,
  KYC_SECTION_LABELS,
  parseSectionReviews,
} from "../../lib/kyc-sections.js";
import KycRejectReasonDialog from "./KycRejectReasonDialog.jsx";

const SECTION_HINTS = {
  personal: "Name, DOB, contact, full address",
  identity: "PAN, Aadhaar, photo, ID document uploads",
  banking: "Bank name, account, IFSC, cancelled cheque / passbook / statement",
  signature: "Drawn or uploaded signature — must be clear",
};

export default function KycAdminSectionReview({
  kyc,
  onSectionDecision,
  onFinalApprove,
  onFinalReject,
  reviewBusyKey = null,
}) {
  const reviews = parseSectionReviews(kyc) || {};
  const [rejectDialog, setRejectDialog] = useState(null);
  const canReview = ["PENDING", "REJECTED"].includes(kyc?.status);

  const act = async (section, status, remarks) => {
    await onSectionDecision?.(kyc.id, section, status, remarks);
    setRejectDialog(null);
  };

  const allApproved = KYC_SECTIONS.every((id) => reviews[id]?.status === "APPROVED");
  const anyReviewBusy = reviewBusyKey != null;
  const finalBusy = reviewBusyKey === "final";

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <h4 className="text-sm font-bold text-foreground">Section review</h4>
      <p className="text-xs text-muted-foreground">
        Approve or reject each part separately. When all four are approved, use final approval. Rejecting a section
        requires a written reason shown to the investor.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {KYC_SECTIONS.map((id) => {
          const r = reviews[id] || { status: "PENDING" };
          const status = r.status || "PENDING";
          const sectionBusy = reviewBusyKey === `section:${id}`;
          return (
            <div key={id} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{KYC_SECTION_LABELS[id]}</div>
                  <div className="text-[10px] text-muted-foreground">{SECTION_HINTS[id]}</div>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    status === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : status === "REJECTED"
                        ? "bg-rose-500/15 text-rose-600"
                        : "bg-amber-500/15 text-amber-700"
                  }`}
                >
                  {status}
                </span>
              </div>
              {r.remarks && status === "REJECTED" && (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">Reason: {r.remarks}</p>
              )}
              {canReview && (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={sectionBusy}
                    aria-busy={sectionBusy}
                    className="btn-outline px-2 py-2 text-xs font-semibold text-emerald-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (anyReviewBusy) return;
                      act(id, "APPROVED");
                    }}
                  >
                    {sectionBusy ? "Saving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn-outline px-2 py-2 text-xs font-semibold text-rose-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (anyReviewBusy) return;
                      setRejectDialog({
                        type: "section",
                        section: id,
                        title: `Reject — ${KYC_SECTION_LABELS[id]}`,
                        subtitle: "This reason is shown to the investor on their dashboard and KYC page.",
                      });
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canReview && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Final decision</p>
          {!allApproved && (
            <Alert type="info">Approve all four sections before final approval.</Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={finalBusy || !allApproved}
              aria-busy={finalBusy}
              className="btn-gold text-sm disabled:opacity-50"
              onClick={() => {
                if (anyReviewBusy) return;
                onFinalApprove?.(kyc);
              }}
            >
              {finalBusy ? "Saving…" : "Final approve KYC"}
            </button>
            <button
              type="button"
              className="btn-outline text-sm text-rose-600"
              onClick={() => {
                if (anyReviewBusy) return;
                setRejectDialog({
                  type: "final",
                  title: "Final reject — entire application",
                  subtitle:
                    "Use when the whole KYC must be redone or is invalid. The investor will see this reason on Home and KYC.",
                });
              }}
            >
              Final reject…
            </button>
          </div>
        </div>
      )}

      <KycRejectReasonDialog
        open={Boolean(rejectDialog)}
        title={rejectDialog?.title}
        subtitle={rejectDialog?.subtitle}
        busy={
          rejectDialog?.type === "section"
            ? reviewBusyKey === `section:${rejectDialog.section}`
            : rejectDialog?.type === "final"
              ? finalBusy
              : false
        }
        onClose={() => setRejectDialog(null)}
        onConfirm={(remarks) => {
          if (rejectDialog?.type === "section") {
            return act(rejectDialog.section, "REJECTED", remarks);
          }
          return onFinalReject?.(kyc, remarks);
        }}
      />
    </div>
  );
}
