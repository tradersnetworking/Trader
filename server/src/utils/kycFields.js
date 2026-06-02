/** Build legacy single-line address + normalize guardian fields for KYC storage */

const GUARDIAN_TYPES = new Set(["FATHER", "MOTHER", "HUSBAND"]);

export function normalizeGuardianType(v) {
  const t = String(v || "FATHER").toUpperCase();
  return GUARDIAN_TYPES.has(t) ? t : "FATHER";
}

export function guardianLabel(type) {
  const map = { FATHER: "Father's name", MOTHER: "Mother's name", HUSBAND: "Husband's name" };
  return map[normalizeGuardianType(type)] || "Guardian name";
}

export function composeAddress(parts) {
  const lines = [
    parts.houseNo,
    parts.street,
    parts.landmark,
    parts.area,
    parts.district,
    parts.city,
    parts.state,
    parts.pincode,
    parts.country,
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return lines.join(", ");
}

export function parseKycBody(b, existing = {}) {
  const guardianType = normalizeGuardianType(b.guardianType || existing.guardianType);
  const guardianName = String(b.guardianName || b.fatherName || existing.guardianName || existing.fatherName || "").trim();
  const address = composeAddress({
    houseNo: b.houseNo,
    street: b.street,
    landmark: b.landmark,
    area: b.area,
    district: b.district,
    city: b.city,
    state: b.state,
    pincode: b.pincode,
    country: b.country || "India",
  });

  return {
    fullName: b.fullName?.trim(),
    guardianType,
    guardianName: guardianName || null,
    fatherName: guardianName || null,
    dob: b.dob || null,
    phone: b.phone || null,
    phoneCountryCode: b.phoneCountryCode || "+91",
    whatsappNumber: b.whatsappNumber?.trim() || b.phone?.trim() || null,
    whatsappCountryCode: b.whatsappCountryCode || b.phoneCountryCode || "+91",
    country: b.country || "India",
    houseNo: b.houseNo?.trim() || null,
    street: b.street?.trim() || null,
    landmark: b.landmark?.trim() || null,
    area: b.area?.trim() || null,
    district: b.district?.trim() || null,
    city: b.city?.trim() || null,
    state: b.state?.trim() || null,
    pincode: b.pincode?.trim() || null,
    address: address || b.address?.trim() || null,
    idType: b.idType || "PAN",
    idNumber: b.idNumber || null,
    panNumber: b.panNumber ? String(b.panNumber).trim().toUpperCase() : null,
    aadhaarNumber: b.aadhaarNumber ? String(b.aadhaarNumber).replace(/\s/g, "") : null,
    bankName: b.bankName || null,
    bankAccount: b.bankAccount || null,
    ifscCode: b.ifscCode || null,
    branchName: b.branchName || null,
    upiId: b.upiId || null,
    taxId: b.taxId || null,
    bankProofType: b.bankProofType ? String(b.bankProofType).toUpperCase() : null,
  };
}
