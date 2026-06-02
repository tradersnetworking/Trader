/** Client-side invest / withdraw eligibility (mirrors server rules). */

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

function buildEligibility(investor, kyc, { forWithdraw = false } = {}) {
  const missing = [];
  if (!isKycApproved(kyc)) {
    if (!kyc || kyc.status === "REJECTED") missing.push("kyc_submit");
    else if (kyc.status === "PENDING") missing.push("kyc_pending");
    else missing.push("kyc_complete");
  }
  if (!hasBankDetails(investor)) missing.push("bank_details");

  const ok = missing.length === 0;
  let message = "";
  if (!ok) {
    if (missing.includes("kyc_pending")) {
      message = "Your KYC is under review. You can use this feature once it is approved.";
    } else if (missing.includes("bank_details") && missing.some((m) => m.startsWith("kyc"))) {
      message = "Complete KYC and bank details first.";
    } else if (missing.includes("bank_details")) {
      message = "Add bank name, account number and IFSC in KYC first.";
    } else {
      message = forWithdraw
        ? "Complete KYC before withdrawing. You can still add funds to your wallet."
        : "Complete KYC before investing. You can still deposit funds.";
    }
  }
  return { ok, missing, message };
}

export function investEligibility(investor, kyc) {
  const { ok, missing, message } = buildEligibility(investor, kyc);
  return { canInvest: ok, missing, message };
}

export function withdrawEligibility(investor, kyc) {
  const { ok, missing, message } = buildEligibility(investor, kyc, { forWithdraw: true });
  return { canWithdraw: ok, missing, message };
}
