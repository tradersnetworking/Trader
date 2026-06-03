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

/** Submitted KYC awaiting admin — show blurred dashboard preview, no interactions */
export function isKycPendingPreview(kyc) {
  return isKycPendingReview(kyc);
}

export function needsKycSetup(kyc) {
  if (!kyc) return true;
  return ["NOT_SUBMITTED", "REJECTED"].includes(kyc.status);
}

/** Sidebar / mobile items shown before KYC approval. */
export const INVESTOR_KYC_NAV_TAB_IDS = ["overview", "kyc", "profile", "account", "support"];

/** Routes allowed before full KYC approval. */
export const INVESTOR_KYC_ALLOWED_TABS = ["overview", "kyc", "profile", "account", "support"];

/** @deprecated use INVESTOR_KYC_ALLOWED_TABS */
export const INVESTOR_KYC_RESTRICTED_TABS = INVESTOR_KYC_ALLOWED_TABS;

/** Tabs that stay interactive while dashboard preview is blurred (pending review). */
export const INVESTOR_KYC_OVERLAY_UNLOCK_TABS = INVESTOR_KYC_ALLOWED_TABS;

/** Tab id → short nav / page title while KYC is not approved. */
export const INVESTOR_KYC_RESTRICTED_NAV_LABELS = {
  overview: "Home",
  kyc: "KYC",
  profile: "My Account",
  account: "Security",
  support: "Help",
};

export function isInvestorTabAllowedBeforeApproval(tab) {
  return INVESTOR_KYC_ALLOWED_TABS.includes(tab);
}

/**
 * UI routing for investor dashboard shell + KYC gate.
 * loading — KYC fetch in progress (avoid blank flash)
 * approved — full dashboard
 * pending_review — submitted, awaiting admin
 * needs_fix — rejected (whole or sectional)
 * needs_submit — no submission yet
 */
export function getKycUiPhase(kyc, { loaded = true, loadError = null } = {}) {
  if (!loaded) return "loading";
  if (loadError && !kyc) return "error";
  if (canAccessInvestDashboard(kyc)) return "approved";
  if (isKycPendingReview(kyc)) return "pending_review";
  if (kyc?.status === "REJECTED") return "needs_fix";
  return "needs_submit";
}

/** Minimal KYC shape from /auth/me when full /kyc fetch fails */
export function kycStubFromInvestor(investor) {
  if (!investor?.kycStatus) return null;
  return { status: investor.kycStatus };
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
