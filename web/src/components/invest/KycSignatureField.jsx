import { useEffect, useId, useRef, useState } from "react";
import SignaturePad from "./SignaturePad.jsx";
import CameraCaptureModal from "./CameraCaptureModal.jsx";
import { validateSignatureBase64 } from "../../lib/signatureQuality.js";
import { KYC_ACCEPT_DOCS, validateKycFile } from "../../lib/kyc-document-fields.js";

const SIGNATURE_MODES = [
  { id: "draw", label: "Draw signature", hint: "Use your finger or mouse on the pad below" },
  { id: "upload", label: "Upload file", hint: "Choose JPG, PNG, or PDF from your device" },
  { id: "camera", label: "Open camera", hint: "Take a photo of your signature on white paper" },
];

/** KYC signature: draw, upload file, or capture with camera — one mode at a time. */
export default function KycSignatureField({
  signatureMode,
  setSignatureMode,
  signatureData,
  setSignatureData,
  signatureFile,
  setSignatureFile,
  existingUrl,
}) {
  const uploadId = useId();
  const uploadRef = useRef(null);
  const [sigErr, setSigErr] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearUploadPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const applyFile = (f) => {
    if (!f) return;
    const err = validateKycFile(f, { imageOnly: false });
    if (err) {
      setSigErr(err);
      return;
    }
    setSigErr("");
    setSignatureFile(f);
    setSignatureData(null);
    if (f.type?.startsWith("image/")) {
      clearUploadPreview();
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      clearUploadPreview();
    }
  };

  const onDraw = (data) => {
    setSignatureData(data);
    setSignatureFile(null);
    clearUploadPreview();
    setSigErr(data ? validateSignatureBase64(data) : "");
  };

  const switchMode = (mode) => {
    setSignatureMode(mode);
    setSigErr("");
  };

  const active = SIGNATURE_MODES.find((m) => m.id === signatureMode) || SIGNATURE_MODES[0];

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
      <div>
        <p className="text-sm font-bold text-foreground">Your signature *</p>
        <p className="text-xs text-muted-foreground">
          Required for KYC and agreements. Pick one way to add your signature — you can switch anytime before submitting.
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="tablist"
        aria-label="How to add your signature"
      >
        {SIGNATURE_MODES.map((m) => {
          const selected = signatureMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-muted/80"
              }`}
              onClick={() => switchMode(m.id)}
            >
              <span className={`block text-xs font-bold ${selected ? "text-accent-tone" : "text-foreground"}`}>
                {m.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{m.hint}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] font-medium text-muted-foreground">
        Selected: <span className="text-foreground">{active.label}</span>
      </p>

      {signatureMode === "draw" && (
        <div role="tabpanel" className="space-y-2">
          <SignaturePad onChange={onDraw} />
          {signatureData && !sigErr && (
            <p className="text-xs text-emerald-600">Signature captured on pad.</p>
          )}
        </div>
      )}

      {signatureMode === "upload" && (
        <div role="tabpanel" className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Signature preview"
              className="h-28 max-w-full rounded-lg border border-border object-contain"
            />
          )}
          {signatureFile && !previewUrl && (
            <p className="text-xs text-muted-foreground">Selected: {signatureFile.name}</p>
          )}
          {existingUrl && !signatureFile && (
            <p className="text-[11px] text-muted-foreground">Previously uploaded signature on file.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn-outline w-full text-sm sm:w-auto"
              onClick={() => uploadRef.current?.click()}
            >
              Choose file from device
            </button>
            {signatureFile && (
              <button
                type="button"
                className="btn-outline w-full text-sm text-rose-600 sm:w-auto"
                onClick={() => {
                  setSignatureFile(null);
                  clearUploadPreview();
                }}
              >
                Remove file
              </button>
            )}
          </div>
          <input
            id={uploadId}
            ref={uploadRef}
            type="file"
            accept={KYC_ACCEPT_DOCS}
            className="sr-only"
            onChange={(e) => {
              applyFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {signatureMode === "camera" && (
        <div role="tabpanel" className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Signature preview"
              className="h-28 max-w-full rounded-lg border border-border object-contain"
            />
          )}
          {signatureFile && (
            <p className="text-xs text-emerald-600">Photo captured: {signatureFile.name}</p>
          )}
          {existingUrl && !signatureFile && (
            <p className="text-[11px] text-muted-foreground">Previously uploaded signature on file.</p>
          )}
          <button type="button" className="btn-gold w-full text-sm sm:w-auto" onClick={() => setCameraOpen(true)}>
            Open camera to capture signature
          </button>
          {signatureFile && (
            <button
              type="button"
              className="btn-outline w-full text-sm text-rose-600 sm:w-auto"
              onClick={() => {
                setSignatureFile(null);
                clearUploadPreview();
              }}
            >
              Retake / remove photo
            </button>
          )}
          <CameraCaptureModal
            open={cameraOpen}
            onClose={() => setCameraOpen(false)}
            onCapture={(f) => {
              applyFile(f);
              setCameraOpen(false);
            }}
            title="Capture signature"
            defaultFacing="environment"
            hint="Flip to the camera that works best for photographing your signature on white paper."
          />
        </div>
      )}

      {sigErr && <p className="text-xs font-semibold text-rose-600">{sigErr}</p>}
    </div>
  );
}
