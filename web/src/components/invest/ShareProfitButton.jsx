import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  buildShareText,
  buildReferralLink,
  buildPlanShareLink,
  openShare,
  nativeShare,
  SHARE_PLATFORMS,
  shareHostLabel,
} from "../../lib/share.js";
import { copyTextToClipboard } from "../../lib/clipboard.js";
import { useAuth } from "../../lib/store.jsx";
import { inr } from "../../lib/format.js";
import { planOgImagePath, absoluteOgImage } from "../../lib/shareImages.js";

export default function ShareProfitButton({
  type = "profit",
  amount,
  planName,
  planId,
  plan,
  monthlyRoiPct,
  lockInDays,
  label = "Share",
  size = "sm",
  className = "",
}) {
  const { invest } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareErr, setShareErr] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const canvasRef = useRef(null);

  const resolvedPlan = plan || null;
  const resolvedPlanId = planId || resolvedPlan?.id;
  const resolvedPlanName = planName || resolvedPlan?.name;

  const referralLink = invest?.referralCode ? buildReferralLink(invest.referralCode) : "";
  const planLink = resolvedPlanId ? buildPlanShareLink(resolvedPlanId, invest?.referralCode) : referralLink;
  const shareUrl = planLink || referralLink;
  const text = buildShareText({
    type,
    amount,
    planName: resolvedPlanName,
    plan: resolvedPlan,
    userName: invest?.name,
    referralCode: invest?.referralCode,
    planId: resolvedPlanId,
  });
  const shareTitle = resolvedPlanName
    ? `${resolvedPlanName} — Akshaya Invest`
    : type === "referral"
      ? "Join Akshaya Exim Invest"
      : "Akshaya Exim Invest";
  const previewImagePath =
    type === "investment" || resolvedPlan
      ? planOgImagePath(resolvedPlan)
      : null;
  const previewImageUrl =
    previewImagePath && typeof window !== "undefined"
      ? absoluteOgImage(window.location.origin, previewImagePath)
      : undefined;

  useEffect(() => {
    if (!open || !shareUrl) return;
    QRCode.toDataURL(shareUrl, { width: 160, margin: 1 }).then(setQrUrl).catch(() => {});
  }, [open, shareUrl]);

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
    if (resolvedPlanName) {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`Plan: ${resolvedPlanName}`, 20, 95);
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
    ctx.font = "11px system-ui";
    ctx.fillText("Scan to view plans & join", 20, h - 120);
    if (qrUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, w - 150, h - 150, 130, 130);
      img.src = qrUrl;
    }
    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui";
    ctx.fillText(shareHostLabel(), 20, h - 20);
  }, [open, qrUrl, invest, resolvedPlanName, amount, monthlyRoiPct, lockInDays]);

  const copy = async (value, setter) => {
    setShareErr("");
    const ok = await copyTextToClipboard(value);
    if (ok) {
      setter(true);
      setTimeout(() => setter(false), 1500);
    } else {
      setShareErr("Could not copy — select the text below and copy manually.");
    }
  };

  const copyText = () => copy(text, setCopied);
  const copyLink = () => shareUrl && copy(shareUrl, setLinkCopied);

  const shareNative = async () => {
    setShareErr("");
    const ok = await nativeShare({
      title: shareTitle,
      text,
      url: shareUrl || previewImageUrl || undefined,
    });
    if (!ok) setShareErr("Sharing not available on this device — use a social button or copy link.");
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "akshaya-invest-share.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const btnClass =
    size === "sm"
      ? "rounded-lg border px-2 py-1 text-[10px] font-semibold sm:text-xs"
      : "rounded-lg border px-3 py-1.5 text-xs font-semibold";
  const tone =
    type === "withdrawal"
      ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
      : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10";

  return (
    <>
      <button
        type="button"
        className={`${btnClass} ${tone} ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
          setShareErr("");
        }}
      >
        ↗ {label}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-heading text-base font-bold">Share plan & invite</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <canvas ref={canvasRef} className="mt-3 w-full rounded-xl" style={{ aspectRatio: "360/480" }} />
            {shareUrl && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                {qrUrl && <img src={qrUrl} alt="Share QR" className="h-16 w-16 rounded bg-white p-1" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase text-muted-foreground">Share link</div>
                  <div className="break-all text-xs font-mono">{shareUrl}</div>
                </div>
              </div>
            )}
            <p className="mt-3 select-all rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{text}</p>
            {shareErr && <p className="mt-2 text-xs text-rose-600">{shareErr}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SHARE_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openShare(p.id, text, shareUrl)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 p-3 text-xs font-semibold hover:bg-primary/10"
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {typeof navigator !== "undefined" && navigator.share && (
                <button type="button" className="btn-primary flex-1 text-xs" onClick={shareNative}>
                  Share…
                </button>
              )}
              <button type="button" className="btn-outline flex-1 text-xs" onClick={copyText}>
                {copied ? "Copied!" : "Copy text"}
              </button>
              {shareUrl && (
                <button type="button" className="btn-outline flex-1 text-xs" onClick={copyLink}>
                  {linkCopied ? "Link copied!" : "Copy link"}
                </button>
              )}
              <button type="button" className="btn-gold flex-1 text-xs" onClick={downloadCard}>
                Download card
              </button>
              <button type="button" className="btn-outline flex-1 text-xs" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
