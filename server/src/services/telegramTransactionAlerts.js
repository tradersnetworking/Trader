import { getSetting } from "./investSettings.js";

const STORAGE_KEY = "telegram_notify_channels";

function fmtInr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseChannels(raw) {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((c) => ({
          chatId: String(c.chatId ?? c.id ?? c.channel ?? "").trim(),
          label: String(c.label || c.name || "").trim(),
          enabled: c.enabled !== false,
        }))
        .filter((c) => c.chatId);
    }
  } catch {
    /* fall through to line-based */
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [chatId, ...rest] = line.split(/\s*[,|]\s*/);
      return { chatId, label: rest.join(" ").trim(), enabled: true };
    })
    .filter((c) => c.chatId);
}

export async function getTelegramAlertConfig() {
  const enabled = (await getSetting("telegram_notify_enabled")) !== "false";
  const token = (process.env.TELEGRAM_BOT_TOKEN || (await getSetting("telegram_bot_token")) || "").trim();
  const channels = parseChannels(await getSetting(STORAGE_KEY));
  return {
    enabled,
    token,
    channels: channels.filter((c) => c.enabled),
  };
}

async function sendTelegramMessage(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.description || `Telegram API error (${res.status})`);
  }
  return data;
}

/** Post formatted transaction alert to all configured channels (non-blocking). */
export async function postTelegramTransaction(event, payload = {}) {
  const { enabled, token, channels } = await getTelegramAlertConfig();
  if (!enabled || !token || !channels.length) return { sent: 0, skipped: true };

  const investor = payload.investor || {};
  const name = escapeHtml(investor.name || "Investor");
  const email = escapeHtml(investor.email || "—");
  const phone = escapeHtml(investor.phone || "—");
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  let headline = "Transaction";
  let lines = [];

  switch (event) {
    case "deposit_submitted":
      headline = "Deposit submitted";
      lines = [
        `Amount: <b>${fmtInr(payload.deposit?.amount)}</b>`,
        `Method: ${escapeHtml(payload.deposit?.method)}`,
        `Status: PENDING`,
        payload.deposit?.reference ? `Ref: ${escapeHtml(payload.deposit.reference)}` : null,
      ];
      break;
    case "deposit_approved":
      headline = payload.deposit?.gatewayRef ? "Gateway deposit credited" : "Deposit approved";
      lines = [
        `Amount: <b>${fmtInr(payload.deposit?.amount)}</b>`,
        `Method: ${escapeHtml(payload.deposit?.method)}`,
        `Status: APPROVED`,
        payload.deposit?.gatewayRef ? `Gateway receipt: <code>${escapeHtml(payload.deposit.gatewayRef)}</code>` : null,
        payload.deposit?.id ? `Deposit ID: <code>${escapeHtml(payload.deposit.id)}</code>` : null,
      ];
      break;
    case "deposit_rejected":
      headline = "Deposit rejected";
      lines = [
        `Amount: <b>${fmtInr(payload.deposit?.amount)}</b>`,
        `Remarks: ${escapeHtml(payload.remarks || payload.deposit?.remarks || "—")}`,
      ];
      break;
    case "withdrawal_requested":
      headline = "Withdrawal requested";
      lines = [
        `Amount: <b>${fmtInr(payload.payout?.amount)}</b>`,
        `Mode: ${escapeHtml(payload.payout?.mode || payload.payout?.destination)}`,
        `Status: PENDING`,
      ];
      break;
    case "withdrawal_released":
    case "payout_gateway_receipt":
      headline = payload.payout?.gatewayRef ? "Payout gateway receipt" : "Withdrawal released";
      lines = [
        `Amount: <b>${fmtInr(payload.payout?.amount)}</b>`,
        `Mode: ${escapeHtml(payload.payout?.mode)}`,
        `Destination: ${escapeHtml(payload.payout?.destination || "—")}`,
        `Status: ${escapeHtml(payload.payout?.status || "SUCCESS")}`,
        payload.payout?.gateway ? `Gateway: <b>${escapeHtml(payload.payout.gateway)}</b>` : null,
        payload.payout?.gatewayRef
          ? `Receipt / ref: <code>${escapeHtml(payload.payout.gatewayRef)}</code>`
          : null,
        payload.payout?.id ? `Payout ID: <code>${escapeHtml(payload.payout.id)}</code>` : null,
        payload.receiptNote ? escapeHtml(payload.receiptNote) : null,
      ];
      break;
    case "withdrawal_rejected":
      headline = "Withdrawal rejected";
      lines = [
        `Amount: <b>${fmtInr(payload.payout?.amount)}</b>`,
        `Remarks: ${escapeHtml(payload.remarks || "—")}`,
      ];
      break;
    case "investment":
      headline = payload.source === "admin" ? "Investment (admin)" : "New investment";
      lines = [
        `Plan: <b>${escapeHtml(payload.planName || "—")}</b>`,
        `Amount: <b>${fmtInr(payload.amount)}</b>`,
        payload.settlementCycle ? `Settlement: ${escapeHtml(payload.settlementCycle)}` : null,
      ];
      break;
    default:
      lines = [escapeHtml(JSON.stringify(payload)).slice(0, 400)];
  }

  const text = [
    `<b>📢 ${headline}</b>`,
    "",
    ...lines.filter(Boolean),
    "",
    `Investor: ${name}`,
    `Email: ${email}`,
    phone !== "—" ? `Phone: ${phone}` : null,
    `Time (IST): ${when}`,
  ]
    .filter(Boolean)
    .join("\n");

  let sent = 0;
  const errors = [];
  for (const ch of channels) {
    try {
      await sendTelegramMessage(token, ch.chatId, text);
      sent += 1;
    } catch (e) {
      errors.push(`${ch.label || ch.chatId}: ${e.message}`);
      console.error("[telegram-alert]", ch.chatId, e.message);
    }
  }
  return { sent, errors };
}

export async function testTelegramAlert() {
  const { enabled, token, channels } = await getTelegramAlertConfig();
  if (!token) throw new Error("Telegram bot token is not configured");
  if (!channels.length) throw new Error("Add at least one channel chat ID");
  const text = "<b>✅ Akshaya Invest</b>\n\nTest alert — transaction notifications are working.";
  const results = [];
  for (const ch of channels) {
    await sendTelegramMessage(token, ch.chatId, text);
    results.push(ch.label || ch.chatId);
  }
  return { ok: true, enabled, channels: results };
}
