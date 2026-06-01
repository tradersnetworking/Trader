import { useEffect, useState } from "react";
import { generateUpiQrDataUrl } from "../../lib/upi-qr.js";

/** Shows scannable UPI QR for deposit — auto-generated from VPA + optional amount. */
export default function UpiQrDisplay({ vpa, payeeName, amount, storedQrUrl, className = "" }) {
  const [qr, setQr] = useState(storedQrUrl || "");

  useEffect(() => {
    let cancelled = false;
    if (storedQrUrl) {
      setQr(storedQrUrl);
      return;
    }
    if (!vpa) {
      setQr("");
      return;
    }
    generateUpiQrDataUrl(vpa, payeeName, amount).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => { cancelled = true; };
  }, [vpa, payeeName, amount, storedQrUrl]);

  if (!qr) return null;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img src={qr} alt="Scan to pay via UPI" className="h-44 w-44 rounded-lg border border-border bg-white p-2 shadow-sm" />
      <p className="text-center text-[11px] text-muted-foreground">Scan with any UPI app{amount ? ` · ₹${Number(amount).toLocaleString("en-IN")}` : ""}</p>
    </div>
  );
}
