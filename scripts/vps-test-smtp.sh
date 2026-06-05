#!/bin/sh
cd /opt/akshaya-exim
docker compose -f deploy/docker-compose.yml exec -T api node --input-type=module <<'NODE'
import nodemailer from "nodemailer";
const pass = process.env.SMTP_PASS || "";
const cases = [
  { host: "smtp.hostinger.com", user: "noreply@akshayaexim.com", port: 465, secure: true },
  { host: "smtp.hostinger.com", user: "noreply@akshayaexim.in", port: 465, secure: true },
  { host: "mail.akshayaexim.com", user: "noreply@akshayaexim.com", port: 465, secure: true },
  { host: "mail.akshayaexim.com", user: "noreply@akshayaexim.com", port: 587, secure: false, requireTLS: true },
  { host: "mail.akshayaexim.in", user: "noreply@akshayaexim.in", port: 465, secure: true },
  { host: "smtp.titan.email", user: "noreply@akshayaexim.com", port: 465, secure: true },
];
for (const c of cases) {
  const tr = nodemailer.createTransport({ ...c, auth: { user: c.user, pass } });
  try {
    await tr.verify();
    console.log(`OK ${c.host} ${c.user} ${c.port}`);
  } catch (e) {
    console.log(`FAIL ${c.host} ${c.user} ${c.port} :: ${e.message}`);
  }
}
NODE
