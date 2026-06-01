import { investDb } from "../db.js";
import { simpleMaturity, compoundedMaturity } from "../utils/invest.js";
import { getSupportEmail } from "./investSettings.js";
import { documentOnFileLabel } from "./agreementAssetHelper.js";

function fmtInr(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

function maskAccount(num) {
  if (!num) return "—";
  const s = String(num);
  if (s.length <= 4) return s;
  return `${"•".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function parseDevice(userAgent) {
  if (!userAgent) return "—";
  if (/mobile/i.test(userAgent)) return "Mobile";
  if (/tablet/i.test(userAgent)) return "Tablet";
  return "Desktop";
}

export async function buildSubscriptionPlaceholders(investorId, subscriptionId) {
  const [inv, kyc, sub] = await Promise.all([
    investDb.investor.findUnique({ where: { id: investorId } }),
    investDb.kyc.findUnique({ where: { investorId } }),
    investDb.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    }),
  ]);
  if (!inv || !sub) throw new Error("Investor or subscription not found");

  const matured = new Date() >= new Date(sub.maturityDate);
  const proj = matured
    ? compoundedMaturity(sub.amount, sub.monthlyRoiPct, sub.lockInDays)
    : simpleMaturity(sub.amount, sub.monthlyRoiPct, sub.lockInDays);

  const bankName = kyc?.bankName || inv.bankName || "—";
  const bankAccount = kyc?.bankAccount || inv.accountNumber || "—";
  const profitShare = sub.plan?.profitSharePct ?? 0;

  return {
    AGREEMENT_UID: "—",
    DATE: fmtDate(new Date()),
    AGREEMENT_DATE: fmtDate(new Date()),
    INVESTOR_NAME: kyc?.fullName || inv.name || "—",
    INVESTOR_EMAIL: inv.email || "—",
    INVESTOR_PHONE: kyc?.phone || inv.phone || "—",
    PAN_NUMBER: kyc?.panNumber || kyc?.idNumber || "—",
    AADHAAR_NUMBER: kyc?.aadhaarNumber || "—",
    ID_TYPE: kyc?.idType || "—",
    ID_NUMBER: kyc?.idNumber || "—",
    ADDRESS: kyc?.address || "—",
    CITY: kyc?.city || "—",
    STATE: kyc?.state || "—",
    COUNTRY: kyc?.country || "India",
    DOB: kyc?.dob || "—",
    BANK_NAME: bankName,
    BANK_ACCOUNT: bankAccount,
    BANK_ACCOUNT_MASKED: maskAccount(bankAccount),
    IFSC_CODE: kyc?.ifscCode || inv.ifsc || "—",
    BRANCH_NAME: kyc?.branchName || "—",
    UPI_ID: kyc?.upiId || inv.upiId || "—",
    PLAN_NAME: sub.plan?.name || "—",
    PLAN_TYPE: sub.plan?.planType || "—",
    SUBSCRIPTION_ID: sub.id,
    INVESTMENT_AMOUNT: fmtInr(sub.amount),
    INVESTMENT_AMOUNT_RAW: String(sub.amount),
    LOCK_IN: `${sub.lockInDays} days (${Math.round(sub.lockInDays / 30)} months)`,
    LOCK_IN_DAYS: String(sub.lockInDays),
    MONTHLY_ROI: `${sub.monthlyRoiPct}%`,
    ROI_RATE: `${sub.monthlyRoiPct}`,
    ANNUAL_ROI: `${sub.plan?.annualRoiPct ?? sub.monthlyRoiPct * 12}%`,
    SETTLEMENT_CYCLE: sub.settlementCycle || "MONTHLY",
    START_DATE: fmtDate(sub.startDate),
    MATURITY_DATE: fmtDate(sub.maturityDate),
    MATURITY_VALUE: fmtInr(proj.maturityValue),
    MONTHLY_RETURN: fmtInr(proj.monthlyReturn),
    PROFIT_SHARING: String(profitShare),
    INVESTOR_SHARE: String(Math.max(0, 100 - Number(profitShare || 0))),
    CURRENCY: "INR",
    COMPANY_NAME: "Akshaya Exim Traders",
    SUPPORT_EMAIL: await getSupportEmail(),
    PORTAL_URL: process.env.INVEST_ORIGIN || "https://invest.akshayaexim.com",
    KYC_STATUS: kyc?.status || "NOT SUBMITTED",
    PASSPORT_PHOTO_PATH: kyc?.photo || inv.profilePicture || "",
    AVATAR_PATH: inv.profilePicture || kyc?.photo || "",
    PASSPORT_PHOTO_ON_FILE: documentOnFileLabel(kyc?.photo || inv.profilePicture),
  };
}

export async function buildInvestorPlaceholders(investorId) {
  const sub = await investDb.subscription.findFirst({
    where: { investorId, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (sub) return buildSubscriptionPlaceholders(investorId, sub.id);
  const [inv, kyc] = await Promise.all([
    investDb.investor.findUnique({ where: { id: investorId } }),
    investDb.kyc.findUnique({ where: { investorId } }),
  ]);
  return enrichPlaceholders(
    {
      DATE: fmtDate(new Date()),
      AGREEMENT_DATE: fmtDate(new Date()),
      INVESTOR_NAME: kyc?.fullName || inv?.name || "—",
      INVESTOR_EMAIL: inv?.email || "—",
      INVESTOR_PHONE: kyc?.phone || inv?.phone || "—",
      PAN_NUMBER: kyc?.panNumber || "—",
      AADHAAR_NUMBER: kyc?.aadhaarNumber || "—",
      ADDRESS: kyc?.address || "—",
      CITY: kyc?.city || "—",
      STATE: kyc?.state || "—",
      COUNTRY: kyc?.country || "India",
      BANK_NAME: kyc?.bankName || inv?.bankName || "—",
      BANK_ACCOUNT: kyc?.bankAccount || inv?.accountNumber || "—",
      BANK_ACCOUNT_MASKED: maskAccount(kyc?.bankAccount || inv?.accountNumber),
      IFSC_CODE: kyc?.ifscCode || inv?.ifsc || "—",
      UPI_ID: kyc?.upiId || inv?.upiId || "—",
      KYC_STATUS: kyc?.status || "NOT SUBMITTED",
      CURRENCY: "INR",
      COMPANY_NAME: "Akshaya Exim Traders",
      SUPPORT_EMAIL: await getSupportEmail(),
      PORTAL_URL: process.env.INVEST_ORIGIN || "https://invest.akshayaexim.com",
      PASSPORT_PHOTO_PATH: kyc?.photo || inv?.profilePicture || "",
      AVATAR_PATH: inv?.profilePicture || kyc?.photo || "",
    },
    { investorId }
  );
}

/** Kuber-style alias keys for templates and PDF. */
export function enrichPlaceholders(base, { investorId, ipAddress, userAgent, agreementUid } = {}) {
  const fullAddress = [base.ADDRESS, base.CITY, base.STATE, base.COUNTRY].filter((x) => x && x !== "—").join(", ") || "—";
  return {
    ...base,
    FULL_NAME: base.INVESTOR_NAME || base.FULL_NAME || "—",
    EMAIL: base.INVESTOR_EMAIL || base.EMAIL || "—",
    MOBILE: base.INVESTOR_PHONE || base.MOBILE || "—",
    INVESTOR_ID: investorId || base.INVESTOR_ID || "—",
    FULL_ADDRESS: fullAddress,
    AGREEMENT_DATE: base.AGREEMENT_DATE || base.DATE || fmtDate(new Date()),
    AGREEMENT_UID: agreementUid || base.AGREEMENT_UID || "—",
    IP_ADDRESS: ipAddress || base.IP_ADDRESS || "—",
    DEVICE_INFO: parseDevice(userAgent) || base.DEVICE_INFO || "—",
    ROLE: "INVESTOR",
    PDF_HASH: base.PDF_HASH || "Computed upon signing",
    AGREEMENT_STATUS: base.AGREEMENT_STATUS || "PENDING SIGNATURE",
  };
}

export function fillTemplate(content, data) {
  let out = content;
  for (const [k, v] of Object.entries(data)) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? "—"));
  }
  return out.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `[${key}]`);
}
