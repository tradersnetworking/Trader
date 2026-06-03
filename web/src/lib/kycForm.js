export const GUARDIAN_TYPES = [
  { value: "FATHER", label: "Father's name" },
  { value: "MOTHER", label: "Mother's name" },
  { value: "HUSBAND", label: "Husband's name" },
];

export const BANK_PROOF_TYPES = [
  { value: "CHEQUE", label: "Cancelled cheque" },
  { value: "PASSBOOK", label: "Bank passbook" },
  { value: "STATEMENT", label: "Bank statement (no password lock)" },
];

/** Primary government ID — PAN & Aadhaar uploads are always compulsory regardless of selection. */
export const PRIMARY_ID_TYPES = [
  { value: "PAN", label: "PAN Card" },
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driving Licence" },
];

export const VALID_PRIMARY_ID_TYPES = PRIMARY_ID_TYPES.map((t) => t.value);

/** @deprecated Use PRIMARY_ID_TYPES */
export const ID_TYPES = PRIMARY_ID_TYPES;

export function initKycForm(kyc) {
  const idType = String(kyc?.idType || "").toUpperCase();
  return {
    fullName: kyc?.fullName || "",
    guardianType: kyc?.guardianType || "FATHER",
    guardianName: kyc?.guardianName || kyc?.fatherName || "",
    dob: kyc?.dob || "",
    phone: kyc?.phone || "",
    phoneCountryCode: kyc?.phoneCountryCode || "+91",
    whatsappNumber: kyc?.whatsappNumber || "",
    whatsappCountryCode: kyc?.whatsappCountryCode || kyc?.phoneCountryCode || "+91",
    sameWhatsapp: !kyc?.whatsappNumber || kyc.whatsappNumber === kyc.phone,
    houseNo: kyc?.houseNo || "",
    street: kyc?.street || "",
    landmark: kyc?.landmark || "",
    area: kyc?.area || "",
    district: kyc?.district || "",
    city: kyc?.city || "",
    state: kyc?.state || "",
    pincode: kyc?.pincode || "",
    country: kyc?.country || "India",
    address: kyc?.address || "",
    idType: VALID_PRIMARY_ID_TYPES.includes(idType) ? idType : "",
    idNumber: kyc?.idNumber || "",
    panNumber: kyc?.panNumber || "",
    aadhaarNumber: kyc?.aadhaarNumber || "",
    bankName: kyc?.bankName || "",
    bankAccount: kyc?.bankAccount || "",
    ifscCode: kyc?.ifscCode || "",
    branchName: kyc?.branchName || "",
    upiId: kyc?.upiId || "",
    taxId: kyc?.taxId || "",
    bankProofType: kyc?.bankProofType || "CHEQUE",
  };
}

export function guardianFieldLabel(type) {
  return GUARDIAN_TYPES.find((g) => g.value === type)?.label || "Guardian name";
}

/** ID number stored on KYC record for the selected primary document type. */
export function resolvePrimaryIdNumber(form, { normalizePan, normalizeAadhaar }) {
  const idType = String(form?.idType || "").toUpperCase();
  if (idType === "PAN") return normalizePan(form.panNumber);
  if (idType === "AADHAAR") return normalizeAadhaar(form.aadhaarNumber);
  return String(form?.idNumber || "").trim();
}

export function primaryIdTypeLabel(value) {
  return PRIMARY_ID_TYPES.find((t) => t.value === value)?.label || value || "—";
}
