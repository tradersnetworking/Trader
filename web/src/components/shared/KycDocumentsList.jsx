import { useState } from "react";
import SecureUploadLink from "../invest/SecureUploadLink.jsx";
import { KYC_DOCUMENT_FIELDS, filenameFromUrl } from "../../lib/kyc-document-fields.js";
import { fetchSecureUpload, openSecureUploadInTab } from "../../lib/secure-upload.js";

function DownloadDocButton({ url, label, scope, compact }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const download = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await fetchSecureUpload(url, scope);
      const a = document.createElement("a");
      a.href = data.blobUrl;
      a.download = data.filename || filenameFromUrl(url) || label;
      a.click();
      setTimeout(() => URL.revokeObjectURL(data.blobUrl), 60_000);
    } catch (e) {
      setErr(e.message || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={`btn-outline shrink-0 ${compact ? "px-2 py-1 text-xs" : "text-xs"}`}
        disabled={busy}
        onClick={download}
      >
        {busy ? "…" : "Download"}
      </button>
      {err && <span className="text-[10px] text-rose-500">{err}</span>}
    </div>
  );
}

/**
 * Kuber-style KYC document list with View + Download per upload.
 */
export default function KycDocumentsList({
  kyc,
  fields = KYC_DOCUMENT_FIELDS,
  showMissing = false,
  compact = false,
  scope = "invest",
  locked = false,
}) {
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

  return (
    <div
      className={`divide-y divide-border rounded-lg border border-border bg-muted/30 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {rows.map((row) => (
        <div
          key={row.key}
          className={`flex items-center justify-between gap-3 ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">{row.label}</p>
            {row.url ? (
              <p className="truncate text-[11px] text-muted-foreground" title={filenameFromUrl(row.url)}>
                {filenameFromUrl(row.url)}
              </p>
            ) : (
              <p className="text-[11px] italic text-muted-foreground">Not uploaded</p>
            )}
            {locked && row.url && (
              <p className="text-[10px] text-amber-600">Approved — locked</p>
            )}
          </div>
          {row.url && (
            <div className="flex shrink-0 items-center gap-1.5">
              <SecureUploadLink url={row.url} previewTitle={row.label} scope={scope} className="btn-outline text-xs">
                View
              </SecureUploadLink>
              <button
                type="button"
                className="btn-outline text-xs"
                onClick={() => openSecureUploadInTab(row.url, scope)}
              >
                Open
              </button>
              <DownloadDocButton url={row.url} label={row.label} scope={scope} compact={compact} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
