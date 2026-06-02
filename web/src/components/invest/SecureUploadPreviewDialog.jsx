import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchSecureUpload, openSecureUploadInTab } from "../../lib/secure-upload.js";

export default function SecureUploadPreviewDialog({
  open,
  onClose,
  url,
  title = "Document preview",
  scope = "invest",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open || !url) {
      setPreview((prev) => {
        if (prev?.blobUrl && !url?.startsWith?.("data:")) URL.revokeObjectURL(prev.blobUrl);
        return null;
      });
      setError("");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchSecureUpload(url, scope)
      .then((data) => {
        if (cancelled) {
          URL.revokeObjectURL(data.blobUrl);
          return;
        }
        setPreview((prev) => {
          if (prev?.blobUrl && prev.blobUrl !== data.blobUrl) URL.revokeObjectURL(prev.blobUrl);
          return data;
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load document");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, url, scope]);

  useEffect(
    () => () => {
      setPreview((prev) => {
        if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
        return null;
      });
    },
    []
  );

  if (!open || typeof document === "undefined") return null;

  const isImage = preview?.mimeType?.startsWith("image/");
  const isPdf = preview?.mimeType === "application/pdf";

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-foreground">{title}</h3>
            {preview?.filename && (
              <p className="truncate text-xs text-muted-foreground">{preview.filename}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
          {loading && <p className="text-sm text-muted-foreground">Loading document…</p>}
          {!loading && error && <p className="text-center text-sm text-red-500">{error}</p>}
          {!loading && !error && preview && isImage && (
            <img src={preview.blobUrl} alt={title} className="max-h-[65vh] max-w-full object-contain" />
          )}
          {!loading && !error && preview && isPdf && (
            <iframe title={title} src={preview.blobUrl} className="h-[65vh] w-full rounded border border-border bg-white" />
          )}
          {!loading && !error && preview && !isImage && !isPdf && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
              <button type="button" className="btn-outline text-sm" onClick={() => openSecureUploadInTab(url, scope)}>
                Download file
              </button>
            </div>
          )}
        </div>

        {preview && !loading && !error && (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <button type="button" className="btn-outline text-sm" onClick={() => openSecureUploadInTab(url, scope)}>
              Open in new tab
            </button>
            <button type="button" className="btn-gold text-sm" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
