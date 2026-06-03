/** KYC document slots — aligned with server Kyc model */
/** Which KYC review section a document belongs to (admin per-document actions). */
export const KYC_DOCUMENT_SECTION = {
  photo: "identity",
  panDocument: "identity",
  aadhaarFront: "identity",
  aadhaarBack: "identity",
  aadhaarDocument: "identity",
  passportDocument: "identity",
  driversLicenseDocument: "identity",
  addressProof: "personal",
  selfie: "identity",
  signature: "signature",
  signatureData: "signature",
  cancelledCheque: "banking",
  passbookDocument: "banking",
  bankStatementDocument: "banking",
};

export function sectionForDocumentKey(key) {
  return KYC_DOCUMENT_SECTION[key] || "identity";
}

export const KYC_DOCUMENT_FIELDS = [
  { key: "photo", label: "Passport Size Photo", imageOnly: true },
  { key: "panDocument", label: "PAN Card (photocopy)" },
  { key: "aadhaarFront", label: "Aadhaar Front" },
  { key: "aadhaarBack", label: "Aadhaar Back" },
  { key: "aadhaarDocument", label: "Aadhaar (single PDF/image)" },
  { key: "passportDocument", label: "Passport Document" },
  { key: "driversLicenseDocument", label: "Driving Licence" },
  { key: "addressProof", label: "Address Proof" },
  { key: "selfie", label: "Selfie (holding ID beside face)", imageOnly: true },
  { key: "signature", label: "Signature" },
  { key: "cancelledCheque", label: "Cancelled Cheque" },
  { key: "passbookDocument", label: "Bank passbook" },
  { key: "bankStatementDocument", label: "Bank statement" },
];

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AADHAAR_REGEX = /^\d{12}$/;

export function normalizePan(v) {
  return String(v || "").trim().toUpperCase();
}

export function normalizeAadhaar(v) {
  return String(v || "").replace(/\s/g, "");
}

export function isValidPan(v) {
  return PAN_REGEX.test(normalizePan(v));
}

export function isValidAadhaar(v) {
  return AADHAAR_REGEX.test(normalizeAadhaar(v));
}

export const KYC_ACCEPT_DOCS = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf";
export const KYC_ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/gif";
export const KYC_MAX_BYTES = 10 * 1024 * 1024;

export function validateKycFile(file, { imageOnly = false } = {}) {
  if (!file) return null;
  if (file.size > KYC_MAX_BYTES) return "File must be 10 MB or smaller";
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isImage = mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(name);
  if (imageOnly && !isImage) return "Please upload an image (JPG, PNG, or WebP)";
  if (!isImage && !isPdf) return "Please upload an image or PDF";
  return null;
}

export function filenameFromUrl(url) {
  if (!url) return "";
  try {
    return decodeURIComponent(url.split("/").pop() || "");
  } catch {
    return url.split("/").pop() || "";
  }
}
