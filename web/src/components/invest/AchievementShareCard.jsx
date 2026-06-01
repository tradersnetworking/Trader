import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../lib/store.jsx";
import { inr } from "../../lib/format.js";
import { buildReferralLink, buildShareText, openShare, SHARE_PLATFORMS } from "../../lib/share.js";

export default function AchievementShareCard({ achievement, totalInvested, onClose }) {
  const { invest } = useAuth();
  const canvasRef = useRef(null);
  const [qrUrl, setQrUrl] = useState("");

  const referralLink = invest?.referralCode ? buildReferralLink(invest.referralCode) : "";
  const firstName = String(invest?.name || "Investor").split(/\s+/)[0];
  const text = buildShareText({
    type: "achievement",
    amount: inr(totalInvested),
    planName: achievement.label,
    userName: firstName,
    referralCode: invest?.referralCode,
  });

  useEffect(() => {
    if (!referralLink) return;
    QRCode.toDataURL(referralLink, { width: 100, margin: 1 }).then(setQrUrl).catch(() => {});
  }, [referralLink]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const w = 360;
    const h = 440;
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, achievement.color || "#002366");
    grad.addColorStop(1, "#1a4480");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px system-ui";
    ctx.fillText("Akshaya ExIm Invest", 20, 36);
    ctx.font = "48px system-ui";
    ctx.fillText(achievement.icon || "🏆", 20, 90);
    ctx.font = "bold 22px system-ui";
    ctx.fillText(achievement.label, 20, 130);
    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`Congratulations ${firstName}!`, 20, 158);
    if (totalInvested > 0) ctx.fillText(`Portfolio: ${inr(totalInvested)}`, 20, 182);
    ctx.font = "12px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const desc = achievement.description || "Achievement unlocked on Akshaya Invest";
    ctx.fillText(desc.slice(0, 42), 20, 210);
    if (qrUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, w - 120, h - 130, 100, 100);
      img.src = qrUrl;
    }
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px system-ui";
    ctx.fillText("invest.akshayaexim.com", 20, h - 16);
  }, [achievement, firstName, totalInvested, qrUrl]);

  const download = () => {
    const link = document.createElement("a");
    link.download = `akshaya-achievement-${achievement.id}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-foreground">Share achievement</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
        </div>
        <canvas ref={canvasRef} className="mx-auto mt-4 w-full max-w-[360px] rounded-xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          {SHARE_PLATFORMS.slice(0, 4).map((p) => (
            <button key={p.id} type="button" className="btn-outline flex-1 text-xs" onClick={() => openShare(p.id, text)}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-gold flex-1" onClick={download}>Download PNG</button>
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
