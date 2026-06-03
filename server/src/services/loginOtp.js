import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { sendMail } from "../utils/mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const sessions = new Map();

export async function startLoginOtp(investor) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = nanoid(32);
  sessions.set(token, {
    investorId: investor.id,
    email: investor.email,
    codeHash: await bcrypt.hash(otp, 10),
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  const sent = await sendMail({
    to: investor.email,
    purpose: "otp",
    subject: "Your login code — AKSHYA INVESTMENTS",
    html: `<p>Hi ${investor.name || "Investor"},</p><p>Your login verification code is <b>${otp}</b>. Valid for 10 minutes.</p><p>If you did not try to sign in, ignore this email.</p>`,
  });
  if (sent?.failed) {
    throw new Error(sent.error || "Could not send verification email");
  }
  if (sent?.dev) {
    console.log(`[MAIL:DEV] Login OTP for ${investor.email}: ${otp}`);
  }
  try {
    const { sendWhatsAppOtp } = await import("./whatsappBusiness.js");
    await sendWhatsAppOtp(investor, otp, "login");
  } catch (err) {
    console.error("[whatsapp:login-otp]", err.message);
  }
  return {
    loginOtpToken: token,
    message: "Verification code sent to your email.",
    devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
  };
}

export async function verifyLoginOtp(loginOtpToken, email, code) {
  const session = sessions.get(loginOtpToken);
  const normalized = (email || "").toLowerCase().trim();
  if (!session || session.email !== normalized || Date.now() > session.expiresAt) {
    return { ok: false, error: "Invalid or expired login session. Sign in again." };
  }
  const valid = await bcrypt.compare(String(code).trim(), session.codeHash);
  if (!valid) return { ok: false, error: "Invalid verification code" };
  sessions.delete(loginOtpToken);
  const investor = await investDb.investor.findUnique({
    where: { id: session.investorId },
    include: { kyc: { select: { photo: true, selfie: true } } },
  });
  if (!investor?.isActive) return { ok: false, error: "Account disabled" };
  return { ok: true, investor };
}
