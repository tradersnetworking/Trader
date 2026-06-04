import { useEffect, useState } from "react";
import { generateUpiQrDataUrl, isValidStoredQrUrl, normalizeVpa } from "../../lib/upi-qr.js";

/** Shows scannable UPI QR — auto-generated from VPA + optional amount. */
export default function UpiQrDisplay({
  vpa,
  payeeName,
  amount,
  storedQrUrl,
  className = "",
  caption,
}) {
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedVpa = normalizeVpa(vpa);
  const stored = isValidStoredQrUrl(storedQrUrl) ? String(storedQrUrl).trim() : "";

  useEffect(() => {
    let cancelled = false;

    if (!normalizedVpa) {
      setQr("");
      setLoading(false);
      return;
    }

    if (stored) {
      setQr(stored);
      setLoading(false);
      return;
    }

    setLoading(true);
    setQr("");
    generateUpiQrDataUrl(normalizedVpa, payeeName, amount)
      .then((url) => {
        if (!cancelled) setQr(url || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedVpa, payeeName, amount, stored]);

  if (!normalizedVpa) return null;

  const defaultCaption = amount
    ? `Scan with any UPI app · ₹${Number(amount).toLocaleString("en-IN")}`
    : "Scan with any UPI app";

  return (
    <div className={`flex min-w-0 max-w-full flex-col items-center gap-2 ${className}`}>
      {loading && !qr ? (
        <p className="text-center text-[11px] text-muted-foreground">Generating QR code…</p>
      ) : qr ? (
        <img
          src={qr}
          alt="UPI QR code"
          className="h-40 w-40 max-w-full rounded-lg border border-border bg-white p-2 shadow-sm sm:h-44 sm:w-44"
        />
      ) : (
        <p className="text-center text-[11px] text-amber-700 dark:text-amber-400">
          Could not generate QR. Check the UPI ID format (e.g. name@bank).
        </p>
      )}
      <p className="max-w-full px-1 text-center text-[11px] text-muted-foreground">{caption || defaultCaption}</p>
    </div>
  );
}
