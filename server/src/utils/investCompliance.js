/** Whether an investor may subscribe / invest (KYC approved + bank on file). */

export function hasBankDetails(investor) {
  if (!investor) return false;
  return Boolean(
    String(investor.bankName || "").trim() &&
      String(investor.accountNumber || "").trim() &&
      String(investor.ifsc || "").trim()
  );
}

export function isKycApproved(kyc) {
  return kyc?.status === "APPROVED";
}

export function investEligibility(investor, kyc) {
  const missing = [];
  if (!isKycApproved(kyc)) {
    if (!kyc || kyc.status === "REJECTED") missing.push("kyc_submit");
    else if (kyc.status === "PENDING") missing.push("kyc_pending");
    else missing.push("kyc_complete");
  }
  if (!hasBankDetails(investor)) missing.push("bank_details");

  const canInvest = missing.length === 0;
  let message = "";
  if (!canInvest) {
    if (missing.includes("kyc_pending")) {
      message = "Your KYC is under review. You can invest once it is approved.";
    } else if (missing.includes("bank_details") && missing.some((m) => m.startsWith("kyc"))) {
      message = "Complete KYC verification and add your bank details before investing.";
    } else if (missing.includes("bank_details")) {
      message = "Add your bank name, account number and IFSC under KYC before investing.";
    } else {
      message = "Complete KYC verification before investing.";
    }
  }

  return { canInvest, missing, message };
}

export async function assertCanInvest(investorId, investDb) {
  const [investor, kyc] = await Promise.all([
    investDb.investor.findUnique({ where: { id: investorId } }),
    investDb.kyc.findUnique({ where: { investorId } }),
  ]);
  const el = investEligibility(investor, kyc);
  if (!el.canInvest) {
    return { ok: false, error: el.message, code: "INVEST_NOT_ELIGIBLE", missing: el.missing };
  }
  return { ok: true, investor, kyc };
}
