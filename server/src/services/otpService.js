import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { sendMail } from "../utils/mailer.js";

export const OTP_PURPOSES = {
  LOGIN: "login",
  EMAIL_VERIFY: "email_verify",
  WITHDRAWAL: "withdrawal_confirm",
};

const OTP_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

export function normalizeOtpEmail(email) {
  return String(email || "")
    .toLowerCase()
    .trim();
}

export function isValidEmail(email) {
  const e = normalizeOtpEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function hashOtp(code) {
  return bcrypt.hash(String(code), 10);
}

async function checkRateLimit({ email, investorId, purpose }) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const where = { purpose, createdAt: { gte: since } };
  if (investorId) where.investorId = investorId;
  else if (email) where.email = email;
  else return { ok: false, error: "Recipient required for OTP" };

  const count = await investDb.otpToken.count({ where });
  if (count >= RATE_LIMIT_MAX) {
    return { ok: false, error: "Too many OTP requests. Please wait a few minutes and try again." };
  }
  return { ok: true };
}

async function invalidatePendingOtps({ email, investorId, purpose }) {
  const where = { purpose, usedAt: null };
  if (investorId) where.investorId = investorId;
  else if (email) where.email = email;
  else return;

  await investDb.otpToken.updateMany({
    where,
    data: { usedAt: new Date() },
  });
}

/**
 * Send OTP email to exactly one recipient via noreply@ mailbox.
 */
export async function sendOtpEmail({ to, name, otp, subject, intro, html, text }) {
  const recipient = normalizeOtpEmail(to);
  if (!isValidEmail(recipient)) {
    return { failed: true, error: "Invalid email address" };
  }

  const displayName = name?.trim() || "Investor";
  const bodyHtml =
    html?.replace(/\{OTP\}/g, otp) ||
    `<p>Hi ${displayName},</p><p>${intro || "Your verification code is"} <b>${otp}</b>. Valid for 10 minutes.</p><p>If you did not request this, ignore this email.</p>`;
  const bodyText = text?.replace(/\{OTP\}/g, otp) || `Hi ${displayName}, your verification code is ${otp}. Valid for 10 minutes.`;
  const result = await sendMail({
    to: recipient,
    purpose: "otp",
    mailboxId: "noreply",
    portal: "invest",
    subject: subject || "Your verification code — AKSHYA INVESTMENTS",
    html: bodyHtml,
    text: bodyText,
  });

  if (result?.skipped) return { failed: true, error: "OTP emails are disabled in mail settings" };
  if (result?.failed) return result;
  if (result?.dev) return { dev: true, to: recipient };
  return { ok: true, to: recipient, messageId: result.messageId };
}

/**
 * Create OTP session in DB and email only the specified user.
 */
export async function issueOtp({
  purpose,
  email,
  investorId,
  investor,
  subject,
  intro,
  html,
  text,
  sendWhatsApp,
}) {
  const recipient = normalizeOtpEmail(email || investor?.email);
  if (!isValidEmail(recipient)) return { ok: false, error: "Valid email required" };
  if (investorId && investor?.email && normalizeOtpEmail(investor.email) !== recipient) {
    return { ok: false, error: "Email does not match account" };
  }

  const rate = await checkRateLimit({ email: investorId ? null : recipient, investorId, purpose });
  if (!rate.ok) return rate;

  await invalidatePendingOtps({
    email: investorId ? null : recipient,
    investorId: investorId || null,
    purpose,
  });

  const otp = generateOtpCode();
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await investDb.otpToken.create({
    data: {
      purpose,
      token,
      codeHash: await hashOtp(otp),
      expiresAt,
      email: investorId ? null : recipient,
      investorId: investorId || null,
    },
  });

  const mail = await sendOtpEmail({
    to: recipient,
    name: investor?.name,
    otp,
    subject,
    intro,
    html,
    text,
  });

  if (mail.failed) {
    await investDb.otpToken.updateMany({
      where: { token, usedAt: null },
      data: { usedAt: new Date() },
    });
    return { ok: false, error: mail.error || "Could not send verification email" };
  }

  if (sendWhatsApp && investor) {
    try {
      const { sendWhatsAppOtp } = await import("./whatsappBusiness.js");
      await sendWhatsAppOtp(investor, otp, sendWhatsApp);
    } catch (err) {
      console.error(`[whatsapp:otp:${purpose}]`, err.message);
    }
  }

  return {
    ok: true,
    token,
    message: "Verification code sent to your email.",
    devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
  };
}

/**
 * Verify OTP — token must match purpose, email/investor, and not be expired/used.
 */
export async function verifyOtp({ token, purpose, email, code, investorId }) {
  const normalized = normalizeOtpEmail(email);
  const record = await investDb.otpToken.findFirst({
    where: {
      token,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return { ok: false, error: "Invalid or expired verification session" };

  if (record.investorId) {
    if (investorId && record.investorId !== investorId) {
      return { ok: false, error: "Invalid verification session" };
    }
    const inv = await investDb.investor.findUnique({ where: { id: record.investorId } });
    if (!inv || normalizeOtpEmail(inv.email) !== normalized) {
      return { ok: false, error: "Email does not match this verification session" };
    }
  } else if (record.email) {
    if (record.email !== normalized) {
      return { ok: false, error: "Email does not match this verification session" };
    }
  } else {
    return { ok: false, error: "Invalid verification session" };
  }

  const valid = await bcrypt.compare(String(code).trim(), record.codeHash);
  if (!valid) return { ok: false, error: "Invalid verification code" };

  await investDb.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true, investorId: record.investorId, email: record.email || normalized };
}
