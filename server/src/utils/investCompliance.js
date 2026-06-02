/** Whether an investor may subscribe / invest or withdraw (KYC approved + bank on file). */

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

  const canTransact = missing.length === 0;
  let message = "";
  if (!canTransact) {
    if (missing.includes("kyc_pending")) {
      message = "Your KYC is under review. You can use this feature once it is approved.";
    } else if (missing.includes("bank_details") && missing.some((m) => m.startsWith("kyc"))) {
      message = "Complete KYC verification and add your bank details first.";
    } else if (missing.includes("bank_details")) {
      message = "Add your bank name, account number and IFSC under KYC first.";
    } else {
      message = "Complete and get KYC approved before investing or withdrawing. Deposits are allowed without KYC.";
    }
    if (!forWithdraw && missing.length && !message.includes("invest")) {
      message = message.replace("investing or withdrawing", "investing");
    }
  }

  return { canTransact, missing, message };
}

export function investEligibility(investor, kyc) {
  const { canTransact, missing, message } = buildEligibility(investor, kyc);
  return { canInvest: canTransact, missing, message };
}

export function withdrawEligibility(investor, kyc) {
  const { canTransact, missing, message } = buildEligibility(investor, kyc, { forWithdraw: true });
  return { canWithdraw: canTransact, missing, message };
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

export async function assertCanWithdraw(investorId, investDb) {
  const [investor, kyc] = await Promise.all([
    investDb.investor.findUnique({ where: { id: investorId } }),
    investDb.kyc.findUnique({ where: { investorId } }),
  ]);
  const el = withdrawEligibility(investor, kyc);
  if (!el.canWithdraw) {
    return { ok: false, error: el.message, code: "WITHDRAW_NOT_ELIGIBLE", missing: el.missing };
  }
  return { ok: true, investor, kyc };
}
