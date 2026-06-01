import crypto from "crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { sendMail } from "../utils/mailer.js";
import { verifyInvestor2FA } from "./twoFactor.js";
import { getSetting } from "./investSettings.js";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(code) {
  return bcrypt.hash(String(code), 10);
}

export async function initiateWithdrawal(investor, { amount, mode, destination, password, totpCode }) {
  if (!investor.passwordHash) return { ok: false, error: "Password required" };
  const match = await bcrypt.compare(password, investor.passwordHash);
  if (!match) return { ok: false, error: "Invalid password" };

  const full = await investDb.investor.findUnique({ where: { id: investor.id } });
  const tfa = await verifyInvestor2FA(full, totpCode);
  if (!tfa.ok) return { ok: false, error: tfa.error || "2FA required" };

  const wallet = await investDb.wallet.findUnique({ where: { investorId: investor.id } });
  const amt = Number(amount);
  const minWithdraw = Number(await getSetting("min_withdraw_amount")) || 100;
  const maxWithdraw = Number(await getSetting("max_withdraw_amount")) || 0;
  if (amt < minWithdraw) return { ok: false, error: `Minimum withdrawal is ₹${minWithdraw.toLocaleString("en-IN")}` };
  if (maxWithdraw > 0 && amt > maxWithdraw) return { ok: false, error: `Maximum withdrawal per request is ₹${maxWithdraw.toLocaleString("en-IN")}` };
  if (!wallet || wallet.available < amt) return { ok: false, error: "Insufficient balance" };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = nanoid(32);
  await investDb.otpToken.create({
    data: {
      investorId: investor.id,
      purpose: "withdrawal_confirm",
      codeHash: await hashOtp(otp),
      token,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendMail({
    to: investor.email,
    purpose: "otp",
    subject: "Confirm your withdrawal — Akshaya Invest",
    html: `<p>Hi ${investor.name},</p><p>Your withdrawal OTP is <b>${otp}</b> (valid 10 minutes).</p><p>Amount: ₹${Number(amount).toLocaleString("en-IN")} via ${mode}</p>`,
  });

  return {
    ok: true,
    confirmationToken: token,
    pending: { amount: Number(amount), mode, destination },
    message: "Email OTP sent. Submit OTP to complete withdrawal.",
  };
}

export async function confirmWithdrawal(investor, { confirmationToken, emailOtp, amount, mode, destination }) {
  const record = await investDb.otpToken.findFirst({
    where: {
      investorId: investor.id,
      token: confirmationToken,
      purpose: "withdrawal_confirm",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return { ok: false, error: "Invalid or expired confirmation" };
  const valid = await bcrypt.compare(String(emailOtp), record.codeHash);
  if (!valid) return { ok: false, error: "Invalid email OTP" };

  await investDb.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true, amount: Number(amount), mode, destination };
}
