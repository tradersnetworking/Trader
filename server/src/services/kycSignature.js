import { investDb } from "../db.js";
import { loadUploadImageBuffer, resolveLocalUploadPath } from "./agreementAssetHelper.js";

/** Build PNG data URL from stored agreement signature path. */
function bufferToPngDataUrl(buf) {
  if (!buf?.length) return null;
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Create signatureForAgreement from original upload or drawn signature if missing. */
export async function ensureKycSignatureForAgreement(kyc) {
  if (!kyc) return null;
  if (kyc.signatureForAgreement) {
    const buf = loadUploadImageBuffer(kyc.signatureForAgreement);
    if (buf?.length) return kyc;
  }

  const { processSignatureForAgreement, processSignatureDataUrlForAgreement } = await import("./signatureProcess.js");
  let url = null;

  if (kyc.signature) {
    const local = resolveLocalUploadPath(kyc.signature);
    if (local) url = await processSignatureForAgreement(local);
  } else if (kyc.signatureData?.startsWith("data:image")) {
    url = await processSignatureDataUrlForAgreement(kyc.signatureData);
  }

  if (!url) return kyc;

  return investDb.kyc.update({
    where: { investorId: kyc.investorId },
    data: { signatureForAgreement: url },
  });
}

export async function ensureKycSignatureForAgreementByInvestorId(investorId) {
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  return ensureKycSignatureForAgreement(kyc);
}

/** Agreement PDFs use transparent PNG (signatureForAgreement), not the original upload. */
export async function getKycSignatureBase64(kyc) {
  if (!kyc) return null;

  const refreshed = await ensureKycSignatureForAgreement(kyc);
  const record = refreshed || kyc;

  if (record.signatureForAgreement) {
    const buf = loadUploadImageBuffer(record.signatureForAgreement);
    const dataUrl = bufferToPngDataUrl(buf);
    if (dataUrl) return dataUrl;
  }

  if (record.signatureData?.startsWith("data:image")) {
    const { processSignatureDataUrlForAgreement } = await import("./signatureProcess.js");
    const url = await processSignatureDataUrlForAgreement(record.signatureData);
    if (url) {
      const buf = loadUploadImageBuffer(url);
      const dataUrl = bufferToPngDataUrl(buf);
      if (dataUrl) return dataUrl;
    }
    return record.signatureData;
  }

  if (record.signature) {
    const buf = loadUploadImageBuffer(record.signature);
    if (buf?.length) {
      const mime = record.signature.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
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
