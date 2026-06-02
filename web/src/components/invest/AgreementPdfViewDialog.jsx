import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui.jsx";
import { fetchAgreementPdfBlob } from "../../lib/agreements-api.js";
import InlinePdfViewer from "./InlinePdfViewer.jsx";

/**
 * Agreement PDF viewer — renders inside the modal via PDF.js (no new tab).
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
  agreementId,
  agreementUid,
}) {
  const [pdfBlob, setPdfBlob] = useState(null);
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
      setPdfBlob(null);
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
    setPdfBlob(null);

    fetchBlobRef
      .current()
      .then((blob) => {
        if (!cancelled) setPdfBlob(blob);
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

  const download = async () => {
    try {
      let blob = pdfBlob;
      if (!blob) {
        if (!fetchBlobRef.current) return;
        blob = await fetchBlobRef.current();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = dlName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setErr(e.message || "Download failed");
    }
  };

  const retry = () => {
    if (!fetchBlobRef.current || !key) return;
    setLoading(true);
    setErr("");
    setPdfBlob(null);
    fetchBlobRef
      .current()
      .then(setPdfBlob)
      .catch((e) => setErr(e.message || "Could not load PDF"))
      .finally(() => setLoading(false));
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
            <button type="button" className="btn-outline text-sm" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {pdfBlob && !loading && !err && <InlinePdfViewer blob={pdfBlob} />}
      </div>
      {!allowDownload && !admin && pdfBlob && (
        <p className="mt-2 text-xs text-muted-foreground">View-only mode — download is disabled for investors.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {(allowDownload || admin) && pdfBlob && (
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
