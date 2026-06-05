#!/usr/bin/env node
import nodemailer from "nodemailer";

const pass = process.env.SMTP_PASS || process.env.MAILBOX_PASSWORD || "";
const users = [
  "noreply@akshayaexim.in",
  "noreply@akshayaexim.com",
  "support@akshayaexim.in",
];

const profiles = [
  { host: "smtp.hostinger.com", port: 587, secure: false, requireTLS: true },
  { host: "smtp.hostinger.com", port: 465, secure: true },
];

for (const user of users) {
  for (const p of profiles) {
    const tr = nodemailer.createTransport({
      host: p.host,
      port: p.port,
      secure: p.secure,
      requireTLS: p.requireTLS,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    });
    try {
      await tr.verify();
      console.log(`OK  user=${user} port=${p.port} secure=${p.secure}`);
    } catch (e) {
      console.log(`FAIL user=${user} port=${p.port} secure=${p.secure} :: ${e.message}`);
    }
  }
}
