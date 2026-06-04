import fs from "fs";
import path from "path";
import sharp from "sharp";
import { uploadsDir } from "../utils/upload.js";

const PAN_RE = /[A-Z]{5}[0-9]{4}[A-Z]/g;
const AADHAAR_RE = /\d{4}\s?\d{4}\s?\d{4}|\d{12}/g;
const IFSC_RE = /[A-Z]{4}0[A-Z0-9]{6}/gi;

let workerPromise = null;

async function getWorker() {
  if (process.env.KYC_OCR_ENABLED === "false") return null;
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        return worker;
      } catch (e) {
        console.warn("[kycOcr] Tesseract unavailable:", e?.message || e);
        return null;
      }
    })();
  }
  return workerPromise;
}

async function ocrImagePath(filePath) {
  const worker = await getWorker();
  if (!worker) return "";
  const ext = path.extname(filePath).toLowerCase();
  let input = filePath;
  let tmp = null;
  if (ext === ".pdf") {
    return extractRoughPdfText(filePath);
  }
  try {
    tmp = filePath.replace(/\.[^.]+$/, "") + "-ocr.jpg";
    await sharp(filePath).jpeg({ quality: 92 }).toFile(tmp);
    input = tmp;
  } catch {
    input = filePath;
  }
  try {
    const { data } = await worker.recognize(input);
    return String(data?.text || "").toUpperCase();
  } finally {
    if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

function extractRoughPdfText(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return buf.toString("latin1").toUpperCase();
  } catch {
    return "";
  }
}

function textHasPan(text, pan) {
  const norm = String(pan || "").trim().toUpperCase();
  if (!norm) return { ok: true };
  if (text.includes(norm)) return { ok: true };
  const found = text.match(PAN_RE) || [];
  if (found.some((p) => p === norm)) return { ok: true };
  return { ok: false, error: `PAN card image does not show PAN ${norm}. Upload a clearer photo.` };
}

function textHasAadhaar(text, aadhaar) {
  const norm = String(aadhaar || "").replace(/\s/g, "");
  if (!norm || norm.length < 12) return { ok: true };
  const compact = text.replace(/\s/g, "");
  if (compact.includes(norm)) return { ok: true };
  const last4 = norm.slice(-4);
  if (compact.includes(last4)) return { ok: true };
  const found = [...(text.match(AADHAAR_RE) || [])].map((s) => s.replace(/\s/g, ""));
  if (found.some((f) => f === norm || f.endsWith(last4))) return { ok: true };
  return { ok: false, error: "Aadhaar document does not match the Aadhaar number you entered." };
}

function textHasIfsc(text, ifsc) {
  const norm = String(ifsc || "").trim().toUpperCase();
  if (!norm) return { ok: true };
  if (text.includes(norm)) return { ok: true };
  const found = text.match(IFSC_RE) || [];
  if (found.some((f) => f.toUpperCase() === norm)) return { ok: true };
  return { ok: false, error: `Bank document does not show IFSC ${norm}.` };
}

function textHasAccount(text, account) {
  const norm = String(account || "").replace(/\s/g, "");
  if (!norm || norm.length < 4) return { ok: true };
  const digits = norm.replace(/\D/g, "");
  if (digits.length >= 4 && text.replace(/\s/g, "").includes(digits)) return { ok: true };
  return { ok: false, error: "Bank document does not show the account number you entered." };
}

/**
 * Verify uploaded KYC files match form data (best-effort OCR).
 * Skips when OCR disabled or worker missing.
 */
export async function validateKycDocumentsOcr(data, files, existing) {
  if (process.env.KYC_OCR_ENABLED === "false") return null;

  const worker = await getWorker();
  const checks = [];

  const OCR_MAX_BYTES = 8 * 1024 * 1024;
  const OCR_MS = Number(process.env.KYC_OCR_TIMEOUT_MS || 12000);

  const pathFor = (field) => {
    const up = files[field]?.[0];
    if (!up?.path) return null;
    if (up.size > OCR_MAX_BYTES) return null;
    return up.path;
  };

  const withOcrTimeout = (promise) =>
    Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve({ ok: true, skipped: true }), OCR_MS)),
    ]);

  const panPath = pathFor("panDocument");
  if (panPath && data.panNumber) {
    checks.push(
      withOcrTimeout(
        (async () => {
          const text = await ocrImagePath(panPath);
          return textHasPan(text, data.panNumber);
        })()
      )
    );
  }

  for (const field of ["aadhaarFront", "aadhaarBack", "aadhaarDocument"]) {
    const p = pathFor(field);
    if (p && data.aadhaarNumber) {
      checks.push(
        withOcrTimeout(
          (async () => {
            const text = await ocrImagePath(p);
            return textHasAadhaar(text, data.aadhaarNumber);
          })()
        )
      );
    }
  }

  for (const field of ["cancelledCheque", "passbookDocument", "bankStatementDocument"]) {
    const p = pathFor(field);
    if (p) {
      checks.push(
        withOcrTimeout(
          (async () => {
            const text = await ocrImagePath(p);
            let r = textHasIfsc(text, data.ifscCode);
            if (r.ok) r = textHasAccount(text, data.bankAccount);
            return r;
          })()
        )
      );
    }
  }

  if (!checks.length) return null;
  if (!worker) return null;

  const results = await Promise.all(checks);
  const fail = results.find((r) => r && !r.ok);
  if (fail) return { error: fail.error, code: "OCR_MISMATCH" };
  return null;
}
