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

let dbTransporter = null;
let dbTransporterAt = 0;

async function getDbTransporter() {
  if (Date.now() - dbTransporterAt < 60_000 && dbTransporter) return dbTransporter;
  try {
    const { getAllSettings } = await import("../services/investSettings.js");
    const s = await getAllSettings(true);
    if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) return null;
    dbTransporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: Number(s.smtp_port) || 587,
      secure: s.smtp_secure === "true",
      auth: { user: s.smtp_user, pass: s.smtp_pass },
    });
    dbTransporterAt = Date.now();
    return dbTransporter;
  } catch {
    return null;
  }
}

async function resolveMailFrom() {
  try {
    const { getMailFrom } = await import("../services/investSettings.js");
    return await getMailFrom();
  } catch {
    return config.smtp.from;
  }
}

export async function sendMail({ to, subject, html, text, purpose }) {
  let from;
  if (purpose) {
    try {
      const { getEmailCommunicationBundle } = await import("../services/emailCommunication.js");
      const bundle = await getEmailCommunicationBundle();
      const auto = bundle.config.autoEmails[purpose];
      if (auto && auto.enabled === false) {
        console.log(`[MAIL] Skipped disabled purpose: ${purpose} → ${to}`);
        return { skipped: true };
      }
      if (!subject && auto?.subject) subject = auto.subject;
      from = bundle.resolvedFrom[purpose];
    } catch {
      /* use default from */
    }
  }

  const transporter = envTransporter || (await getDbTransporter());
  if (!transporter) {
    console.log("\n[MAIL:DEV] To:", to, "| Subject:", subject, purpose ? `| Purpose: ${purpose}` : "");
    console.log("[MAIL:DEV] Body:", text || html, "\n");
    return { dev: true };
  }
  if (!from) from = await resolveMailFrom();
  return transporter.sendMail({ from, to, subject, html, text });
}
