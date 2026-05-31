import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter = null;
if (config.smtp.host && config.smtp.user) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    // Dev fallback: log to console so flows still work without SMTP configured.
    console.log("\n[MAIL:DEV] To:", to, "| Subject:", subject);
    console.log("[MAIL:DEV] Body:", text || html, "\n");
    return { dev: true };
  }
  return transporter.sendMail({ from: config.smtp.from, to, subject, html, text });
}
