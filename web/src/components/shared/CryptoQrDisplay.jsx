import { useEffect, useState } from "react";
import { generateWalletQrDataUrl } from "../../lib/crypto-qr.js";
import { formatCryptoLabel } from "../../lib/crypto-asset-catalog.js";
import { coinCapIcon } from "../../lib/crypto-asset-catalog.js";

/** Coin name + chain above QR, wallet address below (like UPI QR panel). */
export default function CryptoQrDisplay({
  walletAddress,
  symbol,
  network,
  coinName,
  storedQrUrl,
  className = "",
}) {
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  const stored =
    storedQrUrl &&
    (String(storedQrUrl).startsWith("http") || String(storedQrUrl).startsWith("data:image/"))
      ? storedQrUrl
      : "";

  useEffect(() => {
    let cancelled = false;
    const addr = String(walletAddress || "").trim();
    if (!addr) {
      setQr("");
      return;
    }
    if (stored) {
      setQr(stored);
      return;
    }
    setLoading(true);
    generateWalletQrDataUrl(addr)
      .then((url) => {
        if (!cancelled) setQr(url || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress, stored]);

  if (!walletAddress?.trim()) return null;

  const title = formatCryptoLabel(symbol, network, coinName);

  return (
    <div className={`flex min-w-0 max-w-full flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-center">
        <img
          src={coinCapIcon(symbol)}
          alt=""
          className="h-8 w-8 rounded-full bg-white object-contain p-0.5"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          {network && (
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Chain: {network}</p>
          )}
        </div>
      </div>
      {loading && !qr ? (
        <p className="text-[11px] text-muted-foreground">Generating QR code…</p>
      ) : qr ? (
        <img
          src={qr}
          alt="Wallet QR code"
          className="h-44 w-44 max-w-full rounded-lg border border-border bg-white p-2 shadow-sm"
        />
      ) : (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">Could not generate QR for this address.</p>
      )}
      <p className="max-w-full break-all px-1 text-center font-mono text-[10px] text-muted-foreground">
        {walletAddress}
      </p>
    </div>
  );
}
