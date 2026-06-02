/** Client-side invest eligibility (mirrors server rules). */

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
      message = "Complete KYC and add bank details before investing.";
    } else if (missing.includes("bank_details")) {
      message = "Add bank name, account number and IFSC in KYC before investing.";
    } else {
      message = "Complete KYC verification before investing.";
    }
  }

  return { canInvest, missing, message };
}
