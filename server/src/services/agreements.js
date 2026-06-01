import { investDb } from "../db.js";
import { buildInvestorPlaceholders, buildSubscriptionPlaceholders, fillTemplate } from "./agreementPlaceholders.js";

export const AGREEMENT_TYPES = [
  { type: "investment", title: "Investment Agreement" },
  { type: "profit_sharing", title: "Profit Sharing Agreement" },
  { type: "risk_disclosure", title: "Risk Disclosure" },
  { type: "aml_kyc", title: "AML / KYC Declaration" },
  { type: "terms_conditions", title: "Terms & Conditions" },
  { type: "withdrawal_policy", title: "Withdrawal Policy" },
  { type: "privacy_policy", title: "Privacy Policy" },
];

const INVESTMENT_TEMPLATE = `# Investment Agreement

**Agreement ID:** {{AGREEMENT_UID}}
**Date:** {{DATE}}

---

## Parties

This Investment Agreement ("Agreement") is entered into between:

| | |
|---|---|
| **Company** | {{COMPANY_NAME}} |
| **Investor** | {{INVESTOR_NAME}} |
| **Email** | {{INVESTOR_EMAIL}} |
| **Phone** | {{INVESTOR_PHONE}} |
| **PAN** | {{PAN_NUMBER}} |
| **Aadhaar** | {{AADHAAR_NUMBER}} |
| **Address** | {{ADDRESS}}, {{CITY}}, {{STATE}}, {{COUNTRY}} |

---

## Investment Details

| Field | Value |
|-------|-------|
| Plan | **{{PLAN_NAME}}** ({{PLAN_TYPE}}) |
| Subscription Ref | \`{{SUBSCRIPTION_ID}}\` |
| Investment Amount | **{{INVESTMENT_AMOUNT}}** |
| Lock-in Period | {{LOCK_IN}} |
| Monthly ROI | {{MONTHLY_ROI}} |
| Annual ROI | {{ANNUAL_ROI}} |
| Settlement Cycle | {{SETTLEMENT_CYCLE}} |
| Start Date | {{START_DATE}} |
| Maturity Date | {{MATURITY_DATE}} |
| Projected Maturity Value | {{MATURITY_VALUE}} |
| Est. Monthly Return | {{MONTHLY_RETURN}} |

---

## Payout / Banking Details

| Field | Value |
|-------|-------|
| Bank Name | {{BANK_NAME}} |
| Account Number | {{BANK_ACCOUNT_MASKED}} |
| IFSC | {{IFSC_CODE}} |
| Branch | {{BRANCH_NAME}} |
| UPI ID | {{UPI_ID}} |

---

## Terms & Conditions

1. The Investor confirms that all KYC information provided is true and accurate.
2. The Investor agrees to invest **{{INVESTMENT_AMOUNT}}** in the **{{PLAN_NAME}}** plan for a lock-in of **{{LOCK_IN}}**.
3. Returns are calculated at **{{MONTHLY_ROI}}** per month as per the selected plan.
4. Compounding applies only after the lock-in period is completed.
5. Maturity proceeds will be processed per the Investor's chosen option (Wallet / Withdraw / Reinvest).
6. The Investor acknowledges investment risks as per the Risk Disclosure document.
7. Disputes shall be subject to jurisdiction in India.

**Portal:** {{PORTAL_URL}} | **Support:** {{SUPPORT_EMAIL}}

---

**Investor Signature:** _________________________
**Date:** {{DATE}}
`;

const DEFAULT_TEMPLATES = {
  investment: INVESTMENT_TEMPLATE,
  profit_sharing: `# Profit Sharing Agreement\n\n**Agreement ID:** {{AGREEMENT_UID}}\n**Date:** {{DATE}}\n\nInvestor **{{INVESTOR_NAME}}** ({{INVESTOR_EMAIL}}, PAN: {{PAN_NUMBER}}) agrees to monthly profit sharing per plan ROI on investment in **{{PLAN_NAME}}**.\n\n- Amount: {{INVESTMENT_AMOUNT}}\n- Monthly ROI: {{MONTHLY_ROI}}\n- Settlement: {{SETTLEMENT_CYCLE}}\n\n**Bank:** {{BANK_NAME}} · {{BANK_ACCOUNT_MASKED}} · IFSC {{IFSC_CODE}}\n**UPI:** {{UPI_ID}}`,
  risk_disclosure: `# Risk Disclosure\n\n**Date:** {{DATE}}\n\nDear **{{INVESTOR_NAME}}**,\n\nInvestments carry market and liquidity risks. Past performance does not guarantee future returns. Please read all plan terms before investing.`,
  aml_kyc: `# AML / KYC Declaration\n\n**Date:** {{DATE}}\n\nI, **{{INVESTOR_NAME}}** (PAN: {{PAN_NUMBER}}, Aadhaar: {{AADHAAR_NUMBER}}), declare that all KYC information submitted is true and accurate. I authorize {{COMPANY_NAME}} to verify my identity and banking details.`,
  terms_conditions: `# Terms & Conditions\n\nBy using {{PORTAL_URL}} you agree to platform terms.\n\nSupport: {{SUPPORT_EMAIL}}`,
  withdrawal_policy: `# Withdrawal Policy\n\nWithdrawals require verified KYC and admin approval. Payouts are sent to registered UPI (**{{UPI_ID}}**) or bank account (**{{BANK_NAME}}**).`,
  privacy_policy: `# Privacy Policy\n\nContact {{SUPPORT_EMAIL}} for data requests.`,
};

async function nextAgreementUid() {
  const year = new Date().getFullYear();
  const count = await investDb.agreement.count({ where: { agreementUid: { not: null } } });
  return `AE-AGR-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function ensureDefaultTemplates() {
  for (const t of AGREEMENT_TYPES) {
    const existing = await investDb.agreementTemplate.findUnique({ where: { type: t.type } });
    if (!existing) {
      await investDb.agreementTemplate.create({
        data: { type: t.type, title: t.title, content: DEFAULT_TEMPLATES[t.type] || `# ${t.title}` },
      });
    } else if (t.type === "investment" && existing.content.length < 500) {
      await investDb.agreementTemplate.update({
        where: { type: t.type },
        data: { content: INVESTMENT_TEMPLATE, version: "2.0" },
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

export async function generateSubscriptionAgreement(investorId, subscriptionId) {
  await ensureDefaultTemplates();
  const template = await investDb.agreementTemplate.findUnique({ where: { type: "investment" } });
  if (!template?.isActive) throw new Error("Investment agreement template not available");

  const existing = await investDb.agreement.findFirst({
    where: { subscriptionId, status: { not: "PURGED" } },
  });
  if (existing) return existing;

  const placeholders = await buildSubscriptionPlaceholders(investorId, subscriptionId);
  const agreementUid = await nextAgreementUid();
  placeholders.AGREEMENT_UID = agreementUid;

  const content = fillTemplate(template.content, placeholders);
  const sub = await investDb.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  return investDb.agreement.create({
    data: {
      investorId,
      subscriptionId,
      templateId: template.id,
      agreementUid,
      type: "investment",
      title: `${template.title} — ${sub?.plan?.name || "Plan"}`,
      content,
      filledData: JSON.stringify(placeholders),
      triggerEvent: "subscription_created",
      status: "PENDING_SIGNATURE",
    },
    include: { subscription: { include: { plan: true } } },
  });
}

export async function generateAgreement(investorId, type) {
  await ensureDefaultTemplates();
  const template = await investDb.agreementTemplate.findUnique({ where: { type } });
  if (!template?.isActive) throw new Error("Agreement type not available");
  const placeholders = await buildInvestorPlaceholders(investorId);
  const agreementUid = await nextAgreementUid();
  placeholders.AGREEMENT_UID = agreementUid;
  const content = fillTemplate(template.content, placeholders);
  return investDb.agreement.create({
    data: {
      investorId,
      templateId: template.id,
      agreementUid,
      type,
      title: template.title,
      content,
      filledData: JSON.stringify(placeholders),
      triggerEvent: "manual_request",
      status: "PENDING_SIGNATURE",
    },
  });
}

export async function listInvestorAgreements(investorId, { includePurged = false } = {}) {
  return investDb.agreement.findMany({
    where: { investorId, ...(includePurged ? {} : { status: { not: "PURGED" } }) },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } } },
  });
}

export async function signAgreement(investorId, agreementId, signatureData) {
  const ag = await investDb.agreement.findFirst({
    where: { id: agreementId, investorId, status: "PENDING_SIGNATURE" },
    include: { investor: true },
  });
  if (!ag) throw new Error("Agreement not found or already signed");

  const signedAt = new Date();
  const signedBlock = `\n\n---\n**Digitally Signed by ${ag.investor?.name || "Investor"}** on ${signedAt.toLocaleDateString("en-IN")}\n\n![Signature](${signatureData})`;

  return investDb.agreement.update({
    where: { id: ag.id },
    data: {
      status: "SIGNED",
      signatureData,
      signedAt,
      content: ag.content + signedBlock,
    },
    include: { subscription: { include: { plan: true } } },
  });
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
      investor: { select: { name: true, email: true } },
      subscription: { include: { plan: true } },
    },
  });
}

export async function adminGenerateForInvestor(investorId, type) {
  return generateAgreement(investorId, type);
}

export async function revokeAgreement(id) {
  return investDb.agreement.update({ where: { id }, data: { status: "REVOKED" } });
}
