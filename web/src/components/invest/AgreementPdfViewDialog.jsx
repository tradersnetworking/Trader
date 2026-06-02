import { useEffect, useState } from "react";
import { Modal } from "../ui.jsx";
import { fetchAgreementPdfBlob } from "../../lib/agreements-api.js";

export default function AgreementPdfViewDialog({
  agreementId,
  agreementUid,
  admin = false,
  open,
  onClose,
  allowDownload = true,
}) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPdf = () => {
    if (!agreementId) return;
    setLoading(true);
    setErr("");
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    fetchAgreementPdfBlob(agreementId, { admin })
      .then((blob) => {
        if (!blob?.size) throw new Error("Agreement PDF is empty. Try again or contact support.");
        if (blob.type && !blob.type.includes("pdf") && !blob.type.includes("octet-stream")) {
          throw new Error("Could not load agreement PDF. Please sign in again and retry.");
        }
        setUrl(URL.createObjectURL(blob));
      })
      .catch((e) => setErr(e.message || "Could not load PDF"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !agreementId) return undefined;
    loadPdf();
    return () => {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when dialog opens
  }, [open, agreementId, admin]);

  const openInNewTab = async () => {
    try {
      const blob = await fetchAgreementPdfBlob(agreementId, { admin });
      const tabUrl = URL.createObjectURL(blob);
      window.open(tabUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(tabUrl), 60_000);
    } catch (e) {
      setErr(e.message);
    }
  };

  const download = async () => {
    if (!allowDownload && !admin) return;
    try {
      const blob = await fetchAgreementPdfBlob(agreementId, { download: true, admin });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${agreementUid || "agreement"}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Agreement — ${agreementUid || "PDF"}`} wide>
      {loading && <p className="text-sm text-muted-foreground">Loading agreement PDF…</p>}
      {err && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{err}</p>
          <button type="button" className="btn-outline text-sm" onClick={loadPdf}>
            Retry
          </button>
        </div>
      )}
      {url && !loading && (
        <div className="min-h-[50vh] rounded-lg border border-border bg-muted/20">
          <iframe title="Agreement PDF" src={url} className="h-[70vh] w-full rounded-lg" />
          <object data={url} type="application/pdf" className="hidden h-0 w-0" aria-hidden>
            PDF preview unavailable in this browser.
          </object>
        </div>
      )}
      {!allowDownload && !admin && url && (
        <p className="mt-2 text-xs text-muted-foreground">View-only mode — download is disabled for investors.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {url && (
          <button type="button" className="btn-outline text-sm" onClick={openInNewTab}>
            Open in new tab
          </button>
        )}
        {(allowDownload || admin) && (
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
