import fs from "fs";
import path from "path";
import sharp from "sharp";

const MIN_WIDTH = 400;
const MIN_HEIGHT = 280;
/** Greyscale channel stdev below this suggests blur / flat image */
const MIN_STDEV = 14;

export async function validateUploadedDocument(filePath, { label = "Document" } = {}) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, code: "MISSING", message: `${label} is required` };
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const size = fs.statSync(filePath).size;
    if (size < 2048) {
      return {
        ok: false,
        code: "BLURRY",
        message: `${label}: PDF is empty or unreadable. Upload a clear scan (image or PDF).`,
      };
    }
    const head = fs.readFileSync(filePath, { encoding: "latin1", start: 0, end: Math.min(size, 65536) });
    if (/\/Encrypt\b/i.test(head)) {
      return {
        ok: false,
        code: "PDF_PASSWORD",
        message: `${label}: Password-protected PDFs are not accepted. Export an unlocked copy or upload a clear image.`,
      };
    }
    return { ok: true };
  }

  try {
    const fileSize = fs.statSync(filePath).size;
    const pipeline =
      fileSize > 4 * 1024 * 1024
        ? sharp(filePath).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
        : sharp(filePath).rotate();
    const meta = await pipeline.clone().metadata();
    if ((meta.width || 0) < MIN_WIDTH || (meta.height || 0) < MIN_HEIGHT) {
      return {
        ok: false,
        code: "LOW_RES",
        message: `${label} resolution is too low. Upload a clear image (min ${MIN_WIDTH}×${MIN_HEIGHT}px) or a PDF.`,
      };
    }
    const stats = await pipeline.greyscale().resize(640, 640, { fit: "inside", withoutEnlargement: true }).stats();
    const stdev = stats.channels?.[0]?.stdev ?? 0;
    if (stdev < MIN_STDEV) {
      return {
        ok: false,
        code: "BLURRY",
        message: `${label} appears blurry or unclear. Please upload a sharp photo or PDF and try again.`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "INVALID",
      message: `${label}: Could not read file. Use JPG, PNG, WebP, or PDF.`,
    };
  }
}

export async function validateMulterFile(file, label) {
  if (!file?.path) return { ok: true };
  return validateUploadedDocument(file.path, { label });
}

export const KYC_DOC_LABELS = {
  photo: "Passport size photo",
  panDocument: "PAN card",
  aadhaarFront: "Aadhaar front",
  aadhaarBack: "Aadhaar back",
  aadhaarDocument: "Aadhaar document",
  passportDocument: "Passport",
  driversLicenseDocument: "Driving licence",
  addressProof: "Address proof",
  selfie: "Selfie verification",
  signature: "Signature image",
  cancelledCheque: "Cancelled cheque",
  passbookDocument: "Bank passbook",
  bankStatementDocument: "Bank statement",
};
