import { investDb } from "../db.js";
import { getMailbox } from "./mailboxConfig.js";
import { sendMail } from "../utils/mailer.js";

export async function syncSupportInbox(portal = "invest") {
  const mailbox = await getMailbox(portal, "support", true);
  const host = mailbox?.imap?.host;
  const user = mailbox?.imap?.user;
  const pass = mailbox?.imap?.pass;
  if (!host || !user || !pass) return { synced: 0, error: "Support mailbox IMAP not configured" };

  try {
    const { ImapFlow } = await import("imapflow");
    const { simpleParser } = await import("mailparser");
    const client = new ImapFlow({
      host,
      port: Number(mailbox.imap.port) || 993,
      secure: mailbox.imap.secure !== false && mailbox.imap.secure !== "false",
      auth: { user, pass },
    });
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

export async function replySupportMail(id, { to, subject, body, attachments }, portal = "invest") {
  const msg = await investDb.supportMailMessage.findUnique({ where: { id } });
  if (!msg) throw new Error("Message not found");
  await sendMail({
    to: to || msg.fromEmail,
    subject: subject || `Re: ${msg.subject}`,
    html: body,
    purpose: "ticket_reply",
    attachments,
    portal,
    mailboxId: "support",
  });
  await investDb.supportMailMessage.update({ where: { id }, data: { status: "REPLIED" } });
  return { ok: true };
}

export async function composeSupportMail({ to, subject, body, attachments }, portal = "invest") {
  if (!to || !subject || !body) throw new Error("To, subject and body are required");
  const supportBox = await getMailbox(portal, "support", false);
  await sendMail({ to, subject, html: body, purpose: "ticket_reply", attachments, portal, mailboxId: "support" });
  await investDb.supportMailMessage.create({
    data: {
      messageId: `outbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromEmail: supportBox?.address || "support@akshayaexim.in",
      subject,
      body: body.slice(0, 8000),
      category: "OUTBOUND",
      status: "SENT",
      receivedAt: new Date(),
    },
  });
  return { ok: true };
}
