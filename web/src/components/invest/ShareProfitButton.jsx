import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  buildShareText,
  buildReferralLink,
  buildPlanShareLink,
  openShare,
  openTransactionShare,
  nativeShare,
  nativeShareImage,
  SHARE_PLATFORMS,
  shareHostLabel,
} from "../../lib/share.js";
import { copyTextToClipboard } from "../../lib/clipboard.js";
import { useAuth } from "../../lib/store.jsx";
import { inr } from "../../lib/format.js";
import { INVEST_HOME_DEFAULT } from "../../lib/shareMeta.js";
import {
  TRANSACTION_SHARE_TYPES,
  renderInvestTransactionCard,
  canvasToPngBlob,
} from "../../lib/investShareCard.js";

const MODAL_TITLES = {
  profit: "Share profit received",
  withdrawal: "Share withdrawal",
  deposit: "Share deposit",
  investment: "Share plan & invite",
  referral: "Share invite link",
};

export default function ShareProfitButton({
  type = "profit",
  amount,
  planName,
  planId,
  plan,
  monthlyRoiPct,
  lockInDays,
  detail,
  dateLabel,
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
  const [cardReady, setCardReady] = useState(false);
  const canvasRef = useRef(null);

  const isTransaction = TRANSACTION_SHARE_TYPES.has(type);
  const isLinkShare = type === "referral" || type === "investment";

  const resolvedPlan = plan || null;
  const resolvedPlanId = planId || resolvedPlan?.id;
  const resolvedPlanName = planName || resolvedPlan?.name;

  const referralLink = invest?.referralCode ? buildReferralLink(invest.referralCode) : "";
  const planLink = resolvedPlanId ? buildPlanShareLink(resolvedPlanId, invest?.referralCode) : referralLink;
  const shareUrl = isLinkShare ? planLink || referralLink : "";

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
    : INVEST_HOME_DEFAULT.title;

  const drawCard = useCallback(() => {
    if (!isTransaction || !canvasRef.current) return;
    renderInvestTransactionCard(canvasRef.current, {
      type,
      amount: amount || "—",
      userName: invest?.name,
      detail: detail || resolvedPlanName || undefined,
      dateLabel,
      qrDataUrl: qrUrl || undefined,
      hostLabel: shareHostLabel(),
    });
    setCardReady(true);
  }, [isTransaction, type, amount, invest?.name, detail, resolvedPlanName, dateLabel, qrUrl]);

  useEffect(() => {
    if (!open) return;
    if (isLinkShare && shareUrl) {
      QRCode.toDataURL(shareUrl, { width: 160, margin: 1 }).then(setQrUrl).catch(() => {});
    } else if (isTransaction && referralLink) {
      QRCode.toDataURL(referralLink, { width: 120, margin: 1 }).then(setQrUrl).catch(() => {});
    }
  }, [open, isLinkShare, isTransaction, shareUrl, referralLink]);

  useEffect(() => {
    if (!open || !isTransaction) return;
    setCardReady(false);
    drawCard();
    if (qrUrl) {
      const t = setTimeout(drawCard, 120);
      return () => clearTimeout(t);
    }
  }, [open, isTransaction, drawCard, qrUrl]);

  const getCardBlob = async () => {
    drawCard();
    await new Promise((r) => setTimeout(r, qrUrl ? 180 : 50));
    if (!canvasRef.current) return null;
    return canvasToPngBlob(canvasRef.current);
  };

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
    if (isTransaction) {
      const blob = await getCardBlob();
      if (blob) {
        const ok = await nativeShareImage({ title: shareTitle, text, blob });
        if (ok) return;
      }
    }
    const ok = await nativeShare({
      title: shareTitle,
      text,
      url: isLinkShare ? shareUrl || undefined : undefined,
    });
    if (!ok) setShareErr("Sharing not available — use a social button or download the image.");
  };

  const downloadCard = async () => {
    const blob = await getCardBlob();
    if (!blob && canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `akshaya-${type}-share.png`;
      a.click();
      return;
    }
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `akshaya-${type}-share.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareSocial = async (platform) => {
    setShareErr("");
    if (isTransaction) {
      const blob = await getCardBlob();
      const imageOk = blob && (await nativeShareImage({ text, blob }));
      if (!imageOk) {
        await downloadCard();
        openTransactionShare(platform, `${text}\n\n(Attach the downloaded image)`);
        setShareErr("Image saved — attach it in WhatsApp/Telegram if it did not open with the picture.");
      }
      return;
    }
    openShare(platform, text, shareUrl);
  };

  const btnClass =
    size === "sm"
      ? "rounded-lg border px-2 py-1 text-[10px] font-semibold sm:text-xs"
      : "rounded-lg border px-3 py-1.5 text-xs font-semibold";
  const tone =
    type === "withdrawal"
      ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
      : type === "deposit"
        ? "border-blue-500/30 text-blue-700 hover:bg-blue-500/10"
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
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-heading text-base font-bold">{MODAL_TITLES[type] || "Share"}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {isTransaction ? (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share your personal milestone card (not the plans banner). On mobile, use Share or WhatsApp/Telegram to
                  send the image.
                </p>
                <canvas
                  ref={canvasRef}
                  className="mt-3 w-full rounded-xl"
                  style={{ aspectRatio: "360/480" }}
                />
                {!cardReady && <p className="mt-1 text-center text-xs text-muted-foreground">Preparing card…</p>}
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Link previews use the investment plans banner image on WhatsApp and Telegram.
              </p>
            )}

            {isLinkShare && shareUrl && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                {qrUrl && <img src={qrUrl} alt="Share QR" className="h-16 w-16 rounded bg-white p-1" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase text-muted-foreground">Share link</div>
                  <div className="break-all text-xs font-mono">{shareUrl}</div>
                </div>
              </div>
            )}

            <p className="mt-3 select-all rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{text}</p>
            {shareErr && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{shareErr}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SHARE_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => shareSocial(p.id)}
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
              {isTransaction && (
                <button type="button" className="btn-gold flex-1 text-xs" onClick={downloadCard}>
                  Download image
                </button>
              )}
              <button type="button" className="btn-outline flex-1 text-xs" onClick={copyText}>
                {copied ? "Copied!" : "Copy text"}
              </button>
              {isLinkShare && shareUrl && (
                <button type="button" className="btn-outline flex-1 text-xs" onClick={copyLink}>
                  {linkCopied ? "Link copied!" : "Copy link"}
                </button>
              )}
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
