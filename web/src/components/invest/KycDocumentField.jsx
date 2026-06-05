import { useEffect, useId, useRef, useState } from "react";
import { KYC_ACCEPT_IMAGE, KYC_ACCEPT_DOCS, filenameFromUrl } from "../../lib/kyc-document-fields.js";
import { uploadKycDocument, deleteKycDocument, validateBeforeKycUpload } from "../../lib/kyc-upload.js";
import CameraCaptureModal from "./CameraCaptureModal.jsx";
import SecureUploadLink from "./SecureUploadLink.jsx";

/**
 * Per-document KYC upload with validation, compression, progress, retry, and preview.
 */
export default function KycDocumentField({
  label,
  hint,
  name,
  required,
  imageOnly = false,
  allowCamera = true,
  existingUrl,
  stagedUploads = {},
  onStaged,
  fileHashes = {},
  uploadDocument = uploadKycDocument,
  deleteDocument = deleteKycDocument,
}) {
  const staged = stagedUploads[name];
  const inputId = useId();
  const galleryRef = useRef(null);
  const [localErr, setLocalErr] = useState("");
  const [progress, setProgress] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const url = staged?.url || existingUrl;
  const failed = staged?.status === "FAILED";
  const isUploaded = Boolean(url && !failed);

  useEffect(() => {
    if (!url || !String(url).match(/\.(jpe?g|png|webp|gif)/i)) {
      setPreviewUrl(null);
      return undefined;
    }
    setPreviewUrl(url);
    return undefined;
  }, [url]);

  const runUpload = async (file) => {
    const preErr = validateBeforeKycUpload(file, { imageOnly });
    if (preErr) {
      setLocalErr(preErr);
      return;
    }
    setLocalErr("");
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadKycDocument(name, file, {
        onProgress: setProgress,
        knownHashes: fileHashes,
      });
      onStaged?.(name, res.upload, res.sha256);
      setProgress(100);
    } catch (e) {
      setLocalErr(e.message || "Upload failed");
      onStaged?.(name, { status: "FAILED", failReason: e.message, fieldKey: name }, null);
    } finally {
      setUploading(false);
      window.setTimeout(() => setProgress(null), 1200);
    }
  };

  const onGalleryChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) runUpload(f);
  };

  const remove = async () => {
    setLocalErr("");
    try {
      if (staged?.id || staged?.url) await deleteDocument(name);
    } catch (e) {
      setLocalErr(e.message);
      return;
    }
    onStaged?.(name, null, null);
  };

  const accept = imageOnly ? KYC_ACCEPT_IMAGE : KYC_ACCEPT_DOCS;

  return (
    <div
      data-testid={`kyc-field-${name}`}
      className={`rounded-xl border border-dashed p-4 ${
        failed ? "border-rose-500/50 bg-rose-500/5" : "border-border bg-muted/40"
      }`}
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {label}
            {required && <span className="text-rose-500"> *</span>}
          </p>
          {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
          <p className="mt-0.5 text-[10px] text-muted-foreground">JPG, JPEG, PNG, or PDF — max 10 MB</p>
        </div>
        {url && !failed && (
          <span className="badge shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Uploaded</span>
        )}
        {failed && <span className="badge shrink-0 bg-rose-500/15 text-rose-600">Failed</span>}
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="" className="mb-3 h-28 w-28 rounded-lg border border-border object-cover" />
      )}

      {url && !previewUrl && (
        <p className="mb-2 truncate text-xs text-muted-foreground">
          {staged?.sizeBytes ? `${Math.round(staged.sizeBytes / 1024)} KB — ` : ""}
          {filenameFromUrl(url)}
        </p>
      )}

      {url && (
        <div className="mb-2">
          <SecureUploadLink url={url} className="text-xs font-semibold text-accent-tone underline">
            View uploaded file
          </SecureUploadLink>
        </div>
      )}

      {progress != null && (
        <div className="mb-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {uploading ? `Uploading… ${progress}%` : progress === 100 ? "Saved — you can leave and continue later" : ""}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-testid={`kyc-upload-btn-${name}`}
          className="btn-outline w-full text-sm sm:w-auto"
          disabled={uploading}
          onClick={() => galleryRef.current?.click()}
        >
          {url ? "Replace file" : imageOnly ? "Upload photo" : "Upload file"}
        </button>
        {allowCamera && imageOnly && (
          <button
            type="button"
            className="btn-gold w-full text-sm sm:w-auto"
            disabled={uploading}
            onClick={() => setCameraOpen(true)}
          >
            Open camera
          </button>
        )}
        {url && (
          <button type="button" className="btn-outline w-full text-sm text-rose-600 sm:w-auto" disabled={uploading} onClick={remove}>
            Remove
          </button>
        )}
      </div>

      <input id={inputId} ref={galleryRef} type="file" accept={accept} className="sr-only" onChange={onGalleryChange} />

      {(localErr || staged?.failReason) && (
        <p className="mt-2 text-[11px] font-medium text-rose-500">{localErr || staged.failReason}</p>
      )}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={runUpload}
        title={label || "Take photo"}
        defaultFacing={name === "selfie" ? "user" : "environment"}
        hint={
          name === "selfie"
            ? "Use front camera with your ID beside your face."
            : "Capture a clear photo of your document."
        }
      />
    </div>
  );
}
