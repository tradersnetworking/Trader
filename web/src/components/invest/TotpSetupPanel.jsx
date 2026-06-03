import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Alert, Copyable, Field } from "../ui.jsx";

/**
 * TOTP enrollment — QR scan + copyable secret for authenticator apps.
 */
export default function TotpSetupPanel({ setup, token, onTokenChange, onEnable, enabling = false }) {
  const [qrUrl, setQrUrl] = useState("");
  const [qrErr, setQrErr] = useState("");

  useEffect(() => {
    if (!setup?.uri) {
      setQrUrl("");
      return undefined;
    }
    let cancelled = false;
    setQrErr("");
    QRCode.toDataURL(setup.uri, { width: 240, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrErr("Could not generate QR code — use the manual secret below.");
      });
    return () => {
      cancelled = true;
    };
  }, [setup?.uri]);

  if (!setup?.secret) return null;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Add to your authenticator app</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use Google Authenticator, Microsoft Authenticator, Authy, or any TOTP app. Scan the QR code or enter the
          secret manually.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0 rounded-xl border border-border bg-white p-3 shadow-sm">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR code for authenticator app setup"
              className="h-[220px] w-[220px]"
              width={220}
              height={220}
            />
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-muted-foreground">
              {qrErr || "Generating QR…"}
            </div>
          )}
        </div>
        <div className="w-full min-w-0 flex-1 space-y-3">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-left">
            Or enter secret manually
          </p>
          <Copyable value={setup.secret} label="Secret key" />
          {setup.uri && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Advanced: setup URI</summary>
              <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{setup.uri}</p>
            </details>
          )}
        </div>
      </div>

      {qrErr && <Alert type="info">{qrErr}</Alert>}

      <Field label="6-digit code from your app">
        <input
          className="input text-center tracking-[0.3em]"
          value={token}
          onChange={(e) => onTokenChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
      </Field>

      <button type="button" className="btn-gold w-full text-sm" onClick={onEnable} disabled={enabling || token.length < 6}>
        {enabling ? "Verifying…" : "Enable authenticator"}
      </button>
    </div>
  );
}
