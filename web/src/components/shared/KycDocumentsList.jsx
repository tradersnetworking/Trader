import SecureUploadLink from "../invest/SecureUploadLink.jsx";
import { KYC_DOCUMENT_FIELDS, filenameFromUrl, sectionForDocumentKey } from "../../lib/kyc-document-fields.js";
import { KYC_SECTION_LABELS, documentReviewStatus, parseSectionReviews } from "../../lib/kyc-sections.js";

function sectionStatusClass(status) {
  if (status === "APPROVED") return "bg-emerald-500/15 text-emerald-600";
  if (status === "REJECTED") return "bg-rose-500/15 text-rose-600";
  return "bg-amber-500/15 text-amber-700";
}

/**
 * KYC document list — View (+ optional admin Approve / Reject per document).
 */
export default function KycDocumentsList({
  kyc,
  fields = KYC_DOCUMENT_FIELDS,
  showMissing = false,
  compact = false,
  scope = "invest",
  locked = false,
  adminReview = false,
  canReview = false,
  reviewBusyKey = null,
  onApproveDocument,
  onRejectDocument,
}) {
  const reviews = parseSectionReviews(kyc) || {};

  if (!kyc) return null;

  let rows = showMissing
    ? fields.map((f) => ({
        key: f.key,
        label: f.label,
        url: kyc[f.key] || null,
      }))
    : fields.filter((f) => kyc[f.key]).map((f) => ({
        key: f.key,
        label: f.label,
        url: kyc[f.key],
      }));

  if (kyc.signatureData && !rows.some((r) => r.key === "signature" && r.url)) {
    const sigRow = { key: "signatureData", label: "Signature (drawn)", url: kyc.signatureData };
    rows = showMissing ? [...rows, sigRow] : [...rows, sigRow];
  }

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>;
  }

  const showDocActions = adminReview && canReview && !locked && onApproveDocument && onRejectDocument;

  return (
    <div
      className={`divide-y divide-border rounded-lg border border-border bg-muted/30 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {rows.map((row) => {
        const sectionId = sectionForDocumentKey(row.key);
        const docStatus = documentReviewStatus(kyc, row.key);
        const sectionStatus = reviews[sectionId]?.status || "PENDING";
        const isDataUrl = row.url?.startsWith("data:");
        const rowBusy = reviewBusyKey === `doc:${row.key}`;
        const anyReviewBusy = reviewBusyKey != null;

        return (
          <div
            key={row.key}
            className={`flex flex-col gap-2 ${compact ? "px-3 py-2.5" : "px-3 py-3"}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{row.label}</p>
              {adminReview && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {KYC_SECTION_LABELS[sectionId]} ·{" "}
                  <span className={`rounded px-1.5 py-0.5 font-bold uppercase ${sectionStatusClass(docStatus)}`}>
                    {docStatus}
                  </span>
                  {sectionStatus !== docStatus && (
                    <span className="ml-1 text-muted-foreground/80">(section {sectionStatus.toLowerCase()})</span>
                  )}
                </p>
              )}
              {row.url && !isDataUrl ? (
                <p className="truncate text-[11px] text-muted-foreground" title={filenameFromUrl(row.url)}>
                  {filenameFromUrl(row.url)}
                </p>
              ) : row.url && isDataUrl ? (
                <p className="text-[11px] text-muted-foreground">Drawn signature on file</p>
              ) : (
                <p className="text-[11px] italic text-muted-foreground">Not uploaded</p>
              )}
              {locked && row.url && (
                <p className="text-[10px] text-amber-600">Approved — locked</p>
              )}
            </div>

            {row.url && (
              <div
                className={
                  showDocActions
                    ? "grid w-full grid-cols-3 gap-1.5"
                    : "flex w-full flex-wrap gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end"
                }
              >
                {isDataUrl ? (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline flex items-center justify-center px-2 py-2 text-xs font-semibold"
                  >
                    View
                  </a>
                ) : (
                  <SecureUploadLink
                    url={row.url}
                    previewTitle={row.label}
                    scope={scope}
                    className="btn-outline flex items-center justify-center px-2 py-2 text-xs font-semibold"
                  >
                    View
                  </SecureUploadLink>
                )}
                {showDocActions && (
                  <>
                    <button
                      type="button"
                      disabled={rowBusy || docStatus === "APPROVED"}
                      aria-busy={rowBusy}
                      className="btn-outline flex items-center justify-center px-2 py-2 text-xs font-semibold text-emerald-600 disabled:opacity-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (anyReviewBusy) return;
                        onApproveDocument(row.key);
                      }}
                    >
                      {rowBusy ? "Saving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="btn-outline flex items-center justify-center px-2 py-2 text-xs font-semibold text-rose-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (anyReviewBusy) return;
                        onRejectDocument(row.key, row.label);
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
