import { investDb } from "../db.js";
import { simpleMaturity, compoundedMaturity } from "../utils/invest.js";
import { getSupportEmail } from "./investSettings.js";

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
  const ifscCode = kyc?.ifscCode || inv.ifsc || "—";
  const upiId = kyc?.upiId || inv.upiId || "—";

  return {
    AGREEMENT_UID: "—", // filled when agreement is created
    DATE: fmtDate(new Date()),
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
    IFSC_CODE: ifscCode,
    BRANCH_NAME: kyc?.branchName || "—",
    UPI_ID: upiId,
    PLAN_NAME: sub.plan?.name || "—",
    PLAN_TYPE: sub.plan?.planType || "—",
    SUBSCRIPTION_ID: sub.id,
    INVESTMENT_AMOUNT: fmtInr(sub.amount),
    INVESTMENT_AMOUNT_RAW: String(sub.amount),
    LOCK_IN: `${sub.lockInDays} days (${Math.round(sub.lockInDays / 30)} months)`,
    LOCK_IN_DAYS: String(sub.lockInDays),
    MONTHLY_ROI: `${sub.monthlyRoiPct}%`,
    ANNUAL_ROI: `${sub.plan?.annualRoiPct ?? sub.monthlyRoiPct * 12}%`,
    SETTLEMENT_CYCLE: sub.settlementCycle || "MONTHLY",
    START_DATE: fmtDate(sub.startDate),
    MATURITY_DATE: fmtDate(sub.maturityDate),
    MATURITY_VALUE: fmtInr(proj.maturityValue),
    MONTHLY_RETURN: fmtInr(proj.monthlyReturn),
    COMPANY_NAME: "Akshaya Exim Traders",
    SUPPORT_EMAIL: await getSupportEmail(),
    PORTAL_URL: "https://invest.akshayaexim.com",
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
  return {
    DATE: fmtDate(new Date()),
    INVESTOR_NAME: kyc?.fullName || inv?.name || "—",
    INVESTOR_EMAIL: inv?.email || "—",
    INVESTOR_PHONE: kyc?.phone || inv?.phone || "—",
    PAN_NUMBER: kyc?.panNumber || "—",
    AADHAAR_NUMBER: kyc?.aadhaarNumber || "—",
    BANK_NAME: kyc?.bankName || inv?.bankName || "—",
    BANK_ACCOUNT: kyc?.bankAccount || inv?.accountNumber || "—",
    IFSC_CODE: kyc?.ifscCode || inv?.ifsc || "—",
    UPI_ID: kyc?.upiId || inv?.upiId || "—",
    SUPPORT_EMAIL: await getSupportEmail(),
    COMPANY_NAME: "Akshaya Exim Traders",
  };
}

export function fillTemplate(content, data) {
  let out = content;
  for (const [k, v] of Object.entries(data)) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? "—"));
  }
  return out;
}
