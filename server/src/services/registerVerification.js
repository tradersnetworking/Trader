import crypto from "crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { sendMail } from "../utils/mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const VERIFY_TTL_MS = 30 * 60 * 1000;
const SECRET = process.env.JWT_SECRET || "akshaya-register-captcha";

/** @type {Map<string, { email: string, codeHash: string, expiresAt: number }>} */
const otpSessions = new Map();
/** @type {Map<string, { email: string, expiresAt: number }>} */
const verifiedEmails = new Map();

function signCaptcha(a, b, exp) {
  const payload = `${a}|${b}|${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ a, b, exp, sig })).toString("base64url");
}

function checkCaptcha(captchaToken, answer) {
  try {
    const { a, b, exp, sig } = JSON.parse(Buffer.from(captchaToken, "base64url").toString());
    if (Date.now() > exp) return false;
    const expected = crypto.createHmac("sha256", SECRET).update(`${a}|${b}|${exp}`).digest("hex");
    if (sig !== expected) return false;
    return Number(String(answer).trim()) === a + b;
  } catch {
    return false;
  }
}

export function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const exp = Date.now() + CAPTCHA_TTL_MS;
  return { question: `${a} + ${b} = ?`, captchaToken: signCaptcha(a, b, exp) };
}

export async function sendRegisterOtp(email, captchaToken, captchaAnswer) {
  if (!email?.trim()) return { ok: false, error: "Email required" };
  if (!checkCaptcha(captchaToken, captchaAnswer)) return { ok: false, error: "Incorrect captcha answer" };

  const normalized = email.toLowerCase().trim();
  const exists = await investDb.investor.findUnique({ where: { email: normalized } });
  if (exists) return { ok: false, error: "Email already registered" };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = nanoid(32);
  otpSessions.set(token, {
    email: normalized,
    codeHash: await bcrypt.hash(otp, 10),
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  await sendMail({
    to: normalized,
    purpose: "otp",
    subject: "Verify your email — AKASHYA INVESTMENTS",
    html: `<p>Your AKASHYA INVESTMENTS verification code is <b>${otp}</b>. Valid for 10 minutes.</p>`,
  });

  return {
    ok: true,
    otpSessionToken: token,
    message: "Verification code sent to your email.",
    devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
  };
}

export async function verifyRegisterOtp(otpSessionToken, email, code) {
  const session = otpSessions.get(otpSessionToken);
  const normalized = email.toLowerCase().trim();
  if (!session || session.email !== normalized || Date.now() > session.expiresAt) {
    return { ok: false, error: "Invalid or expired OTP session" };
  }
  const valid = await bcrypt.compare(String(code).trim(), session.codeHash);
  if (!valid) return { ok: false, error: "Invalid verification code" };

  otpSessions.delete(otpSessionToken);
  const verificationToken = nanoid(40);
  verifiedEmails.set(verificationToken, { email: normalized, expiresAt: Date.now() + VERIFY_TTL_MS });
  return { ok: true, verificationToken, emailVerified: true };
}

export function consumeEmailVerification(verificationToken, email) {
  const record = verifiedEmails.get(verificationToken);
  const normalized = email.toLowerCase().trim();
  if (!record || record.email !== normalized || Date.now() > record.expiresAt) return false;
  verifiedEmails.delete(verificationToken);
  return true;
}
