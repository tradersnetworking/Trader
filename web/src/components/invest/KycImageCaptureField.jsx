import { useEffect, useId, useRef, useState } from "react";
import { KYC_ACCEPT_IMAGE, KYC_ACCEPT_DOCS, validateKycFile, filenameFromUrl } from "../../lib/kyc-document-fields.js";
import CameraCaptureModal from "./CameraCaptureModal.jsx";

/**
 * Image upload with optional live camera (selfie verification).
 */
export default function KycImageCaptureField({
  label,
  hint,
  name,
  required,
  files,
  setFiles,
  existingUrl,
  allowCamera = true,
  imageOnly = false,
  accept = imageOnly ? KYC_ACCEPT_IMAGE : KYC_ACCEPT_DOCS,
}) {
  const inputId = useId();
  const galleryRef = useRef(null);
  const [localErr, setLocalErr] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const file = files[name];

  useEffect(() => {
    if (!file?.type?.startsWith("image/")) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const applyFile = (f) => {
    if (!f) return;
    const err = validateKycFile(f, { imageOnly });
    if (err) {
      setLocalErr(err);
      return;
    }
    setLocalErr("");
    setFiles((prev) => ({ ...prev, [name]: f }));
  };

  const onGalleryChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    applyFile(f);
  };

  const clearFile = () => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setLocalErr("");
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {label}
            {required && <span className="text-rose-500"> *</span>}
          </p>
          {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        {existingUrl && !file && (
          <span className="badge shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Uploaded</span>
        )}
      </div>

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          className="mb-3 h-28 w-28 rounded-lg border border-border object-cover"
        />
      )}

      {file && !previewUrl && (
        <p className="mb-2 truncate text-xs text-muted-foreground">{file.name}</p>
      )}

      {existingUrl && !file && (
        <p className="mb-2 truncate text-[11px] text-muted-foreground">Current: {filenameFromUrl(existingUrl)}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="btn-outline w-full text-sm sm:w-auto"
          onClick={() => galleryRef.current?.click()}
        >
          {imageOnly ? "Upload photo" : "Upload file"}
        </button>
        {allowCamera && (
          <button type="button" className="btn-gold w-full text-sm sm:w-auto" onClick={() => setCameraOpen(true)}>
            Open camera
          </button>
        )}
        {file && (
          <button type="button" className="btn-outline w-full text-sm text-rose-600 sm:w-auto" onClick={clearFile}>
            Remove
          </button>
        )}
      </div>

      <input
        id={inputId}
        ref={galleryRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onGalleryChange}
      />

      {localErr && <p className="mt-2 text-[11px] text-rose-500">{localErr}</p>}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={applyFile}
        onGalleryFallback={() => galleryRef.current?.click()}
        title={label || "Take photo"}
        defaultFacing={name === "selfie" ? "user" : "environment"}
        hint={
          name === "selfie"
            ? "Use front camera with your ID beside your face, or flip to the back camera if needed."
            : "Flip between front and back camera to capture a clear photo of your document."
        }
      />
    </div>
  );
}
