import { useState } from "react";
import SignaturePad from "./SignaturePad.jsx";
import KycImageCaptureField from "./KycImageCaptureField.jsx";
import { validateSignatureBase64 } from "../../lib/signatureQuality.js";
import { KYC_ACCEPT_DOCS } from "../../lib/kyc-document-fields.js";

/** KYC signature: draw on pad OR upload/capture image (camera supported). */
export default function KycSignatureField({
  signatureMode,
  setSignatureMode,
  signatureData,
  setSignatureData,
  signatureFile,
  setSignatureFile,
  existingUrl,
}) {
  const [sigErr, setSigErr] = useState("");
  const [captureFiles, setCaptureFiles] = useState({});

  const onDraw = (data) => {
    setSignatureData(data);
    setSignatureFile(null);
    setCaptureFiles({});
    setSigErr(data ? validateSignatureBase64(data) : "");
  };

  const onCaptureFile = (f) => {
    if (!f) return;
    setSignatureFile(f);
    setSignatureData(null);
    setSigErr("");
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">Your signature *</p>
        <p className="text-xs text-muted-foreground">
          Required for KYC and agreements. Draw on the pad, upload a scan, or use your camera. We keep your original
          file and generate a clean version for PDF agreements.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${signatureMode === "draw" ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}
          onClick={() => setSignatureMode("draw")}
        >
          Draw signature
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${signatureMode === "upload" ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}
          onClick={() => setSignatureMode("upload")}
        >
          Upload / camera
        </button>
      </div>
      {signatureMode === "draw" ? (
        <SignaturePad onChange={onDraw} />
      ) : (
        <KycImageCaptureField
          label="Signature image"
          hint="Sign on white paper — JPG/PNG/PDF, or capture with camera"
          name="signatureCapture"
          required
          files={captureFiles}
          setFiles={(updater) => {
            setCaptureFiles((prev) => {
              const next = typeof updater === "function" ? updater(prev) : updater;
              if (next.signatureCapture) onCaptureFile(next.signatureCapture);
              else setSignatureFile(null);
              return next;
            });
          }}
          existingUrl={existingUrl}
          allowCamera
          accept={KYC_ACCEPT_DOCS}
          imageOnly={false}
        />
      )}
      {signatureFile && signatureMode === "upload" && (
        <p className="text-xs text-emerald-600">Selected: {signatureFile.name}</p>
      )}
      {sigErr && <p className="text-xs font-semibold text-rose-600">{sigErr}</p>}
    </div>
  );
}
