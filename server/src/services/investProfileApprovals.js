import { investDb } from "../db.js";
import { isKycRecordFullySubmitted } from "./kycSections.js";

/** Sync approved KYC bank/UPI fields to Investor (used for withdrawals & payouts). */
export async function syncApprovedPayoutFromKyc(investorId, kyc) {
  if (!kyc || kyc.status !== "APPROVED") return;
  await investDb.investor.update({
    where: { id: investorId },
    data: {
      upiId: kyc.upiId || undefined,
      bankName: kyc.bankName || undefined,
      accountNumber: kyc.bankAccount || undefined,
      ifsc: kyc.ifscCode || undefined,
      phone: kyc.phone || undefined,
      phoneCountryCode: kyc.phoneCountryCode || undefined,
    },
  });
}

export async function applyPayoutChange(change) {
  if (!change || change.status !== "APPROVED") return;
  const kyc = await investDb.kyc.findUnique({ where: { investorId: change.investorId } });
  const data = {
    upiId: change.upiId ?? undefined,
    bankName: change.bankName ?? undefined,
    accountNumber: change.bankAccount ?? undefined,
    ifsc: change.ifscCode ?? undefined,
  };
  await investDb.investor.update({ where: { id: change.investorId }, data });
  if (kyc) {
    await investDb.kyc.update({
      where: { investorId: change.investorId },
      data: {
        upiId: change.upiId ?? kyc.upiId,
        bankName: change.bankName ?? kyc.bankName,
        bankAccount: change.bankAccount ?? kyc.bankAccount,
        ifscCode: change.ifscCode ?? kyc.ifscCode,
        branchName: change.branchName ?? kyc.branchName,
        bankProofType: change.bankProofType ?? kyc.bankProofType,
        cancelledCheque: change.cancelledCheque ?? kyc.cancelledCheque,
        passbookDocument: change.passbookDocument ?? kyc.passbookDocument,
        bankStatementDocument: change.bankStatementDocument ?? kyc.bankStatementDocument,
      },
    });
  }
}

const REVISION_SCALAR_FIELDS = [
  "fullName", "fatherName", "guardianType", "guardianName", "dob", "phone", "phoneCountryCode",
  "whatsappNumber", "whatsappCountryCode", "country", "houseNo", "street", "landmark", "area",
  "district", "city", "state", "pincode", "address", "panNumber", "aadhaarNumber",
  "bankName", "bankAccount", "ifscCode", "branchName", "upiId", "bankProofType",
  "panDocument", "aadhaarFront", "aadhaarBack", "aadhaarDocument", "photo", "selfie",
  "addressProof", "signature", "signatureData", "signatureMethod", "cancelledCheque",
  "passbookDocument", "bankStatementDocument", "passportDocument", "driversLicenseDocument",
];

export async function applyKycRevision(revision) {
  if (!revision || revision.status !== "APPROVED") return;
  const patch = {};
  for (const key of REVISION_SCALAR_FIELDS) {
    if (revision[key] != null && revision[key] !== "") patch[key] = revision[key];
  }
  const kyc = await investDb.kyc.update({
    where: { id: revision.kycId },
    data: { ...patch, status: "APPROVED", remarks: null, verifiedAt: new Date() },
  });
  await syncApprovedPayoutFromKyc(revision.investorId, kyc);
  return kyc;
}

export function needsKycSetup(kyc) {
  if (!kyc) return true;
  if (["NOT_SUBMITTED", "REJECTED"].includes(kyc.status)) return true;
  if (kyc.status === "PENDING" && !isKycRecordFullySubmitted(kyc)) return true;
  return false;
}

export function canAccessInvestDashboard(kyc) {
  return kyc?.status === "APPROVED";
}

export function isKycPendingReview(kyc) {
  return kyc?.status === "PENDING" && isKycRecordFullySubmitted(kyc);
}
