import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui.jsx";
import { fetchAgreementPdfBlob, openAgreementPdfInNewTab } from "../../lib/agreements-api.js";

/**
 * Kuber-style agreement viewer: stable fetch via ref, blob URL + iframe.
 * Pass fetchBlob from parent to avoid effect dependency loops.
 */
export default function AgreementPdfViewDialog({
  open,
  onClose,
  title,
  subtitle,
  documentKey,
  fetchBlob,
  downloadFilename,
  allowDownload = true,
  admin = false,
  /** Legacy props */
  agreementId,
  agreementUid,
}) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchBlobRef = useRef(fetchBlob);
  fetchBlobRef.current =
    fetchBlob ||
    (agreementId
      ? () => fetchAgreementPdfBlob(agreementId, { admin })
      : null);

  const displayTitle = title || `Agreement — ${agreementUid || "PDF"}`;
  const dlName = downloadFilename || `${agreementUid || "agreement"}.pdf`;
  const key = documentKey ?? agreementId;

  useEffect(() => {
    if (!open) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setErr("");
      return undefined;
    }

    if (!fetchBlobRef.current || !key) {
      setErr("No agreement selected");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setErr("");

    fetchBlobRef
      .current()
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || "Could not load agreement PDF");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, key, admin]);

  useEffect(
    () => () => {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    []
  );

  const download = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = dlName;
    a.click();
  };

  return (
    <Modal open={open} onClose={onClose} title={displayTitle} wide>
      {subtitle && <p className="-mt-2 mb-3 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="relative min-h-[50vh] rounded-lg border border-border bg-muted/20">
        {loading && (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
            Loading agreement PDF…
          </div>
        )}
        {err && !loading && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-red-500">{err}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="btn-outline text-sm"
                onClick={() => {
                  if (!fetchBlobRef.current || !key) return;
                  setLoading(true);
                  setErr("");
                  fetchBlobRef
                    .current()
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      setPdfUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return url;
                      });
                    })
                    .catch((e) => setErr(e.message || "Could not load PDF"))
                    .finally(() => setLoading(false));
                }}
              >
                Retry
              </button>
              {agreementId && (
                <button
                  type="button"
                  className="btn-gold text-sm"
                  onClick={() => openAgreementPdfInNewTab(agreementId, { admin }).catch((e) => setErr(e.message))}
                >
                  Open in new tab
                </button>
              )}
            </div>
          </div>
        )}
        {pdfUrl && !loading && !err && (
          <iframe title={displayTitle} src={pdfUrl} className="h-[70vh] w-full rounded-lg border-0 bg-white" />
        )}
      </div>
      {!allowDownload && !admin && pdfUrl && (
        <p className="mt-2 text-xs text-muted-foreground">View-only mode — download is disabled for investors.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {agreementId && (
          <button
            type="button"
            className="btn-outline text-sm"
            onClick={() => openAgreementPdfInNewTab(agreementId, { admin }).catch((e) => setErr(e.message))}
          >
            Open in new tab
          </button>
        )}
        {(allowDownload || admin) && pdfUrl && (
          <button type="button" className="btn-gold text-sm" onClick={download}>
            Download PDF
          </button>
        )}
        <button type="button" className="btn-outline text-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
