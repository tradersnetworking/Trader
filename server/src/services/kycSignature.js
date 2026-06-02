import fs from "fs";
import { investDb } from "../db.js";
import { loadUploadImageBuffer, resolveLocalUploadPath } from "./agreementAssetHelper.js";

/** Resolve investor KYC signature as base64 data URL for agreement PDFs */
export async function getKycSignatureBase64(kyc) {
  if (!kyc) return null;
  if (kyc.signatureData?.startsWith("data:image")) return kyc.signatureData;
  if (kyc.signature) {
    const buf = loadUploadImageBuffer(kyc.signature);
    if (buf?.length) {
      const mime = kyc.signature.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    }
  }
  return null;
}

export async function getInvestorKycSignatureBase64(investorId) {
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  return getKycSignatureBase64(kyc);
}

export function assertKycHasSignature(kyc) {
  if (!kyc) return { ok: false, message: "KYC record not found" };
  const hasDraw = Boolean(kyc.signatureData?.startsWith("data:image"));
  const hasFile = Boolean(kyc.signature);
  if (!hasDraw && !hasFile) {
    return { ok: false, message: "A clear signature is required on KYC (draw or upload) before approval." };
  }
  return { ok: true };
}
