/** Kuber-style share cards for investor transactions (profit / withdrawal / deposit). */

export const TRANSACTION_SHARE_TYPES = new Set(["profit", "withdrawal", "deposit"]);

const THEMES = {
  profit: {
    headline: "Profit Received",
    sub: "Monthly returns credited",
    accent: "#34d399",
    accent2: "#10b981",
    icon: "📈",
  },
  withdrawal: {
    headline: "Withdrawal Done",
    sub: "Payout sent to your account",
    accent: "#fbbf24",
    accent2: "#f59e0b",
    icon: "✓",
  },
  deposit: {
    headline: "Deposit Credited",
    sub: "Wallet balance updated",
    accent: "#60a5fa",
    accent2: "#3b82f6",
    icon: "💳",
  },
};

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let dy = 0;
  let lines = 0;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y + dy);
      line = words[n] + " ";
      dy += lineHeight;
      lines += 1;
      if (lines >= maxLines) return dy + lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line.trim(), x, y + dy);
    dy += lineHeight;
  }
  return dy;
}

/**
 * Draw a 360×480 PNG-ready card on the canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {{ type: string, amount: string, userName?: string, detail?: string, dateLabel?: string, qrDataUrl?: string, hostLabel?: string }} opts
 */
export function renderInvestTransactionCard(canvas, opts) {
  const type = TRANSACTION_SHARE_TYPES.has(opts.type) ? opts.type : "profit";
  const theme = THEMES[type];
  const w = 360;
  const h = 480;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#001a3d");
  bg.addColorStop(0.45, "#002366");
  bg.addColorStop(1, "#0a3d91");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(212, 175, 55, 0.12)";
  roundRect(ctx, 16, 16, w - 32, h - 32, 20);
  ctx.fill();

  ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 16, 16, w - 32, h - 32, 20);
  ctx.stroke();

  ctx.fillStyle = "#d4af37";
  ctx.font = "bold 18px Inter, system-ui, sans-serif";
  ctx.fillText("AKSHAYA Exim Invest", 32, 52);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText(opts.userName || "Investor", 32, 74);

  const badgeY = 96;
  ctx.fillStyle = theme.accent;
  roundRect(ctx, 32, badgeY, w - 64, 44, 12);
  ctx.fill();
  ctx.fillStyle = "#0a1f44";
  ctx.font = "bold 13px Inter, system-ui, sans-serif";
  ctx.fillText(`${theme.icon}  ${theme.headline}`, 44, badgeY + 28);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Inter, system-ui, sans-serif";
  const amountStr = String(opts.amount || "—");
  ctx.fillText(amountStr, 32, 168);

  ctx.fillStyle = theme.accent2;
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  ctx.fillText(theme.sub, 32, 192);

  if (opts.detail) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "13px Inter, system-ui, sans-serif";
    wrapText(ctx, opts.detail, 32, 218, w - 64, 18, 2);
  }

  if (opts.dateLabel) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillText(opts.dateLabel, 32, h - 148);
  }

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.fillText("Personal milestone · Not a platform promo", 32, h - 128);

  if (opts.qrDataUrl) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.fillText("Invite friends", 32, h - 100);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, w - 132, h - 132, 100, 100, 8);
      ctx.fill();
      ctx.drawImage(img, w - 128, h - 128, 92, 92);
    };
    img.src = opts.qrDataUrl;
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.fillText(opts.hostLabel || "invest.akshayaexim.com", 32, h - 24);
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), "image/png", 0.92);
  });
}
