import { investDb } from "../db.js";
import { issueOtp, verifyOtp, OTP_PURPOSES } from "./otpService.js";

export async function startLoginOtp(investor) {
  const result = await issueOtp({
    purpose: OTP_PURPOSES.LOGIN,
    email: investor.email,
    investorId: investor.id,
    investor,
    subject: "Your login code — AKSHYA INVESTMENTS",
    intro: "Your login verification code is",
    sendWhatsApp: "login",
  });
  if (!result.ok) throw new Error(result.error || "Could not send verification email");
  return {
    loginOtpToken: result.token,
    message: result.message,
    devOtp: result.devOtp,
  };
}

export async function verifyLoginOtp(loginOtpToken, email, code) {
  const result = await verifyOtp({
    token: loginOtpToken,
    purpose: OTP_PURPOSES.LOGIN,
    email,
    code,
  });
  if (!result.ok) return result;

  const investor = await investDb.investor.findUnique({
    where: { id: result.investorId },
    include: { kyc: { select: { photo: true, selfie: true } } },
  });
  if (!investor?.isActive) return { ok: false, error: "Account disabled" };
  return { ok: true, investor };
}
