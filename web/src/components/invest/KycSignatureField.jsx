import { useState } from "react";
import SignaturePad from "./SignaturePad.jsx";
import { validateSignatureBase64 } from "../../lib/signatureQuality.js";
import { KYC_ACCEPT_DOCS } from "../../lib/kyc-document-fields.js";

/** KYC signature: draw on pad OR upload image/PDF */
export default function KycSignatureField({ signatureMode, setSignatureMode, signatureData, setSignatureData, signatureFile, setSignatureFile, existingUrl }) {
  const [sigErr, setSigErr] = useState("");

  const onDraw = (data) => {
    setSignatureData(data);
    setSignatureFile(null);
    setSigErr(data ? validateSignatureBase64(data) : "");
  };

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setSigErr("Signature file must be 10 MB or smaller");
      return;
    }
    setSignatureFile(f);
    setSignatureData(null);
    setSigErr("");
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">Your signature *</p>
        <p className="text-xs text-muted-foreground">
          Required for KYC and all investment agreements. Draw clearly or upload a sharp signature on white paper (JPG, PNG, or PDF).
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
          Upload image / PDF
        </button>
      </div>
      {signatureMode === "draw" ? (
        <SignaturePad onChange={onDraw} />
      ) : (
        <div>
          <input type="file" accept={KYC_ACCEPT_DOCS} className="input text-sm" onChange={onUpload} />
          {signatureFile && <p className="mt-1 text-xs text-emerald-600">Selected: {signatureFile.name}</p>}
          {existingUrl && !signatureFile && (
            <p className="mt-1 text-xs text-muted-foreground">Current file on record (upload new to replace)</p>
          )}
        </div>
      )}
      {sigErr && <p className="text-xs font-semibold text-rose-600">{sigErr}</p>}
    </div>
  );
}
