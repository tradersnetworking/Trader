/** Sectional invest KYC review — personal, identity, banking, signature */

export const KYC_SECTIONS = ["personal", "identity", "banking", "signature"];

export const KYC_SECTION_LABELS = {
  personal: "Personal & address",
  identity: "Identity (PAN, Aadhaar, photo)",
  banking: "Bank account & proof",
  signature: "Signature",
};

const EMPTY_REVIEW = { status: "PENDING", remarks: null, reviewedAt: null, docs: {} };

/** Document field → review section (mirrors web kyc-document-fields.js). */
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
  return KYC_DOCUMENT_SECTION[key] || null;
}

export function presentDocumentsInSection(kyc, sectionId) {
  if (!kyc) return [];
  const keys = [];
  for (const [key, sec] of Object.entries(KYC_DOCUMENT_SECTION)) {
    if (sec !== sectionId) continue;
    if (key === "signatureData") {
      if (kyc.signatureData) keys.push(key);
      continue;
    }
    if (key === "signature") {
      if (kyc.signature) keys.push(key);
      continue;
    }
    if (kyc[key]) keys.push(key);
  }
  return [...new Set(keys)];
}

function normalizeSectionEntry(s) {
  const docs = s?.docs && typeof s.docs === "object" ? { ...s.docs } : {};
  return {
    status: s?.status || "PENDING",
    remarks: s?.remarks || null,
    reviewedAt: s?.reviewedAt || null,
    docs,
  };
}

export function recomputeSectionStatusFromDocs(reviews, kyc, sectionId) {
  const section = reviews[sectionId] || { ...EMPTY_REVIEW };
  const present = presentDocumentsInSection(kyc, sectionId);
  if (!present.length) return section;
  const docs = section.docs || {};
  if (present.some((k) => docs[k] === "REJECTED")) {
    section.status = "REJECTED";
  } else if (present.every((k) => docs[k] === "APPROVED")) {
    section.status = "APPROVED";
    section.remarks = null;
    section.reviewedAt = new Date().toISOString();
  } else {
    section.status = "PENDING";
  }
  reviews[sectionId] = section;
  return section;
}

export function parseSectionReviews(kyc) {
  if (!kyc?.sectionReviews) return null;
  try {
    const raw = typeof kyc.sectionReviews === "string" ? JSON.parse(kyc.sectionReviews) : kyc.sectionReviews;
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const id of KYC_SECTIONS) {
      out[id] = normalizeSectionEntry(raw[id]);
    }
    return out;
  } catch {
    return null;
  }
}

export function serializeSectionReviews(reviews) {
  return JSON.stringify(reviews);
}

export function initSectionReviewsPending() {
  const reviews = {};
  for (const id of KYC_SECTIONS) reviews[id] = { ...EMPTY_REVIEW, docs: {} };
  return reviews;
}

export function attachSectionReviews(kyc) {
  if (!kyc) return kyc;
  const reviews = parseSectionReviews(kyc) || initSectionReviewsPending();
  return { ...kyc, sectionReviews: reviews };
}

/** In-memory default section map for records submitted before sectional review existed */
export function ensureSectionReviewsOnRecord(kyc) {
  if (!kyc) return null;
  if (parseSectionReviews(kyc)) return attachSectionReviews(kyc);
  if (["PENDING", "REJECTED"].includes(kyc.status)) {
    return attachSectionReviews({
      ...kyc,
      sectionReviews: serializeSectionReviews(initSectionReviewsPending()),
    });
  }
  return { ...kyc, sectionReviews: null };
}

export function getRejectedSections(kyc) {
  const reviews = parseSectionReviews(kyc);
  if (!reviews) return [...KYC_SECTIONS];
  return KYC_SECTIONS.filter((id) => reviews[id]?.status === "REJECTED");
}

export function getApprovedSections(kyc) {
  const reviews = parseSectionReviews(kyc);
  if (!reviews) return [];
  return KYC_SECTIONS.filter((id) => reviews[id]?.status === "APPROVED");
}

export function allSectionsApproved(kyc) {
  const reviews = parseSectionReviews(kyc);
  if (!reviews) return false;
  return KYC_SECTIONS.every((id) => reviews[id]?.status === "APPROVED");
}

export function hasRejectedSections(kyc) {
  return getRejectedSections(kyc).length > 0;
}

/** Sections investor must complete on this submit */
export function sectionsRequiredForSubmit(kyc) {
  if (!kyc || kyc.status === "NOT_SUBMITTED") return [...KYC_SECTIONS];
  if (kyc.status === "REJECTED") {
    const rejected = getRejectedSections(kyc);
    return rejected.length ? rejected : [...KYC_SECTIONS];
  }
  return [...KYC_SECTIONS];
}

export function isSectionApproved(kyc, sectionId) {
  const reviews = parseSectionReviews(kyc);
  return reviews?.[sectionId]?.status === "APPROVED";
}

export function resetSectionsForResubmit(reviews, sectionIds) {
  const next = { ...reviews };
  for (const id of sectionIds) {
    next[id] = { status: "PENDING", remarks: null, reviewedAt: null };
  }
  return next;
}

export function setSectionDecision(reviews, sectionId, status, remarks, kyc = null) {
  const next = { ...(reviews || initSectionReviewsPending()) };
  const prev = next[sectionId] || { ...EMPTY_REVIEW, docs: {} };
  const docs = { ...(prev.docs || {}) };
  if (status === "APPROVED" && kyc) {
    for (const key of presentDocumentsInSection(kyc, sectionId)) {
      docs[key] = "APPROVED";
    }
  } else if (status === "REJECTED" && kyc) {
    for (const key of presentDocumentsInSection(kyc, sectionId)) {
      if (docs[key] !== "APPROVED") docs[key] = "REJECTED";
    }
  }
  next[sectionId] = {
    status,
    remarks: status === "REJECTED" ? remarks || "Please correct and resubmit this section." : null,
    reviewedAt: new Date().toISOString(),
    docs,
  };
  return next;
}

export function setDocumentDecision(reviews, kyc, documentKey, status, remarks) {
  const sectionId = sectionForDocumentKey(documentKey);
  if (!sectionId) return reviews;
  const next = { ...(reviews || initSectionReviewsPending()) };
  const prev = next[sectionId] || { ...EMPTY_REVIEW, docs: {} };
  const docs = { ...(prev.docs || {}) };
  docs[documentKey] = status;
  next[sectionId] = { ...prev, docs };
  if (status === "REJECTED") {
    next[sectionId].status = "REJECTED";
    next[sectionId].remarks = remarks || "Please re-upload this document.";
    next[sectionId].reviewedAt = new Date().toISOString();
  } else {
    recomputeSectionStatusFromDocs(next, kyc, sectionId);
  }
  return next;
}

export function deriveKycStatusAfterSectionReview(reviews) {
  if (KYC_SECTIONS.some((id) => reviews[id]?.status === "REJECTED")) return "REJECTED";
  return "PENDING";
}

/** Validate only required sections; returns { error, code } or null */
export function validateKycSections(data, files, existing, requiredSections) {
  const need = (id) => requiredSections.includes(id);
  const panNumber = data.panNumber ? String(data.panNumber).trim().toUpperCase() : "";
  const aadhaarNumber = data.aadhaarNumber ? String(data.aadhaarNumber).replace(/\s/g, "") : "";

  if (need("personal")) {
    if (!data.fullName?.trim()) return { error: "Full name is required" };
    if (!data.houseNo?.trim() && !data.address?.trim()) {
      return { error: "House number / flat and address details are required" };
    }
    if (!data.district?.trim() || !data.state?.trim() || !data.pincode?.trim()) {
      return { error: "District, state and PIN code are required" };
    }
    if (!/^\d{6}$/.test(String(data.pincode || "").trim())) {
      return { error: "PIN code must be 6 digits" };
    }
    if (!data.guardianName?.trim() && !data.fatherName?.trim()) {
      return { error: "Father / Mother / Husband name is required" };
    }
    if (!data.dob) return { error: "Date of birth is required" };
    if (!String(data.phone || "").trim()) return { error: "Mobile number is required" };
  }

  if (need("identity")) {
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
      return { error: "Invalid PAN format (e.g. ABCDE1234F)" };
    }
    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      return { error: "Aadhaar must be a 12-digit number" };
    }
    if (!data.photo) return { error: "Passport size photo is required" };
    if (!panNumber) return { error: "PAN number is required" };
    if (!data.panDocument) return { error: "PAN card photocopy is required" };
    if (!aadhaarNumber) return { error: "Aadhaar number is required" };
    const hasAadhaarDoc = (data.aadhaarFront && data.aadhaarBack) || data.aadhaarDocument;
    if (!hasAadhaarDoc) {
      return { error: "Upload Aadhaar front & back, or a single Aadhaar PDF/image" };
    }
    if (!data.selfie) return { error: "Selfie verification photo is required" };
    if (!data.addressProof) return { error: "Address proof document is required" };
    const idType = String(data.idType || "").toUpperCase();
    if (!["PAN", "AADHAAR", "PASSPORT", "DRIVERS_LICENSE"].includes(idType)) {
      return { error: "Select your primary ID document (PAN, Aadhaar, Passport, or Driving Licence)" };
    }
    if (idType === "PASSPORT") {
      if (!String(data.idNumber || "").trim()) return { error: "Passport number is required" };
      if (!data.passportDocument) return { error: "Passport document upload is required" };
    } else if (idType === "DRIVERS_LICENSE") {
      if (!String(data.idNumber || "").trim()) return { error: "Driving licence number is required" };
      if (!data.driversLicenseDocument) return { error: "Driving licence document upload is required" };
    } else if (idType === "PAN") {
      if (!String(data.idNumber || panNumber || "").trim()) {
        return { error: "PAN number is required when PAN Card is your primary ID" };
      }
    } else if (idType === "AADHAAR") {
      if (!String(data.idNumber || aadhaarNumber || "").trim()) {
        return { error: "Aadhaar number is required when Aadhaar is your primary ID" };
      }
    }
  }

  if (need("banking")) {
    if (!String(data.bankName || "").trim()) return { error: "Bank name is required" };
    if (!String(data.bankAccount || "").trim()) return { error: "Bank account number is required" };
    if (!String(data.ifscCode || "").trim()) return { error: "IFSC code is required" };
    const bankProofType = String(data.bankProofType || "CHEQUE").toUpperCase();
    const bankProofOk =
      (bankProofType === "CHEQUE" && data.cancelledCheque) ||
      (bankProofType === "PASSBOOK" && data.passbookDocument) ||
      (bankProofType === "STATEMENT" && data.bankStatementDocument);
    if (!bankProofOk) {
      return {
        error:
          bankProofType === "PASSBOOK"
            ? "Upload a clear passbook copy (image or unlocked PDF)."
            : bankProofType === "STATEMENT"
              ? "Upload a clear bank statement (image or unlocked PDF — password-protected files are not accepted)."
              : "Upload a clear cancelled cheque copy (image or PDF).",
      };
    }
  }

  if (need("signature")) {
    const hasSignature = data.signatureData || data.signature;
    if (!hasSignature) {
      return {
        error: "A clear signature is required. Draw on the signature pad or upload a sharp signature image (JPG/PNG/PDF).",
        code: "SIGNATURE_REQUIRED",
      };
    }
  }

  return null;
}

/** Investor must pass full validation before status becomes PENDING (under review). */
export function assertInvestorKycSubmitReady(data, files, existing) {
  const err = validateKycSections(data, files || {}, existing, KYC_SECTIONS);
  if (err) return err;
  return null;
}

export function isKycRecordFullySubmitted(record) {
  if (!record) return false;
  return assertInvestorKycSubmitReady(record, {}, record) === null;
}

/** Document fields per section for quality checks on upload */
export const SECTION_DOC_FIELDS = {
  identity: [
    "photo",
    "panDocument",
    "aadhaarFront",
    "aadhaarBack",
    "aadhaarDocument",
    "selfie",
    "addressProof",
    "passportDocument",
  ],
  banking: ["cancelledCheque", "passbookDocument", "bankStatementDocument"],
  signature: ["signature"],
};

export function docFieldsForSections(requiredSections) {
  const keys = new Set();
  for (const section of requiredSections) {
    for (const f of SECTION_DOC_FIELDS[section] || []) keys.add(f);
  }
  return [...keys];
}

const PERSONAL_SCALAR = [
  "fullName", "fatherName", "guardianType", "guardianName", "dob", "phone", "phoneCountryCode",
  "whatsappNumber", "whatsappCountryCode", "country", "houseNo", "street", "landmark", "area",
  "district", "city", "state", "pincode", "address",
];

const IDENTITY_SCALAR = [
  "idType", "idNumber", "panNumber", "aadhaarNumber", "taxId",
  "panDocument", "aadhaarDocument", "aadhaarFront", "aadhaarBack", "passportDocument", "driversLicenseDocument",
  "addressProof", "photo", "selfie",
];

const BANKING_SCALAR = [
  "bankName", "bankAccount", "ifscCode", "branchName", "upiId", "bankProofType",
  "cancelledCheque", "passbookDocument", "bankStatementDocument",
];

const SIGNATURE_SCALAR = ["signature", "signatureData", "signatureMethod"];

const SECTION_SCALAR = {
  personal: PERSONAL_SCALAR,
  identity: IDENTITY_SCALAR,
  banking: BANKING_SCALAR,
  signature: SIGNATURE_SCALAR,
};

/** Keep admin-approved sections unchanged on partial resubmit */
export function mergeApprovedSectionData(data, existing) {
  if (!existing || existing.status !== "REJECTED") return data;
  const reviews = parseSectionReviews(existing);
  if (!reviews) return data;
  const out = { ...data };
  for (const section of KYC_SECTIONS) {
    if (reviews[section]?.status !== "APPROVED") continue;
    for (const key of SECTION_SCALAR[section]) {
      if (existing[key] != null && existing[key] !== "") out[key] = existing[key];
    }
  }
  return out;
}
