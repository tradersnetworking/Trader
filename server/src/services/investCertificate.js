import crypto from "crypto";
import { investDb } from "../db.js";
import { config } from "../config.js";

function hmac(payload) {
  return crypto.createHmac("sha256", config.jwtSecret).update(payload).digest("base64url");
}

export function certificateNumber(subscriptionId) {
  const year = new Date().getFullYear();
  const short = String(subscriptionId).slice(-8).toUpperCase();
  return `AEX-INV-${year}-${short}`;
}

export function signCertificateToken(subscriptionId) {
  const sig = hmac(subscriptionId);
  return `${subscriptionId}.${sig}`;
}

export function verifyCertificateToken(token) {
  if (!token || typeof token !== "string") return null;
  const [subscriptionId, sig] = token.split(".");
  if (!subscriptionId || !sig) return null;
  const expected = hmac(subscriptionId);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return subscriptionId;
}

export async function getCertificatePayload(subscriptionId, investorId = null) {
  const sub = await investDb.subscription.findFirst({
    where: investorId ? { id: subscriptionId, investorId } : { id: subscriptionId },
    include: { plan: true, investor: { select: { id: true, name: true, email: true } } },
  });
  if (!sub) return null;

  const token = signCertificateToken(sub.id);
  const baseUrl = (config.investPortalUrl || config.investOrigin || "").replace(/\/invest\/?$/, "");
  const verifyUrl = `${baseUrl}/verify-certificate?token=${encodeURIComponent(token)}`;

  return {
    certificateNumber: certificateNumber(sub.id),
    verifyToken: token,
    verifyUrl,
    investorName: sub.investor.name,
    investorEmail: sub.investor.email,
    planName: sub.plan.name,
    planType: sub.plan.planType,
    amount: sub.amount,
    monthlyRoiPct: sub.monthlyRoiPct,
    annualRoiPct: sub.monthlyRoiPct * 12,
    lockInDays: sub.lockInDays,
    settlementCycle: sub.settlementCycle,
    startDate: sub.startDate,
    maturityDate: sub.maturityDate,
    status: sub.status,
    issuedAt: sub.createdAt,
  };
}
