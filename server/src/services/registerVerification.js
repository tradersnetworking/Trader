import crypto from "crypto";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { issueOtp, verifyOtp, OTP_PURPOSES, isValidEmail, normalizeOtpEmail } from "./otpService.js";

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const VERIFY_TTL_MS = 30 * 60 * 1000;
const SECRET = process.env.JWT_SECRET || "akshaya-register-captcha";

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
  if (!isValidEmail(email)) return { ok: false, error: "Email required" };
  if (!checkCaptcha(captchaToken, captchaAnswer)) return { ok: false, error: "Incorrect captcha answer" };

  const normalized = normalizeOtpEmail(email);
  const exists = await investDb.investor.findUnique({ where: { email: normalized } });
  if (exists) return { ok: false, error: "Email already registered" };

  const result = await issueOtp({
    purpose: OTP_PURPOSES.EMAIL_VERIFY,
    email: normalized,
    subject: "Verify your email — AKSHYA INVESTMENTS",
    intro: "Your AKSHYA INVESTMENTS verification code is",
  });
  if (!result.ok) return result;

  return {
    ok: true,
    otpSessionToken: result.token,
    message: result.message,
    devOtp: result.devOtp,
  };
}

export async function verifyRegisterOtp(otpSessionToken, email, code) {
  const normalized = normalizeOtpEmail(email);
  const result = await verifyOtp({
    token: otpSessionToken,
    purpose: OTP_PURPOSES.EMAIL_VERIFY,
    email: normalized,
    code,
  });
  if (!result.ok) return result;

  const verificationToken = nanoid(40);
  verifiedEmails.set(verificationToken, { email: normalized, expiresAt: Date.now() + VERIFY_TTL_MS });
  return { ok: true, verificationToken, emailVerified: true };
}

export function consumeEmailVerification(verificationToken, email) {
  const record = verifiedEmails.get(verificationToken);
  const normalized = normalizeOtpEmail(email);
  if (!record || record.email !== normalized || Date.now() > record.expiresAt) return false;
  verifiedEmails.delete(verificationToken);
  return true;
}
