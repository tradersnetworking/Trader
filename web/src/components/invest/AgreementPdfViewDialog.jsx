import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui.jsx";
import {
  fetchAgreementPdfBlob,
  fetchAgreementPdfViewUrl,
  openAgreementPdfInNewTab,
} from "../../lib/agreements-api.js";

/**
 * Agreement PDF viewer: short-lived view URL in iframe (works without blob: quirks),
 * with blob fallback for download.
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
  const [iframeSrc, setIframeSrc] = useState(null);
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

  const revokeBlobSrc = (src) => {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
  };

  useEffect(() => {
    if (!open) {
      setIframeSrc((prev) => {
        revokeBlobSrc(prev);
        return null;
      });
      setErr("");
      return undefined;
    }

    if (!key) {
      setErr("No agreement selected");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setErr("");
    setIframeSrc(null);

    const load = async () => {
      try {
        const viewUrl = await fetchAgreementPdfViewUrl(key, { admin });
        if (cancelled) return;
        setIframeSrc(viewUrl);
      } catch (urlErr) {
        if (!fetchBlobRef.current) throw urlErr;
        const blob = await fetchBlobRef.current();
        if (cancelled) return;
        setIframeSrc(URL.createObjectURL(blob));
      }
    };

    load()
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
      setIframeSrc((prev) => {
        revokeBlobSrc(prev);
        return null;
      });
    },
    []
  );

  const download = async () => {
    try {
      let blob;
      if (fetchBlobRef.current) {
        blob = await fetchBlobRef.current();
      } else if (agreementId) {
        blob = await fetchAgreementPdfBlob(agreementId, { admin, download: true });
      } else {
        return;
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
    if (!key) return;
    setLoading(true);
    setErr("");
    setIframeSrc(null);
    fetchAgreementPdfViewUrl(key, { admin })
      .then((viewUrl) => setIframeSrc(viewUrl))
      .catch(async () => {
        if (!fetchBlobRef.current) throw new Error("Could not load PDF");
        const blob = await fetchBlobRef.current();
        setIframeSrc(URL.createObjectURL(blob));
      })
      .catch((e) => setErr(e.message || "Could not load PDF"))
      .finally(() => setLoading(false));
  };

  const previewSrc = iframeSrc;

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
              <button type="button" className="btn-outline text-sm" onClick={retry}>
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
        {previewSrc && !loading && !err && (
          previewSrc.startsWith("blob:") ? (
            <object
              data={previewSrc}
              type="application/pdf"
              className="h-[70vh] w-full rounded-lg bg-white"
              aria-label={displayTitle}
            >
              <embed src={previewSrc} type="application/pdf" className="h-[70vh] w-full" />
              <p className="p-4 text-center text-sm text-muted-foreground">
                PDF preview is not supported in this browser.{" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline"
                  onClick={() => agreementId && openAgreementPdfInNewTab(agreementId, { admin })}
                >
                  Open PDF
                </button>
              </p>
            </object>
          ) : (
            <iframe
              title={displayTitle}
              src={previewSrc}
              className="h-[70vh] w-full rounded-lg border-0 bg-white"
            />
          )
        )}
      </div>
      {!allowDownload && !admin && previewSrc && (
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
        {(allowDownload || admin) && agreementId && (
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
