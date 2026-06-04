/** Allowed KYC document field keys (must match Prisma Kyc columns). */
export const KYC_UPLOAD_FIELD_KEYS = new Set([
  "panDocument",
  "aadhaarDocument",
  "aadhaarFront",
  "aadhaarBack",
  "photo",
  "selfie",
  "addressProof",
  "signature",
  "cancelledCheque",
  "passbookDocument",
  "bankStatementDocument",
  "passportDocument",
  "driversLicenseDocument",
]);

export const KYC_IMAGE_ONLY_FIELDS = new Set(["photo", "selfie"]);

export function isAllowedKycUploadField(key) {
  return KYC_UPLOAD_FIELD_KEYS.has(String(key || ""));
}
