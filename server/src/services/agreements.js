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
        data: { type: t.type, title: def.title, content: markdown, version: "3.0" },
      });
    } else if (existing.version !== "3.0" && Number(existing.version?.replace(/\D/g, "") || 0) < 3) {
      await investDb.agreementTemplate.update({
        where: { type: t.type },
        data: { title: def.title, content: markdown, version: "3.0" },
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
  return createAgreementRecord({
    investorId,
    type: "investment",
    subscriptionId,
    triggerEvent: "subscription_created",
    filledData,
    templateId: template.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
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

export async function listInvestorAgreements(investorId, { includePurged = false } = {}) {
  return investDb.agreement.findMany({
    where: { investorId, ...(includePurged ? {} : { status: { not: "PURGED" } }) },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } } },
  });
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
    include: { investor: true },
  });
  if (!ag) throw new Error("Agreement not found");
  if (!isAdmin && ag.investorId !== requesterId) throw new Error("Forbidden");

  const filledData = JSON.parse(ag.filledData || "{}");
  const { content: template } = await resolveTemplate(ag.type);
  const { buffer } = await generateAgreementPDF({
    template: { ...template, title: fillTemplatePlaceholders(template.title, filledData) },
    filledData,
    agreementUid: ag.agreementUid,
    userName: ag.investor?.name || filledData.FULL_NAME,
    signatureBase64: ag.signatureData || undefined,
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
