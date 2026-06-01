/** Kuber-style structured agreement templates — adapted for Akshaya Exim Invest (INR). */

const COMPANY = "Akshaya Exim Traders";

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
  {
    type: "investment",
    title: "AKSHAYA EXIM PRIVATE INVESTMENT & PROFIT SHARING AGREEMENT",
    sections: [
      {
        heading: "PARTIES, INVESTOR & PLAN DETAILS",
        body: `This Investment Agreement is entered into as of {{AGREEMENT_DATE}} between ${COMPANY} ("Platform") and the Investor identified below.\n\n${INVESTOR_DETAILS}\n\nSelected Plan: {{PLAN_NAME}} ({{PLAN_TYPE}})\nInvestment Amount: {{INVESTMENT_AMOUNT}} ({{CURRENCY}})\nMonthly ROI: {{ROI_RATE}} | Annual ROI: {{ANNUAL_ROI}}\nLock-in: {{LOCK_IN}} | Settlement: {{SETTLEMENT_CYCLE}}\nStart Date: {{START_DATE}} | Maturity Date: {{MATURITY_DATE}}\nProjected Maturity Value: {{MATURITY_VALUE}}\nSubscription Ref: {{SUBSCRIPTION_ID}}`,
      },
      {
        heading: "ROI, PROFIT SHARING & SERVICE TERMS",
        body: `Profit distributions are credited per the selected plan settlement cycle subject to actual performance.\nProfit Share — Platform: {{PROFIT_SHARING}}% | Investor: {{INVESTOR_SHARE}}%\n\n${NO_GUARANTEED_RETURNS}`,
      },
      { heading: "STANDARD LEGAL TERMS & DISCLOSURES", body: STANDARD_TERMS },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "profit_sharing",
    title: "AKSHAYA EXIM PROFIT SHARING AGREEMENT",
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
    title: "AKSHAYA EXIM COMPREHENSIVE RISK DISCLOSURE",
    sections: [
      { heading: "INVESTOR ACKNOWLEDGEMENT", body: `Acknowledged by:\n\n${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      { heading: "COMPREHENSIVE RISK DISCLOSURES", body: RISK_DISCLOSURES },
      { heading: "NO GUARANTEED RETURNS", body: NO_GUARANTEED_RETURNS },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "aml_kyc",
    title: "AKSHAYA EXIM AML/KYC COMPLIANCE DECLARATION",
    sections: [
      { heading: "DECLARANT DETAILS", body: `Submitted by:\n\n${INVESTOR_DETAILS}\n\nVerification Status: {{KYC_STATUS}}` },
      { heading: "SOURCE OF FUNDS DECLARATION", body: `The Declarant confirms all funds are from lawful sources and is the beneficial owner.` },
      { heading: "AML/KYC COMPLIANCE", body: AML_KYC_CLAUSE },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "privacy_policy",
    title: "AKSHAYA EXIM PRIVACY POLICY ACCEPTANCE",
    sections: [
      { heading: "USER ACKNOWLEDGEMENT", body: `${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      { heading: "DATA PRIVACY & SECURITY", body: DATA_PRIVACY },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "terms_conditions",
    title: "AKSHAYA EXIM TERMS & CONDITIONS ACCEPTANCE",
    sections: [
      { heading: "USER ACKNOWLEDGEMENT", body: `${INVESTOR_DETAILS}\n\nDate: {{AGREEMENT_DATE}}` },
      { heading: "PLATFORM USAGE", body: `By using {{PORTAL_URL}} you agree to provide accurate information and comply with applicable laws.` },
      { heading: "STANDARD TERMS", body: STANDARD_TERMS },
      { heading: "AGREEMENT METADATA", body: AGREEMENT_META },
    ],
  },
  {
    type: "withdrawal_policy",
    title: "AKSHAYA EXIM WITHDRAWAL POLICY ACCEPTANCE",
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

/** Placeholder catalog for admin template editor (Kuber-style). */
export const AGREEMENT_PLACEHOLDERS = [
  { key: "FULL_NAME", label: "Full name", group: "Investor" },
  { key: "EMAIL", label: "Email", group: "Investor" },
  { key: "MOBILE", label: "Mobile", group: "Investor" },
  { key: "INVESTOR_ID", label: "Investor ID", group: "Investor" },
  { key: "PAN_NUMBER", label: "PAN", group: "KYC" },
  { key: "AADHAAR_NUMBER", label: "Aadhaar", group: "KYC" },
  { key: "FULL_ADDRESS", label: "Full address", group: "KYC" },
  { key: "KYC_STATUS", label: "KYC status", group: "KYC" },
  { key: "PLAN_NAME", label: "Plan name", group: "Investment" },
  { key: "PLAN_TYPE", label: "Plan type", group: "Investment" },
  { key: "INVESTMENT_AMOUNT", label: "Investment amount (INR)", group: "Investment" },
  { key: "ROI_RATE", label: "Monthly ROI %", group: "Investment" },
  { key: "ANNUAL_ROI", label: "Annual ROI %", group: "Investment" },
  { key: "LOCK_IN", label: "Lock-in period", group: "Investment" },
  { key: "SETTLEMENT_CYCLE", label: "Settlement cycle", group: "Investment" },
  { key: "START_DATE", label: "Start date", group: "Investment" },
  { key: "MATURITY_DATE", label: "Maturity date", group: "Investment" },
  { key: "MATURITY_VALUE", label: "Projected maturity value", group: "Investment" },
  { key: "SUBSCRIPTION_ID", label: "Subscription ID", group: "Investment" },
  { key: "PROFIT_SHARING", label: "Platform profit share %", group: "Investment" },
  { key: "INVESTOR_SHARE", label: "Investor share %", group: "Investment" },
  { key: "BANK_NAME", label: "Bank name", group: "Banking" },
  { key: "BANK_ACCOUNT_MASKED", label: "Masked account", group: "Banking" },
  { key: "IFSC_CODE", label: "IFSC", group: "Banking" },
  { key: "UPI_ID", label: "UPI ID", group: "Banking" },
  { key: "AGREEMENT_UID", label: "Agreement UID", group: "Metadata" },
  { key: "AGREEMENT_DATE", label: "Agreement date", group: "Metadata" },
  { key: "IP_ADDRESS", label: "IP address", group: "Metadata" },
  { key: "DEVICE_INFO", label: "Device info", group: "Metadata" },
  { key: "PDF_HASH", label: "Verification hash", group: "Metadata" },
  { key: "COMPANY_NAME", label: "Company name", group: "Platform" },
  { key: "SUPPORT_EMAIL", label: "Support email", group: "Platform" },
  { key: "PORTAL_URL", label: "Portal URL", group: "Platform" },
  { key: "CURRENCY", label: "Currency", group: "Platform" },
];
