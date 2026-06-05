import { KYC_DOCUMENT_FIELDS } from "../../lib/kyc-document-fields.js";

/** Shows how many KYC documents are already uploaded when user resumes. */
export default function KycUploadResumeBar({ stagedUploads = {}, kyc, stepLabel }) {
  const keys = KYC_DOCUMENT_FIELDS.map((f) => f.key);
  const done = keys.filter((key) => {
    const s = stagedUploads[key];
    if (s?.url && s.status !== "FAILED") return true;
    return Boolean(kyc?.[key]);
  });
  const total = keys.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  if (done.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        {stepLabel ? `${stepLabel}: ` : ""}
        {done.length} of {total} documents saved ({pct}%)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your previous uploads are shown below. Use <strong>View</strong> to preview, <strong>Replace</strong> or <strong>Modify</strong> to change a file.
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
