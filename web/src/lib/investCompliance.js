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

/** Full dashboard (sidebar, plans, wallet, etc.) only after admin approves KYC. */
export function canAccessInvestDashboard(kyc) {
  return kyc?.status === "APPROVED";
}

export function isKycPendingReview(kyc) {
  return kyc?.status === "PENDING";
}

export function needsKycSetup(kyc) {
  if (!kyc) return true;
  return ["NOT_SUBMITTED", "REJECTED"].includes(kyc.status);
}

/**
 * UI routing for investor dashboard shell + KYC gate.
 * loading — KYC fetch in progress (avoid blank flash)
 * approved — full dashboard
 * pending_review — submitted, awaiting admin
 * needs_fix — rejected (whole or sectional)
 * needs_submit — no submission yet
 */
export function getKycUiPhase(kyc, { loaded = true } = {}) {
  if (!loaded) return "loading";
  if (canAccessInvestDashboard(kyc)) return "approved";
  if (isKycPendingReview(kyc)) return "pending_review";
  if (kyc?.status === "REJECTED") return "needs_fix";
  return "needs_submit";
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
