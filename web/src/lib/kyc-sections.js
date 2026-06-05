/** Client mirror of server/src/services/kycSections.js */
import { KYC_DOCUMENT_SECTION, sectionForDocumentKey } from "./kyc-document-fields.js";

function presentDocumentsInSection(kyc, sectionId) {
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
      docs: s?.docs && typeof s.docs === "object" ? { ...s.docs } : {},
    };
  }
  return out;
}

export function documentReviewStatus(kyc, documentKey) {
  const sectionId = sectionForDocumentKey(documentKey);
  if (!sectionId) return "PENDING";
  const reviews = parseSectionReviews(kyc);
  return reviews?.[sectionId]?.docs?.[documentKey] || "PENDING";
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

function emptySectionReview() {
  return { status: "PENDING", remarks: null, reviewedAt: null, docs: {} };
}

function recomputeSectionFromDocs(reviews, kyc, sectionId) {
  const section = reviews[sectionId];
  if (!section?.docs) return;
  const present = presentDocumentsInSection(kyc, sectionId);
  if (!present.length) return;
  if (present.some((k) => section.docs[k] === "REJECTED")) {
    section.status = "REJECTED";
  } else if (present.every((k) => section.docs[k] === "APPROVED")) {
    section.status = "APPROVED";
    section.remarks = null;
    section.reviewedAt = new Date().toISOString();
  } else {
    section.status = "PENDING";
  }
}

/** Optimistic client-side section decision before server confirms. */
export function applySectionReviewDecision(kyc, section, status, remarks) {
  if (!kyc) return kyc;
  const reviews = parseSectionReviews(kyc) || {};
  const next = {};
  for (const id of KYC_SECTIONS) {
    next[id] = reviews[id] || emptySectionReview();
  }
  const docs = { ...(next[section].docs || {}) };
  if (status === "APPROVED") {
    for (const key of presentDocumentsInSection(kyc, section)) {
      docs[key] = "APPROVED";
    }
  }
  next[section] = {
    ...next[section],
    status,
    remarks: status === "REJECTED" ? String(remarks || "").trim() || null : null,
    reviewedAt: new Date().toISOString(),
    docs,
  };
  return { ...kyc, sectionReviews: next };
}

/** Optimistic per-document decision — only marks that file, not the whole section. */
export function applyDocumentReviewDecision(kyc, documentKey, status, remarks) {
  if (!kyc) return kyc;
  const sectionId = sectionForDocumentKey(documentKey);
  if (!sectionId) return kyc;
  const reviews = parseSectionReviews(kyc) || {};
  const next = {};
  for (const id of KYC_SECTIONS) {
    next[id] = reviews[id] || emptySectionReview();
  }
  const docs = { ...(next[sectionId].docs || {}) };
  docs[documentKey] = status;
  next[sectionId] = { ...next[sectionId], docs };
  if (status === "REJECTED") {
    next[sectionId].status = "REJECTED";
    next[sectionId].remarks = String(remarks || "").trim() || null;
    next[sectionId].reviewedAt = new Date().toISOString();
  } else {
    recomputeSectionFromDocs(next, kyc, sectionId);
  }
  return { ...kyc, sectionReviews: next };
}
