import nodemailer from "nodemailer";

/** Shared SMTP login — all mailboxes relay through one Hostinger account when set. */
export function smtpRelayUser(portal, mailbox) {
  const portalRelay =
    portal === "main"
      ? process.env.MAIN_SMTP_RELAY_USER || process.env.MAIN_MAILBOX_SMTP_USER
      : process.env.INVEST_SMTP_RELAY_USER || process.env.INVEST_MAILBOX_SMTP_USER;
  return (
    portalRelay ||
    process.env.SMTP_RELAY_USER ||
    process.env.SMTP_USER ||
    mailbox?.smtp?.user ||
    mailbox?.address ||
    ""
  );
}

export function smtpRelayPassword(portal) {
  if (portal === "main") {
    return (
      process.env.MAIN_MAILBOX_SMTP_PASS ||
      process.env.MAIN_MAILBOX_PASSWORD ||
      process.env.MAILBOX_PASSWORD ||
      process.env.SMTP_PASS ||
      ""
    );
  }
  return (
    process.env.INVEST_MAILBOX_SMTP_PASS ||
    process.env.INVEST_MAILBOX_PASSWORD ||
    process.env.MAILBOX_PASSWORD ||
    process.env.SMTP_PASS ||
    ""
  );
}

export function smtpHost() {
  return process.env.SMTP_HOST || "smtp.hostinger.com";
}

export function smtpPort(mailbox) {
  const fromEnv = Number(process.env.SMTP_PORT);
  const fromBox = Number(mailbox?.smtp?.port);
  return fromBox || fromEnv || 465;
}

export function smtpSecure(port) {
  if (process.env.SMTP_SECURE === "true") return true;
  if (process.env.SMTP_SECURE === "false") return false;
  return port === 465;
}

/** Build nodemailer transport — relay auth + Hostinger-friendly TLS defaults. */
export function createSmtpTransport(mailbox, portal = "invest") {
  const host = mailbox?.smtp?.host || smtpHost();
  const port = smtpPort(mailbox);
  const secure = smtpSecure(port);
  const user = smtpRelayUser(portal, mailbox);
  const pass = mailbox?.smtp?.pass || smtpRelayPassword(portal);
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });
}

const PROBE_HOSTS = ["smtp.hostinger.com", "smtp.titan.email"];
const PROBE_PORTS = [
  { port: 465, secure: true },
  { port: 587, secure: false, requireTLS: true },
];

/** Try common Hostinger/Titan SMTP profiles; returns first that verifies. */
export async function probeSmtpAuth({ user, pass, hosts = PROBE_HOSTS } = {}) {
  if (!user || !pass) return { ok: false, error: "SMTP user and password required" };
  const attempts = [];
  for (const host of hosts) {
    for (const cfg of PROBE_PORTS) {
      const tr = nodemailer.createTransport({
        host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: cfg.requireTLS,
        auth: { user, pass },
        tls: { minVersion: "TLSv1.2" },
        connectionTimeout: 15000,
      });
      try {
        await tr.verify();
        return {
          ok: true,
          host,
          port: cfg.port,
          secure: cfg.secure,
          user,
          message: `SMTP verified: ${user} via ${host}:${cfg.port}`,
        };
      } catch (e) {
        attempts.push({ host, port: cfg.port, error: e.message });
      }
    }
  }
  return {
    ok: false,
    error: attempts[0]?.error || "SMTP verification failed",
    attempts,
    hint:
      "Check Hostinger: email accounts exist, password matches, Titan → Enable third-party apps, disable 2FA on the mailbox.",
  };
}
