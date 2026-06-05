import nodemailer from "nodemailer";
import { config } from "../config.js";
import { smtpAuthUser } from "../services/mailboxConfig.js";

function smtpAuthReady({ host, user, pass }) {
  return !!(String(host || "").trim() && String(user || "").trim() && String(pass || "").length > 0);
}

function createEnvTransporter() {
  if (!smtpAuthReady({ host: config.smtp.host, user: config.smtp.user, pass: config.smtp.pass })) {
    return null;
  }
  const port = config.smtp.port || 465;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port,
    secure: config.smtp.secure ?? port === 465,
    requireTLS: !config.smtp.secure && port === 587,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    tls: { minVersion: "TLSv1.2" },
  });
}

let envTransporter = createEnvTransporter();

const transporterCache = new Map();

async function getLegacyDbTransporter() {
  try {
    const { getAllSettings } = await import("../services/investSettings.js");
    const s = await getAllSettings(true);
    if (!smtpAuthReady({ host: s.smtp_host, user: s.smtp_user, pass: s.smtp_pass })) return null;
    const port = Number(s.smtp_port) || 465;
    return nodemailer.createTransport({
      host: s.smtp_host,
      port,
      secure: s.smtp_secure === "true" || port === 465,
      requireTLS: s.smtp_secure !== "true" && port === 587,
      auth: { user: s.smtp_user, pass: s.smtp_pass },
      tls: { minVersion: "TLSv1.2" },
    });
  } catch {
    return null;
  }
}

/** True when invest (or main) portal can send outbound mail. */
export async function isOutboundMailConfigured(portal = "invest") {
  if (envTransporter) return true;
  if (await getLegacyDbTransporter()) return true;
  try {
    const { getMailboxConfig, isMailboxSmtpConfigured } = await import("../services/mailboxConfig.js");
    const cfg = await getMailboxConfig(portal, true);
    return cfg.mailboxes.some((m) => isMailboxSmtpConfigured(m));
  } catch {
    return false;
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
      const authUser = smtpAuthUser(portal, mailbox);
      const cacheKey = `${portal}:${mailbox.id}:${mailbox.smtp.host}:${authUser}`;
      if (!transporterCache.has(cacheKey)) {
        transporterCache.set(cacheKey, createSmtpTransporter(mailbox, portal));
      }
      if (!from && mailbox.address) from = `${mailbox.name} <${mailbox.address}>`;
      const replyTo = from && authUser && !String(from).includes(authUser) ? mailbox.address : undefined;
      return { transporter: transporterCache.get(cacheKey), from, replyTo, mailboxId: mailbox.id, authUser };
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
  } catch {
    /* ignore */
  }
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
    } catch {
      /* ignore */
    }
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
    } catch {
      /* ignore */
    }
  }

  const authUser = ctx.authUser;
  let sendFrom = from;
  let replyTo = ctx.replyTo;
  if (authUser && sendFrom && !String(sendFrom).includes(authUser)) {
    sendFrom = authUser.includes("<") ? authUser : `Akshaya Exim <${authUser}>`;
    if (!replyTo && from) {
      const match = String(from).match(/<([^>]+)>/);
      replyTo = match?.[1] || from;
    }
  }

  try {
    const info = await transporter.sendMail({
      from: sendFrom,
      to,
      subject,
      html,
      text,
      attachments,
      replyTo: replyTo || undefined,
    });
    return { ok: true, messageId: info?.messageId };
  } catch (err) {
    const authFailed = /535|authentication failed|invalid login/i.test(err.message || "");
    if (authFailed) transporterCache.clear();
    console.error(`[MAIL] Send failed (${purpose || "general"} → ${to}):`, err.message);
    return {
      failed: true,
      error: err.message || "Mail send failed",
      hint: authFailed
        ? "SMTP login rejected — verify mailbox exists in Hostinger, password is correct, and Titan third-party access is enabled."
        : undefined,
    };
  }
}
