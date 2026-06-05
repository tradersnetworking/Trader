import { useEffect, useId, useRef, useState } from "react";
import SignaturePad from "./SignaturePad.jsx";
import CameraCaptureModal from "./CameraCaptureModal.jsx";
import { Modal } from "../ui.jsx";
import { validateSignatureBase64 } from "../../lib/signatureQuality.js";
import { KYC_ACCEPT_DOCS, validateKycFile } from "../../lib/kyc-document-fields.js";

const SIGNATURE_MODES = [
  { id: "draw", label: "Draw signature", hint: "Tap Open for a full-screen pad, then Confirm" },
  { id: "upload", label: "Upload file", hint: "Choose JPG, PNG, or PDF from your device" },
  { id: "camera", label: "Camera", hint: "Photo of signature on white paper" },
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
  const [drawPadOpen, setDrawPadOpen] = useState(false);
  const [draftDraw, setDraftDraw] = useState(null);
  const drawPadRef = useRef(null);

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

  const clearDrawnSignature = () => {
    setSignatureData(null);
    setDraftDraw(null);
    setSigErr("");
    drawPadRef.current?.clear();
  };

  const openDrawPad = () => {
    setDraftDraw(signatureData);
    setSigErr("");
    setDrawPadOpen(true);
  };

  const confirmDrawPad = () => {
    const data = draftDraw || drawPadRef.current?.getDataUrl?.();
    const err = validateSignatureBase64(data);
    if (err) {
      setSigErr(err);
      return;
    }
    onDraw(data);
    setDrawPadOpen(false);
    setSigErr("");
  };

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
        <div role="tabpanel" className="space-y-3">
          <div className="rounded-lg border border-dashed border-border bg-[#0a1628] p-2">
            {signatureData ? (
              <img
                src={signatureData}
                alt="Your signature"
                className="mx-auto h-24 max-w-full object-contain"
              />
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No signature yet — tap Open to sign
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-outline w-full text-sm font-semibold"
              onClick={clearDrawnSignature}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn-gold w-full text-sm font-semibold shadow-sm"
              onClick={openDrawPad}
            >
              Open
            </button>
          </div>
          {signatureData && !sigErr && (
            <p className="text-center text-xs text-emerald-600">Signature saved. Tap Open to change.</p>
          )}

          <Modal
            open={drawPadOpen}
            onClose={() => setDrawPadOpen(false)}
            title="Draw your signature"
            wide
          >
            <p className="mb-3 text-xs text-muted-foreground">
              Sign with your finger or stylus. Use Clear to start over, then Confirm when finished.
            </p>
            <SignaturePad
              key={drawPadOpen ? `pad-${signatureData || "new"}` : "pad-closed"}
              ref={drawPadRef}
              width={560}
              height={260}
              showClear={false}
              initialDataUrl={signatureData}
              onChange={setDraftDraw}
              className="[&_canvas]:min-h-[min(50vh,260px)]"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-outline w-full text-sm font-semibold"
                onClick={() => {
                  drawPadRef.current?.clear();
                  setDraftDraw(null);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn-gold w-full text-sm font-semibold shadow-sm"
                onClick={confirmDrawPad}
              >
                Confirm
              </button>
            </div>
          </Modal>
        </div>
      )}

      {signatureMode === "upload" && (
        <div role="tabpanel" className="min-w-0 rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
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
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn-gold btn-block w-full text-sm font-semibold shadow-sm"
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
        <div role="tabpanel" className="min-w-0 rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
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
          <button
            type="button"
            className="btn-gold btn-block w-full text-sm font-semibold shadow-sm"
            onClick={() => setCameraOpen(true)}
          >
            Open camera
          </button>
          <p className="text-center text-[10px] text-muted-foreground">Flip front/back camera inside the capture screen</p>
          {signatureFile && (
            <button
              type="button"
              className="btn-outline btn-block w-full text-sm text-rose-600"
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
            onGalleryFallback={() => uploadRef.current?.click()}
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
