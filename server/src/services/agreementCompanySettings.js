import { getSetting, setSettings } from "./investSettings.js";
import { getPrimaryBankDetails } from "./paymentGateways.js";

export const AGREEMENT_COMPANY_KEYS = [
  "agreement_company_legal_name",
  "agreement_company_type",
  "agreement_company_registration_no",
  "agreement_company_pan",
  "agreement_company_registered_office",
  "agreement_company_email",
  "agreement_company_website",
  "agreement_rep_name",
  "agreement_rep_designation",
  "agreement_rep_father_name",
  "agreement_jurisdiction",
  "agreement_withdrawal_notice_days",
  "agreement_company_micr",
  "agreement_company_swift",
];

const DEFAULTS = {
  agreement_company_legal_name: "AKASHYA INVESTMENTS",
  agreement_company_type: "COMPANY / FIRM / LLP",
  agreement_company_registration_no: "",
  agreement_company_pan: "",
  agreement_company_registered_office: "Mumbai, Maharashtra, India",
  agreement_company_email: "support@akshayaexim.com",
  agreement_company_website: "https://akshayaexim.com",
  agreement_rep_name: "",
  agreement_rep_designation: "Authorized Representative / Director / Fund Manager",
  agreement_rep_father_name: "",
  agreement_jurisdiction: "Mumbai, Maharashtra, India",
  agreement_withdrawal_notice_days: "30",
  agreement_company_micr: "",
  agreement_company_swift: "",
};

export async function getAgreementCompanySettings() {
  const map = { ...DEFAULTS };
  for (const key of AGREEMENT_COMPANY_KEYS) {
    const v = await getSetting(key);
    if (v) map[key] = v;
  }
  return map;
}

export async function setAgreementCompanySettings(pairs) {
  const filtered = {};
  for (const [key, value] of Object.entries(pairs)) {
    if (AGREEMENT_COMPANY_KEYS.includes(key) && value !== undefined) {
      filtered[key] = String(value);
    }
  }
  if (Object.keys(filtered).length) await setSettings(filtered);
  return getAgreementCompanySettings();
}

/** Company + bank fields merged for agreement placeholders. */
export async function getAgreementCompanyPlaceholders() {
  const s = await getAgreementCompanySettings();
  const { bank } = await getPrimaryBankDetails();
  return {
    COMPANY_LEGAL_NAME: s.agreement_company_legal_name || DEFAULTS.agreement_company_legal_name,
    COMPANY_TYPE: s.agreement_company_type || DEFAULTS.agreement_company_type,
    COMPANY_REGISTRATION_NO: s.agreement_company_registration_no || "—",
    COMPANY_PAN: s.agreement_company_pan || "—",
    COMPANY_REGISTERED_OFFICE: s.agreement_company_registered_office || DEFAULTS.agreement_company_registered_office,
    COMPANY_EMAIL: s.agreement_company_email || DEFAULTS.agreement_company_email,
    COMPANY_WEBSITE: s.agreement_company_website || DEFAULTS.agreement_company_website,
    COMPANY_REP_NAME: s.agreement_rep_name || s.agreement_company_legal_name || DEFAULTS.agreement_company_legal_name,
    COMPANY_REP_DESIGNATION: s.agreement_rep_designation || DEFAULTS.agreement_rep_designation,
    COMPANY_REP_FATHER_NAME: s.agreement_rep_father_name || "—",
    JURISDICTION: s.agreement_jurisdiction || DEFAULTS.agreement_jurisdiction,
    WITHDRAWAL_NOTICE_DAYS: s.agreement_withdrawal_notice_days || "30",
    COMPANY_BANK_NAME: bank.name || "—",
    COMPANY_BANK_BRANCH: bank.branch || "—",
    COMPANY_BANK_ACCOUNT_NAME: bank.accountName || "—",
    COMPANY_BANK_ACCOUNT: bank.accountNumber || "—",
    COMPANY_BANK_IFSC: bank.ifsc || "—",
    COMPANY_BANK_MICR: s.agreement_company_micr || "—",
    COMPANY_BANK_SWIFT: s.agreement_company_swift || "—",
    COMPANY_NAME: s.agreement_company_legal_name || DEFAULTS.agreement_company_legal_name,
  };
}
