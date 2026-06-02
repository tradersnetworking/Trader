import { createHash, randomBytes } from "crypto";
import { investDb } from "../db.js";
import { simpleMaturity, compoundedMaturity } from "../utils/invest.js";
import { getSupportEmail } from "./investSettings.js";
import { documentOnFileLabel } from "./agreementAssetHelper.js";
import {
  getDefaultTemplate,
  templateContentToMarkdown,
  templateToFilledMarkdown,
  dbTemplateToContent,
  fillTemplatePlaceholders,
  AGREEMENT_PLACEHOLDERS,
} from "./agreementTemplates.js";
import { generateAgreementPDF } from "./agreementPdf.js";
import { getInvestorKycSignatureBase64, getKycSignatureBase64 } from "./kycSignature.js";

export const AGREEMENT_TYPES = [
  { type: "investment", title: "Investment Agreement" },
  { type: "profit_sharing", title: "Profit Sharing Agreement" },
  { type: "risk_disclosure", title: "Risk Disclosure" },
  { type: "aml_kyc", title: "AML / KYC Declaration" },
  { type: "terms_conditions", title: "Terms & Conditions" },
  { type: "withdrawal_policy", title: "Withdrawal Policy" },
  { type: "privacy_policy", title: "Privacy Policy" },
];

export { AGREEMENT_PLACEHOLDERS, getDefaultTemplate, templateContentToMarkdown };

function fmtInr(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

function parseDevice(userAgent) {
  if (!userAgent) return "—";
  if (/mobile/i.test(userAgent)) return "Mobile";
  if (/tablet/i.test(userAgent)) return "Tablet";
  return "Desktop";
}

async function nextAgreementUid() {
  const year = new Date().getFullYear();
  const count = await investDb.agreement.count({ where: { agreementUid: { not: null } } });
  return `AE-AGR-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function resolveTemplate(type) {
  const row = await investDb.agreementTemplate.findUnique({ where: { type } });
  if (row?.isActive) {
    return { content: dbTemplateToContent(row), templateId: row.id, title: row.title };
  }
  const def = getDefaultTemplate(type);
  return { content: def, templateId: row?.id || null, title: def?.title || type };
}

export async function ensureDefaultTemplates() {
  for (const t of AGREEMENT_TYPES) {
    const existing = await investDb.agreementTemplate.findUnique({ where: { type: t.type } });
    const def = getDefaultTemplate(t.type);
    const markdown = templateContentToMarkdown(def);
    if (!existing) {
      await investDb.agreementTemplate.create({
        data: { type: t.type, title: def.title, content: markdown, version: "4.0" },
      });
    } else if (existing.version !== "4.0" && Number(existing.version?.replace(/\D/g, "") || 0) < 4) {
      await investDb.agreementTemplate.update({
        where: { type: t.type },
        data: { title: def.title, content: markdown, version: "4.0" },
      });
    }
  }
}

export async function getTemplates() {
  await ensureDefaultTemplates();
  return investDb.agreementTemplate.findMany({ orderBy: { type: "asc" } });
}

export async function updateTemplate(type, data) {
  await ensureDefaultTemplates();
  return investDb.agreementTemplate.update({ where: { type }, data });
}

async function buildFilledData(investorId, { subscriptionId, ipAddress, userAgent, extraData = {} } = {}) {
  const { buildSubscriptionPlaceholders, buildInvestorPlaceholders, enrichPlaceholders } = await import("./agreementPlaceholders.js");
  const base = subscriptionId
    ? await buildSubscriptionPlaceholders(investorId, subscriptionId)
    : await buildInvestorPlaceholders(investorId);
  const agreementUid = base.AGREEMENT_UID && base.AGREEMENT_UID !== "—" ? base.AGREEMENT_UID : await nextAgreementUid();
  const enriched = enrichPlaceholders(base, { investorId, ipAddress, userAgent, agreementUid });
  return { ...enriched, ...extraData, AGREEMENT_UID: agreementUid };
}

async function createAgreementRecord({ investorId, type, subscriptionId, triggerEvent, filledData, templateId, ipAddress, userAgent }) {
  const { content: template, title } = await resolveTemplate(type);
  const filled = templateToFilledMarkdown(template, filledData);
  const contentHash = createHash("sha256").update(JSON.stringify(filledData) + filledData.AGREEMENT_UID).digest("hex");
  filledData.PDF_HASH = `${contentHash.slice(0, 40)}...`;

  return investDb.agreement.create({
    data: {
      investorId,
      subscriptionId: subscriptionId || null,
      templateId,
      agreementUid: filledData.AGREEMENT_UID,
      type,
      title: `${title.includes("AKSHAYA") ? filled.title : title}${subscriptionId ? ` — ${filledData.PLAN_NAME || ""}` : ""}`.trim(),
      content: filled.markdown,
      filledData: JSON.stringify(filledData),
      triggerEvent,
      status: "PENDING_SIGNATURE",
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      pdfHash: contentHash,
    },
    include: { subscription: { include: { plan: true } } },
  });
}

export async function generateSubscriptionAgreement(investorId, subscriptionId, meta = {}) {
  await ensureDefaultTemplates();
  const template = await investDb.agreementTemplate.findUnique({ where: { type: "investment" } });
  if (!template?.isActive) throw new Error("Investment agreement template not available");

  const existing = await investDb.agreement.findFirst({
    where: { subscriptionId, type: "investment", status: { not: "PURGED" } },
  });
  if (existing) return existing;

  const filledData = await buildFilledData(investorId, { subscriptionId, ...meta });
  const record = await createAgreementRecord({
    investorId,
    type: "investment",
    subscriptionId,
    triggerEvent: "subscription_created",
    filledData,
    templateId: template.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  if (kyc?.status === "APPROVED") {
    const sig = await getKycSignatureBase64(kyc);
    if (sig) {
      try {
        return await signAgreement(investorId, record.id, sig, {
          ...meta,
          method: kyc.signatureMethod || "kyc",
        });
      } catch {
        return record;
      }
    }
  }
  return record;
}

export async function generateAgreement(investorId, type, meta = {}) {
  await ensureDefaultTemplates();
  const template = await investDb.agreementTemplate.findUnique({ where: { type } });
  if (!template?.isActive) throw new Error("Agreement type not available");
  const filledData = await buildFilledData(investorId, meta);
  return createAgreementRecord({
    investorId,
    type,
    triggerEvent: meta.triggerEvent || "manual_request",
    filledData,
    templateId: template.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function previewTemplateContent({ investorId, type, title, content, subscriptionId, ipAddress, userAgent }) {
  const filledData = await buildFilledData(investorId, { subscriptionId, ipAddress, userAgent });
  const template = content
    ? dbTemplateToContent({ type, title, content })
    : (await resolveTemplate(type)).content;
  const filled = templateToFilledMarkdown(template, filledData);
  return { filledData, filledTitle: filled.title, filledContent: filled.markdown };
}

/** Investor dashboard: hide archived plans and agreements tied to ended investments */
export async function listInvestorAgreements(investorId) {
  const rows = await investDb.agreement.findMany({
    where: {
      investorId,
      status: { notIn: ["PURGED", "REVOKED"] },
    },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } } },
  });
  return rows.filter((ag) => {
    if (!ag.subscriptionId) return true;
    if (ag.status === "SIGNED") return true;
    const st = ag.subscription?.status;
    return st === "ACTIVE" || st === "PENDING";
  });
}

/** Super Admin / ops: all agreements for an investor including purged */
export async function listAllAgreementsForInvestor(investorId) {
  return investDb.agreement.findMany({
    where: { investorId },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } } },
  });
}

async function resolveSignatureForAgreement(ag) {
  if (ag.signatureData?.startsWith("data:image")) return ag.signatureData;
  const kyc = await investDb.kyc.findUnique({ where: { investorId: ag.investorId } });
  return getKycSignatureBase64(kyc);
}

function agreementContentAsTemplate(ag) {
  const base = (ag.content || "").split(/\n\n---\n\*\*Digitally Signed/)[0].trim();
  return dbTemplateToContent({ type: ag.type, title: ag.title, content: base });
}

/** Always return a template shape safe for PDFKit (sections array required). */
async function normalizeAgreementTemplate(ag) {
  try {
    const parsed = agreementContentAsTemplate(ag);
    if (parsed?.sections?.length) return parsed;
  } catch {
    /* fall through */
  }
  try {
    const fromDb = (await resolveTemplate(ag.type)).content;
    if (fromDb?.sections?.length) return fromDb;
  } catch {
    /* fall through */
  }
  const def = getDefaultTemplate(ag.type);
  if (def?.sections?.length) return def;
  const body =
    (ag.content || "").split(/\n\n---\n\*\*Digitally Signed/)[0].trim() ||
    "Agreement terms as recorded in the investor portal.";
  return {
    type: ag.type || "investment",
    title: ag.title || "Investment Agreement",
    sections: [{ heading: ag.title || "Agreement", body }],
  };
}

export async function autoSignPendingAgreementsForInvestor(investorId, meta = {}) {
  const sig = await getInvestorKycSignatureBase64(investorId);
  if (!sig) return 0;
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  if (kyc?.status !== "APPROVED") return 0;
  const pending = await investDb.agreement.findMany({
    where: { investorId, status: "PENDING_SIGNATURE" },
  });
  let n = 0;
  for (const ag of pending) {
    try {
      await signAgreement(investorId, ag.id, sig, { ...meta, method: kyc.signatureMethod || "kyc" });
      n += 1;
    } catch {
      /* skip */
    }
  }
  return n;
}

export async function signAgreement(investorId, agreementId, signatureData, meta = {}) {
  const ag = await investDb.agreement.findFirst({
    where: { id: agreementId, investorId, status: "PENDING_SIGNATURE" },
    include: { investor: true },
  });
  if (!ag) throw new Error("Agreement not found or already signed");

  const filledData = JSON.parse(ag.filledData || "{}");
  const verificationHash = createHash("sha256")
    .update(`${ag.agreementUid}|${investorId}|${new Date().toISOString()}|${randomBytes(8).toString("hex")}`)
    .digest("hex");
  filledData.AGREEMENT_STATUS = "SIGNED";
  filledData.PDF_HASH = verificationHash;
  filledData.IP_ADDRESS = meta.ipAddress || filledData.IP_ADDRESS || "—";

  const { content: template } = await resolveTemplate(ag.type);
  const { buffer, hash } = await generateAgreementPDF({
    template: { ...template, title: fillTemplatePlaceholders(template.title, filledData) },
    filledData,
    agreementUid: ag.agreementUid,
    userName: ag.investor?.name || filledData.FULL_NAME,
    signatureBase64: signatureData,
  });

  const signedAt = new Date();
  const signedBlock = `\n\n---\n**Digitally Signed by ${ag.investor?.name || "Investor"}** on ${signedAt.toLocaleDateString("en-IN")}`;

  return investDb.agreement.update({
    where: { id: ag.id },
    data: {
      status: "SIGNED",
      signatureData,
      signMethod: meta.method || "draw",
      signedAt,
      pdfHash: hash,
      filledData: JSON.stringify(filledData),
      content: ag.content + signedBlock,
      ipAddress: meta.ipAddress || ag.ipAddress,
      userAgent: meta.userAgent || ag.userAgent,
    },
    include: { subscription: { include: { plan: true } } },
  });
}

export async function getAgreementPdfBuffer(agreementId, requesterId, { isAdmin = false } = {}) {
  const ag = await investDb.agreement.findUnique({
    where: { id: agreementId },
    include: { investor: true, subscription: true },
  });
  if (!ag) throw new Error("Agreement not found");
  if (!isAdmin && ag.investorId !== requesterId) throw new Error("Forbidden");
  if (!isAdmin && ag.status === "PURGED") {
    throw new Error("This agreement is no longer available. The linked investment has ended.");
  }
  if (!isAdmin && ag.subscriptionId && ag.status !== "SIGNED") {
    const st = ag.subscription?.status;
    if (st && !["ACTIVE", "PENDING"].includes(st)) {
      throw new Error("This agreement is no longer available. The investment has ended.");
    }
  }

  let filledData = {};
  try {
    filledData = JSON.parse(ag.filledData || "{}");
  } catch {
    filledData = {};
  }
  const template = await normalizeAgreementTemplate(ag);
  const signatureBase64 = await resolveSignatureForAgreement(ag);
  const { buffer } = await generateAgreementPDF({
    template: { ...template, title: fillTemplatePlaceholders(template.title || ag.title, filledData) },
    filledData,
    agreementUid: ag.agreementUid,
    userName: ag.investor?.name || filledData.FULL_NAME || filledData.INVESTOR_NAME,
    signatureBase64: signatureBase64 || undefined,
  });
  return buffer;
}

export async function purgeAgreementsForSubscription(subscriptionId, reason = "Plan lifecycle completed") {
  const agreements = await investDb.agreement.findMany({
    where: { subscriptionId, status: { not: "PURGED" } },
  });
  const now = new Date();
  for (const ag of agreements) {
    await investDb.agreement.update({
      where: { id: ag.id },
      data: {
        status: "PURGED",
        purgedAt: now,
        content: `${ag.content}\n\n---\n*[Archived ${now.toLocaleDateString("en-IN")}: ${reason}]*`,
      },
    });
  }
  return agreements.length;
}

export async function listAllAgreements({ status } = {}) {
  return investDb.agreement.findMany({
    where: status ? { status } : { status: { not: "PURGED" } },
    orderBy: { createdAt: "desc" },
    include: {
      investor: { select: { id: true, name: true, email: true } },
      subscription: { include: { plan: true } },
    },
  });
}

export async function adminGenerateForInvestor(investorId, type, meta = {}) {
  return generateAgreement(investorId, type, { ...meta, triggerEvent: "admin_generated" });
}

export async function revokeAgreement(id) {
  return investDb.agreement.update({ where: { id }, data: { status: "REVOKED" } });
}

export async function getAgreementById(id) {
  return investDb.agreement.findUnique({
    where: { id },
    include: { investor: { select: { name: true, email: true } }, subscription: { include: { plan: true } } },
  });
}
