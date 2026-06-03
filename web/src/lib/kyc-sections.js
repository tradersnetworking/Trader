/** Client mirror of server/src/services/kycSections.js */

export const KYC_SECTIONS = ["personal", "identity", "banking", "signature"];

export const KYC_SECTION_LABELS = {
  personal: "Personal & address",
  identity: "Identity (PAN, Aadhaar, photo)",
  banking: "Bank account & proof",
  signature: "Signature",
};

export const STEP_SECTION = {
  0: "personal",
  1: "identity",
  2: "banking",
};

export function parseSectionReviews(kyc) {
  if (!kyc?.sectionReviews) return null;
  const raw = kyc.sectionReviews;
  if (typeof raw === "string") {
    try {
      return normalizeReviews(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return normalizeReviews(raw);
  return null;
}

function normalizeReviews(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const id of KYC_SECTIONS) {
    const s = raw[id];
    out[id] = {
      status: s?.status || "PENDING",
      remarks: s?.remarks || null,
      reviewedAt: s?.reviewedAt || null,
    };
  }
  return out;
}

export function getRejectedSections(kyc) {
  const reviews = parseSectionReviews(kyc);
  if (!reviews) return [];
  return KYC_SECTIONS.filter((id) => reviews[id]?.status === "REJECTED");
}

export function getApprovedSections(kyc) {
  const reviews = parseSectionReviews(kyc);
  if (!reviews) return [];
  return KYC_SECTIONS.filter((id) => reviews[id]?.status === "APPROVED");
}

export function isSectionApproved(kyc, sectionId) {
  return parseSectionReviews(kyc)?.[sectionId]?.status === "APPROVED";
}

export function isSectionRejected(kyc, sectionId) {
  return parseSectionReviews(kyc)?.[sectionId]?.status === "REJECTED";
}

export function canEditSection(kyc, sectionId) {
  if (!kyc || kyc.status === "NOT_SUBMITTED") return true;
  if (kyc.status === "PENDING") return true;
  if (kyc.status !== "REJECTED") return false;
  const reviews = parseSectionReviews(kyc);
  if (!reviews) return true;
  return reviews[sectionId]?.status !== "APPROVED";
}

export function sectionsForStep(step) {
  const base = STEP_SECTION[step];
  if (step === 1) return ["identity", "signature"];
  return base ? [base] : [];
}

export function needsPartialResubmit(kyc) {
  return kyc?.status === "REJECTED" && getRejectedSections(kyc).length > 0;
}

export function sectionStatusBadge(status) {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}
