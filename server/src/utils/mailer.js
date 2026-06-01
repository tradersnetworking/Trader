import nodemailer from "nodemailer";
import { config } from "../config.js";

let envTransporter = null;
if (config.smtp.host && config.smtp.user) {
  envTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

const transporterCache = new Map();

async function getLegacyDbTransporter() {
  try {
    const { getAllSettings } = await import("../services/investSettings.js");
    const s = await getAllSettings(true);
    if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) return null;
    return nodemailer.createTransport({
      host: s.smtp_host,
      port: Number(s.smtp_port) || 587,
      secure: s.smtp_secure === "true",
      auth: { user: s.smtp_user, pass: s.smtp_pass },
    });
  } catch {
    return null;
  }
}

async function resolveSendContext({ portal = "invest", purpose, mailboxId }) {
  let from;
  let resolvedMailboxId = mailboxId;

  try {
    const { getEmailCommunicationBundle } = await import("../services/emailCommunication.js");
    const bundle = await getEmailCommunicationBundle(portal);

    if (purpose) {
      const auto = bundle.config.autoEmails[purpose];
      if (auto && auto.enabled === false) return { skipped: true };
      from = bundle.resolvedFrom[purpose];
      resolvedMailboxId = bundle.config.assignments[purpose] || "noreply";
    }
  } catch {
    /* fall through */
  }

  if (!resolvedMailboxId) resolvedMailboxId = "noreply";

  try {
    const { getMailbox, createSmtpTransporter, isMailboxSmtpConfigured } = await import("../services/mailboxConfig.js");
    const mailbox = await getMailbox(portal, resolvedMailboxId, true);
    if (mailbox && isMailboxSmtpConfigured(mailbox)) {
      const cacheKey = `${portal}:${mailbox.id}:${mailbox.smtp.host}:${mailbox.smtp.user}`;
      if (!transporterCache.has(cacheKey)) {
        transporterCache.set(cacheKey, createSmtpTransporter(mailbox));
      }
      if (!from && mailbox.address) from = `${mailbox.name} <${mailbox.address}>`;
      return { transporter: transporterCache.get(cacheKey), from, mailboxId: mailbox.id };
    }
    if (!from && mailbox?.address) from = `${mailbox.name} <${mailbox.address}>`;
  } catch {
    /* fall through */
  }

  return { transporter: null, from, mailboxId: resolvedMailboxId };
}

async function resolveMailFrom(portal = "invest") {
  try {
    const { getDefaultMailbox } = await import("../services/mailboxConfig.js");
    const box = await getDefaultMailbox(portal, false);
    if (box?.address) return `${box.name} <${box.address}>`;
  } catch { /* ignore */ }
  try {
    const { getMailFrom } = await import("../services/investSettings.js");
    return await getMailFrom();
  } catch {
    return config.smtp.from;
  }
}

export async function sendMail({ to, subject, html, text, purpose, attachments, portal = "invest", mailboxId }) {
  const ctx = await resolveSendContext({ portal, purpose, mailboxId });
  if (ctx.skipped) {
    console.log(`[MAIL] Skipped disabled purpose: ${purpose} → ${to}`);
    return { skipped: true };
  }

  if (purpose && !subject) {
    try {
      const { getEmailCommunicationConfig } = await import("../services/emailCommunication.js");
      const cfg = await getEmailCommunicationConfig(portal);
      if (cfg.autoEmails[purpose]?.subject) subject = cfg.autoEmails[purpose].subject;
    } catch { /* ignore */ }
  }

  const transporter = ctx.transporter || envTransporter || (await getLegacyDbTransporter());
  if (!transporter) {
    console.log("\n[MAIL:DEV] To:", to, "| Subject:", subject, purpose ? `| Purpose: ${purpose}` : "", `| Portal: ${portal}`);
    console.log("[MAIL:DEV] Body:", text || html, "\n");
    return { dev: true };
  }

  let from = ctx.from || (await resolveMailFrom(portal));
  if (!from) {
    try {
      const { getSetting } = await import("../services/investSettings.js");
      const custom = await getSetting("default_communication_email");
      if (custom) from = custom.includes("<") ? custom : `Akshaya Exim <${custom}>`;
    } catch { /* ignore */ }
  }

  return transporter.sendMail({ from, to, subject, html, text, attachments });
}
