import path from "path";
import fs from "fs";
import { investDb, mainDb } from "../db.js";
import { uploadsDir } from "../utils/upload.js";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const KYC_FILE_FIELDS = [
  "photo",
  "panDocument",
  "aadhaarFront",
  "aadhaarBack",
  "aadhaarDocument",
  "passportDocument",
  "addressProof",
  "selfie",
  "signature",
  "cancelledCheque",
  "passbookDocument",
  "bankStatementDocument",
  "bankProof",
  "companyRegDoc",
];

function filenameFromStoredUrl(storedUrl) {
  if (!storedUrl || typeof storedUrl !== "string") return null;
  if (storedUrl.startsWith("data:")) return null;
  const clean = storedUrl.split("?")[0];
  const base = path.basename(clean);
  return base && !base.includes("..") ? base : null;
}

function urlReferencesFilename(storedUrl, filename) {
  if (!storedUrl || !filename) return false;
  return storedUrl.includes(filename);
}

export function mimeForFilename(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

export function resolveUploadFilePath(filename) {
  const safe = path.basename(filename);
  const filePath = path.join(uploadsDir, safe);
  if (!filePath.startsWith(uploadsDir)) return null;
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

async function investorOwnsUpload(investorId, filename) {
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  if (kyc) {
    for (const field of KYC_FILE_FIELDS) {
      if (urlReferencesFilename(kyc[field], filename)) return true;
    }
  }

  const deposits = await investDb.deposit.findMany({
    where: { investorId },
    select: { proofImage: true },
    take: 200,
  });
  if (deposits.some((d) => urlReferencesFilename(d.proofImage, filename))) return true;

  const investor = await investDb.investor.findUnique({
    where: { id: investorId },
    select: { profilePicture: true },
  });
  if (urlReferencesFilename(investor?.profilePicture, filename)) return true;

  return false;
}

async function mainUserOwnsUpload(userId, filename) {
  const kyc = await mainDb.tradeKyc.findUnique({ where: { userId } });
  if (kyc) {
    for (const field of KYC_FILE_FIELDS) {
      if (urlReferencesFilename(kyc[field], filename)) return true;
    }
  }

  const payments = await mainDb.tradePayment.findMany({
    where: { userId },
    select: { proofImage: true },
    take: 200,
  });
  if (payments.some((p) => urlReferencesFilename(p.proofImage, filename))) return true;

  return false;
}

/** @returns {{ ok: true, filePath: string, mime: string } | { ok: false, status: number, error: string }} */
export async function authorizeUploadAccess({ scope, user, filename }) {
  const safe = path.basename(filename || "");
  if (!safe || safe !== filename) {
    return { ok: false, status: 400, error: "Invalid filename" };
  }

  const filePath = resolveUploadFilePath(safe);
  if (!filePath) {
    return { ok: false, status: 404, error: "File not found" };
  }

  const role = user?.role;
  const isInvestStaff = scope === "invest" && ["ADMIN", "SUPERADMIN"].includes(role);
  const isMainStaff = scope === "main" && ["ADMIN", "SUPERADMIN", "STAFF"].includes(role);

  if (isInvestStaff || isMainStaff) {
    return { ok: true, filePath, mime: mimeForFilename(safe) };
  }

  if (scope === "invest") {
    if (role !== "INVESTOR") {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    const owns = await investorOwnsUpload(user.id, safe);
    if (!owns) return { ok: false, status: 403, error: "Forbidden" };
    return { ok: true, filePath, mime: mimeForFilename(safe) };
  }

  if (scope === "main") {
    const owns = await mainUserOwnsUpload(user.id, safe);
    if (!owns) return { ok: false, status: 403, error: "Forbidden" };
    return { ok: true, filePath, mime: mimeForFilename(safe) };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export { filenameFromStoredUrl };
