import { investDb } from "../db.js";
import { getSetting } from "./investSettings.js";
import { sendMail } from "../utils/mailer.js";

export async function syncSupportInbox() {
  const enabled = (await getSetting("support_mail_enabled")) === "true";
  if (!enabled) return { synced: 0, skipped: true };

  const host = await getSetting("support_imap_host");
  const user = await getSetting("support_imap_user");
  const pass = await getSetting("support_imap_pass");
  if (!host || !user || !pass) return { synced: 0, error: "IMAP not configured" };

  try {
    const { ImapFlow } = await import("imapflow");
    const { simpleParser } = await import("mailparser");
    const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass } });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let synced = 0;
    try {
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `${msg.uid}-${Date.now()}`;
        const exists = await investDb.supportMailMessage.findUnique({ where: { messageId } });
        if (exists) continue;
        await investDb.supportMailMessage.create({
          data: {
            messageId,
            fromEmail: parsed.from?.text || "unknown",
            subject: parsed.subject || "(no subject)",
            body: parsed.text?.slice(0, 8000) || parsed.html?.slice(0, 8000) || "",
            category: detectCategory(parsed.subject),
            receivedAt: parsed.date || new Date(),
          },
        });
        synced++;
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { synced };
  } catch (e) {
    return { synced: 0, error: e.message };
  }
}

function detectCategory(subject = "") {
  const s = subject.toLowerCase();
  if (s.includes("deposit")) return "DEPOSIT";
  if (s.includes("withdraw")) return "WITHDRAWAL";
  if (s.includes("kyc")) return "KYC";
  return "GENERAL";
}

export async function listMailMessages() {
  return investDb.supportMailMessage.findMany({ orderBy: { receivedAt: "desc" }, take: 100 });
}

export async function replySupportMail(id, { to, subject, body }) {
  const msg = await investDb.supportMailMessage.findUnique({ where: { id } });
  if (!msg) throw new Error("Message not found");
  await sendMail({ to: to || msg.fromEmail, subject: subject || `Re: ${msg.subject}`, html: body });
  await investDb.supportMailMessage.update({ where: { id }, data: { status: "REPLIED" } });
  return { ok: true };
}
