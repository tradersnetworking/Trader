import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verify } from "otplib";
import { investDb } from "../db.js";

export function generateTotpSecret(email) {
  const secret = generateSecret();
  const uri = generateURI({ issuer: "Akshaya Invest", label: email, secret });
  return { secret, uri };
}

export function verifyTotp(secret, token) {
  if (!secret || !token) return false;
  return verify({ token: String(token).replace(/\s/g, ""), secret });
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => crypto.randomBytes(4).toString("hex").toUpperCase());
}

export async function hashBackupCodes(codes) {
  const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return JSON.stringify(hashed);
}

export async function verifyBackupCode(investor, code) {
  if (!investor.backupCodes) return false;
  const hashes = JSON.parse(investor.backupCodes);
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) {
      hashes.splice(i, 1);
      await investDb.investor.update({ where: { id: investor.id }, data: { backupCodes: JSON.stringify(hashes) } });
      return true;
    }
  }
  return false;
}

export async function enableTotp(investorId, secret, token) {
  if (!verifyTotp(secret, token)) return { ok: false, error: "Invalid verification code" };
  const codes = generateBackupCodes();
  await investDb.investor.update({
    where: { id: investorId },
    data: { totpSecret: secret, totpEnabled: true, backupCodes: await hashBackupCodes(codes) },
  });
  return { ok: true, backupCodes: codes };
}

export async function disableTotp(investorId, token, investor) {
  if (investor.totpEnabled && !verifyTotp(investor.totpSecret, token)) {
    return { ok: false, error: "Invalid TOTP code" };
  }
  await investDb.investor.update({
    where: { id: investorId },
    data: { totpSecret: null, totpEnabled: false, backupCodes: null },
  });
  return { ok: true };
}

export async function verifyInvestor2FA(investor, token) {
  if (!investor.totpEnabled) return { ok: true, skipped: true };
  if (verifyTotp(investor.totpSecret, token)) return { ok: true };
  if (await verifyBackupCode(investor, token)) return { ok: true, backup: true };
  return { ok: false, error: "Invalid 2FA code" };
}
