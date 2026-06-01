import { useEffect, useState } from "react";
import { Modal } from "../ui.jsx";
import { fetchAgreementPdfBlob } from "../../lib/agreements-api.js";

export default function AgreementPdfViewDialog({ agreementId, agreementUid, admin = false, open, onClose, allowDownload = true }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !agreementId) return;
    let objectUrl;
    setLoading(true);
    setErr("");
    fetchAgreementPdfBlob(agreementId, { admin })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [open, agreementId, admin]);

  const download = async () => {
    if (!allowDownload && !admin) return;
    try {
      const blob = await fetchAgreementPdfBlob(agreementId, { download: true, admin });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${agreementUid || "agreement"}.pdf`;
      a.click();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Agreement PDF — ${agreementUid || ""}`} wide>
      {loading && <p className="text-sm text-muted-foreground">Loading PDF…</p>}
      {err && <p className="text-sm text-red-500">{err}</p>}
      {url && (
        <iframe title="Agreement PDF" src={url} className="h-[70vh] w-full rounded-lg border" />
      )}
      {!allowDownload && !admin && url && (
        <p className="mt-2 text-xs text-muted-foreground">View-only mode — download is disabled for investors.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {(allowDownload || admin) && (
          <button type="button" className="btn-gold text-sm" onClick={download}>Download PDF</button>
        )}
        <button type="button" className="btn-outline text-sm" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
