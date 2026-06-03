import { Alert } from "../ui.jsx";
import {
  KYC_SECTIONS,
  KYC_SECTION_LABELS,
  parseSectionReviews,
  getRejectedSections,
  getApprovedSections,
} from "../../lib/kyc-sections.js";

function SectionChip({ sectionId, review }) {
  const status = review?.status || "PENDING";
  const colors = {
    APPROVED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    REJECTED: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[status] || colors.PENDING}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold">{KYC_SECTION_LABELS[sectionId]}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide">{status}</span>
      </div>
      {status === "REJECTED" && review?.remarks && (
        <p className="mt-2 text-xs leading-relaxed">Reason: {review.remarks}</p>
      )}
      {status === "APPROVED" && (
        <p className="mt-1 text-[10px] opacity-80">No changes needed for this section.</p>
      )}
    </div>
  );
}

/** Investor-facing sectional status after admin review */
export default function KycSectionOverview({ kyc }) {
  const reviews = parseSectionReviews(kyc);
  if (!reviews || kyc?.status !== "REJECTED") return null;

  const rejected = getRejectedSections(kyc);
  const approved = getApprovedSections(kyc);

  return (
    <div className="space-y-3">
      <Alert type="error">
        Some sections need correction. Update only the rejected parts below and resubmit. Approved sections stay as submitted.
      </Alert>
      {kyc.remarks && (
        <p className="text-xs text-muted-foreground">Overall note: {kyc.remarks}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {KYC_SECTIONS.map((id) => (
          <SectionChip key={id} sectionId={id} review={reviews[id]} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {rejected.length > 0 && `Please fix: ${rejected.map((id) => KYC_SECTION_LABELS[id]).join(", ")}.`}
        {approved.length > 0 && ` Already approved: ${approved.map((id) => KYC_SECTION_LABELS[id]).join(", ")}.`}
      </p>
    </div>
  );
}
