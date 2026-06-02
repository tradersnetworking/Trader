import { PRIVATE_INVESTMENT_AGREEMENT } from "./investmentAgreementTemplate.js";

/** Kuber-style structured agreement templates — adapted for AKASHYA INVESTMENTS (INR). */

const COMPANY = "AKASHYA INVESTMENTS";

const NO_GUARANTEED_RETURNS = `${COMPANY} does not provide guaranteed returns, fixed income assurances, or assured profit schemes. All returns depend upon actual business performance, market conditions, and associated risks. Past performance is not indicative of future results.`;

const RISK_DISCLOSURES = `The Investor acknowledges the following risks:
(a) Market Risk: Financial markets are subject to volatility, and the value of investments may decline.
(b) Operational Risk: Technology failures, system outages, or human error may adversely affect operations.
(c) Liquidity Risk: Investments may not be readily liquidated, and delays in withdrawal may occur.
(d) Regulatory Risk: Changes in law, regulation, or government policy may affect platform operations.
(e) Business Risk: ${COMPANY}'s business performance depends on market conditions outside its control.`;

const AML_KYC_CLAUSE = `AML/KYC Compliance:
(a) The Investor confirms that all funds invested are from lawful sources.
(b) KYC verification is mandatory before any financial activity on the platform.
(c) The Platform may request additional identity or source-of-funds documentation at any time.
(d) False or misleading KYC information may result in immediate account suspension.`;

const DATA_PRIVACY = `Data Privacy & Security:
(a) Personal data is stored securely with strict access controls.
(b) ${COMPANY} will not sell or share personal data with third parties except as required by law.
(c) Users may request data access, correction, or deletion subject to regulatory obligations.`;

const FORCE_MAJEURE = `Force Majeure: ${COMPANY} shall not be liable for failure or delay arising from circumstances beyond reasonable control including government orders, cyber attacks, banking restrictions, natural disasters, or pandemics.`;

const LIMITATION_OF_LIABILITY = `Limitation of Liability: ${COMPANY}'s total liability shall not exceed the actual amount invested by the Investor in the relevant plan. No liability for indirect or consequential damages.`;

const DISPUTE_RESOLUTION = `Dispute Resolution: Disputes shall first be resolved through good-faith negotiation, then binding arbitration under the Arbitration and Conciliation Act, 1996 (India). Governed by laws of India.`;

const INVESTOR_DETAILS = `Investor Details (Auto-filled):
Full Name: {{FULL_NAME}}
Email: {{EMAIL}}
Mobile: {{MOBILE}}
Investor ID: {{INVESTOR_ID}}
PAN: {{PAN_NUMBER}}
Aadhaar: {{AADHAAR_NUMBER}}
Address: {{FULL_ADDRESS}}
KYC Status: {{KYC_STATUS}}
Bank: {{BANK_NAME}} · A/C {{BANK_ACCOUNT_MASKED}} · IFSC {{IFSC_CODE}}
UPI: {{UPI_ID}}`;

const AGREEMENT_META = `Agreement Reference: {{AGREEMENT_UID}}
Agreement Date: {{AGREEMENT_DATE}}
IP Address: {{IP_ADDRESS}}
Device: {{DEVICE_INFO}}
Verification Hash: {{PDF_HASH}}`;

const STANDARD_TERMS = `1. NO GUARANTEED RETURNS: ${NO_GUARANTEED_RETURNS}

2. RISK DISCLOSURE: ${RISK_DISCLOSURES}

3. AML/KYC: ${AML_KYC_CLAUSE}

4. DATA PRIVACY: ${DATA_PRIVACY}

5. FORCE MAJEURE: ${FORCE_MAJEURE}

6. LIMITATION OF LIABILITY: ${LIMITATION_OF_LIABILITY}

7. DISPUTE RESOLUTION: ${DISPUTE_RESOLUTION}`;

export const DEFAULT_TEMPLATES = [
  PRIVATE_INVESTMENT_AGREEMENT,
  {
    type: "profit_sharing",
    title: "AKASHYA INVESTMENTS PROFIT SHARING AGREEMENT",
    sections: [
      {
        heading: "PARTIES & PROFIT SHARING DETAILS",
        body: `This Profit Sharing Agreement is entered into as of {{AGREEMENT_DATE}} between ${COMPANY} and:\n\n${INVESTOR_DETAILS}\n\nInvestment Amount: {{INVESTMENT_AMOUNT}} | Plan: {{PLAN_NAME}}\nMonthly ROI: {{ROI_RATE}} | Profit Share — Platform: {{PROFIT_SHARING}}% | Investor: {{INVESTOR_SHARE}}%`,
      },
      { heading: "PROFIT DISTRIBUTION & STANDARD TERMS", body: `${NO_GUARANTEED_RETURNS}\n\nProfits, if any, are calculated on net returns and reported via the investor dashboard.\n\n${STANDARD_TERMS}` },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "risk_disclosure",
    title: "AKASHYA INVESTMENTS COMPREHENSIVE RISK DISCLOSURE",
    sections: [
      { heading: "INVESTOR ACKNOWLEDGEMENT", body: `Acknowledged by:\n\n${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      { heading: "COMPREHENSIVE RISK DISCLOSURES", body: RISK_DISCLOSURES },
      { heading: "NO GUARANTEED RETURNS", body: NO_GUARANTEED_RETURNS },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "aml_kyc",
    title: "AKASHYA INVESTMENTS AML/KYC COMPLIANCE DECLARATION",
    sections: [
      { heading: "DECLARANT DETAILS", body: `Submitted by:\n\n${INVESTOR_DETAILS}\n\nVerification Status: {{KYC_STATUS}}` },
      { heading: "SOURCE OF FUNDS DECLARATION", body: `The Declarant confirms all funds are from lawful sources and is the beneficial owner.` },
      { heading: "AML/KYC COMPLIANCE", body: AML_KYC_CLAUSE },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "privacy_policy",
    title: "AKASHYA INVESTMENTS PRIVACY POLICY ACCEPTANCE",
    sections: [
      { heading: "USER ACKNOWLEDGEMENT", body: `${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      { heading: "DATA PRIVACY & SECURITY", body: DATA_PRIVACY },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "terms_conditions",
    title: "AKASHYA INVESTMENTS TERMS & CONDITIONS ACCEPTANCE",
    sections: [
      { heading: "USER ACKNOWLEDGEMENT", body: `${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      { heading: "PLATFORM USAGE", body: `By using {{PORTAL_URL}} you agree to provide accurate information and comply with applicable laws.` },
      { heading: "STANDARD TERMS", body: STANDARD_TERMS },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "withdrawal_policy",
    title: "AKASHYA INVESTMENTS WITHDRAWAL POLICY ACCEPTANCE",
    sections: [
      { heading: "USER ACKNOWLEDGEMENT", body: `${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      {
        heading: "WITHDRAWAL TERMS",
        body: `(a) Withdrawals require verified KYC and admin approval.\n(b) Payouts are sent to registered UPI ({{UPI_ID}}) or bank ({{BANK_NAME}}).\n(c) Processing time: 3–7 business days subject to AML checks.\n(d) Minimum withdrawal limits apply as communicated on the platform.`,
      },
      { heading: "AML/KYC COMPLIANCE", body: AML_KYC_CLAUSE },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
];

export function getDefaultTemplate(type) {
  return DEFAULT_TEMPLATES.find((t) => t.type === type) || DEFAULT_TEMPLATES.find((t) => t.type === "terms_conditions");
}

export function templateContentToMarkdown(template) {
  return template.sections.map((s) => `## ${s.heading}\n\n${s.body}`).join("\n\n");
}

export function fillTemplatePlaceholders(text, data) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `[${key}]`);
}

export function dbTemplateToContent(row) {
  const sections = row.content.split(/\n(?=## )/).filter(Boolean);
  if (sections.length <= 1) {
    return { type: row.type, title: row.title, sections: [{ heading: row.title, body: row.content }] };
  }
  return {
    type: row.type,
    title: row.title,
    sections: sections.map((block) => {
      const lines = block.split("\n");
      const heading = lines[0].replace(/^#+\s*/, "").trim();
      const body = lines.slice(1).join("\n").trim();
      return { heading, body };
    }),
  };
}

export function templateToFilledMarkdown(template, data) {
  const title = fillTemplatePlaceholders(template.title, data);
  const sections = template.sections.map((s) => ({
    heading: fillTemplatePlaceholders(s.heading, data),
    body: fillTemplatePlaceholders(s.body, data),
  }));
  return { title, sections, markdown: templateContentToMarkdown({ title, sections }) };
}

/** Placeholder catalog for admin template editor (Kuber-style shortcodes). */
export const AGREEMENT_PLACEHOLDERS = [
  { key: "FULL_NAME", label: "Investor full name", group: "Investor", example: "Rajesh Kumar" },
  { key: "FATHER_NAME", label: "Investor father's name", group: "Investor", example: "Suresh Kumar" },
  { key: "EMAIL", label: "Investor email", group: "Investor", example: "raj@example.com" },
  { key: "MOBILE", label: "Investor mobile", group: "Investor", example: "+91 98765 43210" },
  { key: "INVESTOR_ID", label: "Investor ID", group: "Investor", example: "clx…" },
  { key: "PAN_NUMBER", label: "Investor PAN", group: "KYC", example: "ABCDE1234F" },
  { key: "AADHAAR_NUMBER", label: "Investor Aadhaar", group: "KYC", example: "XXXX-XXXX-1234" },
  { key: "FULL_ADDRESS", label: "Investor full address", group: "KYC", example: "Mumbai, Maharashtra, India" },
  { key: "KYC_STATUS", label: "KYC status", group: "KYC", example: "APPROVED" },
  { key: "PLAN_NAME", label: "Plan name", group: "Investment", example: "Gold Plan 12M" },
  { key: "PLAN_TYPE", label: "Plan category", group: "Investment", example: "GOLD" },
  { key: "INVESTMENT_AMOUNT", label: "Investment amount (formatted INR)", group: "Investment", example: "₹1,00,000" },
  { key: "INVESTMENT_AMOUNT_WORDS", label: "Amount in words", group: "Investment", example: "One Lakh Rupees" },
  { key: "INVESTMENT_AMOUNT_RAW", label: "Investment amount (number)", group: "Investment", example: "100000" },
  { key: "PROFIT_SHARE_PCT", label: "Investor profit share %", group: "Investment", example: "10" },
  { key: "MONTHLY_ROI", label: "Monthly ROI %", group: "Investment", example: "10%" },
  { key: "ROI_RATE", label: "Monthly ROI % (alias)", group: "Investment", example: "10" },
  { key: "ANNUAL_ROI", label: "Annual ROI %", group: "Investment", example: "120%" },
  { key: "PROFIT_DISTRIBUTION_CYCLE", label: "Profit payout frequency", group: "Investment", example: "Monthly" },
  { key: "SETTLEMENT_CYCLE", label: "Settlement cycle code", group: "Investment", example: "MONTHLY" },
  { key: "LOCK_IN", label: "Lock-in (days + months)", group: "Investment", example: "360 days (12 months)" },
  { key: "LOCK_IN_MONTHS", label: "Lock-in months", group: "Investment", example: "12" },
  { key: "LOCK_IN_YEARS", label: "Lock-in years", group: "Investment", example: "1" },
  { key: "LOCK_IN_DAYS", label: "Lock-in days", group: "Investment", example: "360" },
  { key: "START_DATE", label: "Investment start date", group: "Investment", example: "1 June 2026" },
  { key: "MATURITY_DATE", label: "Maturity date", group: "Investment", example: "1 June 2027" },
  { key: "MATURITY_VALUE", label: "Projected maturity value", group: "Investment", example: "₹2,20,000" },
  { key: "SUBSCRIPTION_ID", label: "Subscription ID", group: "Investment", example: "clx…" },
  { key: "PROFIT_SHARING", label: "Platform profit share %", group: "Investment", example: "10" },
  { key: "INVESTOR_SHARE", label: "Investor share % (100 − platform)", group: "Investment", example: "90" },
  { key: "BANK_NAME", label: "Investor bank name", group: "Banking", example: "HDFC Bank" },
  { key: "BRANCH_NAME", label: "Investor bank branch", group: "Banking", example: "Andheri West" },
  { key: "BANK_ACCOUNT_NAME", label: "Investor account holder name", group: "Banking", example: "Rajesh Kumar" },
  { key: "BANK_ACCOUNT", label: "Investor account number", group: "Banking", example: "1234567890" },
  { key: "BANK_ACCOUNT_MASKED", label: "Masked investor account", group: "Banking", example: "••••7890" },
  { key: "IFSC_CODE", label: "Investor IFSC", group: "Banking", example: "HDFC0001234" },
  { key: "INVESTOR_MICR", label: "Investor MICR", group: "Banking", example: "—" },
  { key: "INVESTOR_SWIFT", label: "Investor SWIFT", group: "Banking", example: "—" },
  { key: "UPI_ID", label: "Investor UPI ID", group: "Banking", example: "raj@upi" },
  { key: "COMPANY_LEGAL_NAME", label: "Company legal name", group: "Company", example: "AKASHYA INVESTMENTS" },
  { key: "COMPANY_TYPE", label: "Company / Firm / LLP", group: "Company", example: "COMPANY" },
  { key: "COMPANY_REGISTRATION_NO", label: "Registration number", group: "Company", example: "U12345…" },
  { key: "COMPANY_PAN", label: "Company PAN", group: "Company", example: "AABCA1234A" },
  { key: "COMPANY_REGISTERED_OFFICE", label: "Registered office", group: "Company", example: "Mumbai, India" },
  { key: "COMPANY_EMAIL", label: "Company email", group: "Company", example: "support@akshayaexim.com" },
  { key: "COMPANY_WEBSITE", label: "Company website", group: "Company", example: "https://akshayaexim.com" },
  { key: "COMPANY_REP_NAME", label: "Authorized representative name", group: "Company", example: "Director Name" },
  { key: "COMPANY_REP_DESIGNATION", label: "Representative designation", group: "Company", example: "Director / Fund Manager" },
  { key: "COMPANY_REP_FATHER_NAME", label: "Representative father's name", group: "Company", example: "—" },
  { key: "COMPANY_BANK_NAME", label: "Company bank name", group: "Company Banking", example: "HDFC Bank" },
  { key: "COMPANY_BANK_BRANCH", label: "Company bank branch", group: "Company Banking", example: "Mumbai Main" },
  { key: "COMPANY_BANK_ACCOUNT_NAME", label: "Company account name", group: "Company Banking", example: "AKASHYA INVESTMENTS" },
  { key: "COMPANY_BANK_ACCOUNT", label: "Company account number", group: "Company Banking", example: "9876543210" },
  { key: "COMPANY_BANK_IFSC", label: "Company IFSC", group: "Company Banking", example: "HDFC0000001" },
  { key: "COMPANY_BANK_MICR", label: "Company MICR", group: "Company Banking", example: "—" },
  { key: "COMPANY_BANK_SWIFT", label: "Company SWIFT", group: "Company Banking", example: "—" },
  { key: "JURISDICTION", label: "Legal jurisdiction", group: "Legal", example: "Mumbai, Maharashtra" },
  { key: "WITHDRAWAL_NOTICE_DAYS", label: "Withdrawal notice (days)", group: "Legal", example: "30" },
  { key: "AGREEMENT_DAY", label: "Agreement day", group: "Dates", example: "1" },
  { key: "AGREEMENT_MONTH", label: "Agreement month", group: "Dates", example: "June" },
  { key: "AGREEMENT_YEAR", label: "Agreement year", group: "Dates", example: "2026" },
  { key: "AGREEMENT_UID", label: "Agreement reference UID", group: "Metadata", example: "AE-AGR-2026-00001" },
  { key: "AGREEMENT_DATE", label: "Agreement date (full)", group: "Metadata", example: "1 June 2026" },
  { key: "IP_ADDRESS", label: "Sign IP address", group: "Metadata", example: "192.168.1.1" },
  { key: "DEVICE_INFO", label: "Sign device", group: "Metadata", example: "Mobile" },
  { key: "PDF_HASH", label: "Verification hash", group: "Metadata", example: "sha256…" },
  { key: "COMPANY_NAME", label: "Company name (short)", group: "Platform", example: "AKASHYA INVESTMENTS" },
  { key: "SUPPORT_EMAIL", label: "Support email", group: "Platform", example: "support@akshayaexim.in" },
  { key: "PORTAL_URL", label: "Invest portal URL", group: "Platform", example: "https://invest.akshayaexim.com" },
  { key: "CURRENCY", label: "Currency", group: "Platform", example: "INR" },
];
