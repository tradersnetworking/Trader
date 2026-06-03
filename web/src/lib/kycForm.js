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

/** Additional government ID (PAN + Aadhaar are always required separately). */
export const ID_TYPES = [
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driving Licence" },
];

export function initKycForm(kyc) {
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
    idType: ["PASSPORT", "DRIVERS_LICENSE"].includes(kyc?.idType) ? kyc.idType : "PASSPORT",
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
