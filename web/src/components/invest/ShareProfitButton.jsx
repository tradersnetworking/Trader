import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { buildShareText, buildReferralLink, openShare, SHARE_PLATFORMS } from "../../lib/share.js";
import { useAuth } from "../../lib/store.jsx";
import { inr } from "../../lib/format.js";

export default function ShareProfitButton({
  type = "profit",
  amount,
  planName,
  monthlyRoiPct,
  lockInDays,
  label = "Share",
  size = "sm",
  className = "",
}) {
  const { invest } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const canvasRef = useRef(null);

  const referralLink = invest?.referralCode ? buildReferralLink(invest.referralCode) : "";
  const text = buildShareText({ type, amount, planName, userName: invest?.name, referralCode: invest?.referralCode });

  useEffect(() => {
    if (!open || !referralLink) return;
    QRCode.toDataURL(referralLink, { width: 160, margin: 1 }).then(setQrUrl).catch(() => {});
  }, [open, referralLink]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = 360;
    const h = 480;
    canvas.width = w;
    canvas.height = h;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#002366");
    grad.addColorStop(1, "#0a3d91");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 20px system-ui";
    ctx.fillText("Akshaya Invest", 20, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "14px system-ui";
    ctx.fillText(invest?.name || "Investor", 20, 70);
    if (planName) {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`Plan: ${planName}`, 20, 95);
    }
    if (amount) {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 28px system-ui";
      ctx.fillText(String(amount), 20, 140);
    }
    if (monthlyRoiPct) {
      ctx.fillStyle = "#fde68a";
      ctx.font = "13px system-ui";
      ctx.fillText(`${monthlyRoiPct}% monthly ROI${lockInDays ? ` • ${lockInDays}d lock-in` : ""}`, 20, 168);
    }
    ctx.fillStyle = "#94a3b8";
    ctx.font="11px system-ui";
    ctx.fillText("Scan to join with my referral", 20, h - 120);
    if (qrUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, w - 150, h - 150, 130, 130);
      img.src = qrUrl;
    }
    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui";
    ctx.fillText("invest.akshayaexim.com", 20, h - 20);
  }, [open, qrUrl, invest, planName, amount, monthlyRoiPct, lockInDays]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "akshaya-invest-share.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const btnClass = size === "sm" ? "rounded-lg border px-2 py-1 text-[10px] font-semibold sm:text-xs" : "rounded-lg border px-3 py-1.5 text-xs font-semibold";
  const tone = type === "withdrawal" ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10" : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10";

  return (
    <>
      <button type="button" className={`${btnClass} ${tone} ${className}`} onClick={() => setOpen(true)}>↗ {label}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-heading text-base font-bold">Share profit & invite</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
            </div>
            <canvas ref={canvasRef} className="mt-3 w-full rounded-xl" style={{ aspectRatio: "360/480" }} />
            {referralLink && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                {qrUrl && <img src={qrUrl} alt="Referral QR" className="h-16 w-16 rounded bg-white p-1" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase text-muted-foreground">Referral link</div>
                  <div className="truncate text-xs font-mono">{referralLink}</div>
                </div>
              </div>
            )}
            <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{text}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SHARE_PLATFORMS.map((p) => (
                <button key={p.id} type="button" onClick={() => openShare(p.id, text)} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 p-3 text-xs font-semibold hover:bg-primary/10">
                  <span className="text-lg">{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-outline flex-1 text-xs" onClick={copy}>{copied ? "Copied!" : "Copy text"}</button>
              <button type="button" className="btn-gold flex-1 text-xs" onClick={downloadCard}>Download card</button>
              <button type="button" className="btn-primary flex-1 text-xs" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
