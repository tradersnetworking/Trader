import { compoundedMaturity, simpleMaturity } from "../utils/invest.js";
import { postTelegramTransaction } from "./telegramTransactionAlerts.js";
import { sendWhatsAppTransactional } from "./whatsappBusiness.js";
import { sendTransactionalEmail, fmtInr, fmtDate, fmtDateTime } from "./transactionalEmail.js";

function tg(event, payload) {
  postTelegramTransaction(event, payload).catch(() => {});
}

function wa(investor, message) {
  sendWhatsAppTransactional(investor, message).catch(() => {});
}

function notify({ investor, purpose, context, receipt, extraAttachments, subjectOverride, attachReceipt = true }) {
  if (!investor?.email) return;
  sendTransactionalEmail({
    investor,
    purpose,
    context,
    receipt,
    extraAttachments,
    subjectOverride,
    attachReceipt,
  }).catch((err) => console.error("[invest-notify]", purpose, err.message));
}

export function notifyDepositSubmitted(investor, deposit) {
  notify({
    investor,
    purpose: "deposit_submitted",
    context: {
      amountFormatted: fmtInr(deposit.amount),
      method: deposit.method,
      reference: deposit.reference || deposit.id?.slice(-12) || "—",
    },
    receipt: {
      title: "Deposit Request Receipt",
      receiptNo: deposit.id,
      status: "PENDING",
      filename: `deposit-request-${deposit.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(deposit.amount)],
        ["Method", deposit.method],
        ["Reference", deposit.reference || "—"],
        ["Submitted", fmtDateTime(deposit.createdAt || new Date())],
      ],
    },
  });
  tg("deposit_submitted", { investor, deposit });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Hi ${investor.name}, we received your deposit of ${fmtInr(deposit.amount)} (${deposit.method}). Status: pending verification.`
  );
}

export function notifyDepositApproved(investor, deposit, wallet) {
  notify({
    investor,
    purpose: "deposit_approved",
    context: {
      amountFormatted: fmtInr(deposit.amount),
      method: deposit.method,
      walletAvailable: fmtInr(wallet?.available),
    },
    receipt: {
      title: "Deposit Approval Receipt",
      receiptNo: deposit.id,
      status: "APPROVED",
      filename: `deposit-approved-${deposit.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(deposit.amount)],
        ["Method", deposit.method],
        ["Reference", deposit.reference || deposit.gatewayRef || "—"],
        ["Wallet balance", fmtInr(wallet?.available)],
        ["Approved", fmtDateTime(new Date())],
      ],
    },
  });
  tg("deposit_approved", { investor, deposit });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Deposit confirmed. ${fmtInr(deposit.amount)} credited to your wallet. Ref: ${deposit.reference || deposit.id || "—"}.`
  );
}

export function notifyDepositRejected(investor, deposit, remarks) {
  notify({
    investor,
    purpose: "deposit_rejected",
    context: {
      amountFormatted: fmtInr(deposit.amount),
      method: deposit.method,
      remarks: remarks || "Please contact support",
    },
    receipt: {
      title: "Deposit Rejection Notice",
      receiptNo: deposit.id,
      status: "REJECTED",
      filename: `deposit-rejected-${deposit.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(deposit.amount)],
        ["Method", deposit.method],
        ["Remarks", remarks || "—"],
      ],
    },
  });
  tg("deposit_rejected", { investor, deposit, remarks });
}

export function notifyWithdrawalRequested(investor, payout) {
  notify({
    investor,
    purpose: "withdrawal_submitted",
    context: {
      amountFormatted: fmtInr(payout.amount),
      mode: payout.mode,
      destination: payout.destination,
    },
    receipt: {
      title: "Withdrawal Request Receipt",
      receiptNo: payout.id,
      status: "PENDING",
      filename: `withdrawal-request-${payout.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(payout.amount)],
        ["Mode", payout.mode],
        ["Destination", payout.destination],
        ["Requested", fmtDateTime(payout.createdAt || new Date())],
      ],
    },
  });
  tg("withdrawal_requested", { investor, payout });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Withdrawal request ${fmtInr(payout.amount)} to ${payout.destination} (${payout.mode}) received. Status: pending.`
  );
}

export function notifyWithdrawalReleased(investor, payout) {
  notify({
    investor,
    purpose: "withdrawal_approved",
    context: {
      amountFormatted: fmtInr(payout.amount),
      mode: payout.mode,
      destination: payout.destination,
      reference: payout.gatewayRef || payout.reference || payout.id?.slice(-12) || "—",
      status: payout.status || "SUCCESS",
    },
    receipt: {
      title: "Withdrawal Payout Receipt",
      receiptNo: payout.id,
      status: payout.status || "SUCCESS",
      filename: `withdrawal-payout-${payout.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(payout.amount)],
        ["Mode", payout.mode],
        ["Destination", payout.destination],
        ["Gateway ref", payout.gatewayRef || "—"],
        ["Processed", fmtDateTime(payout.completedAt || new Date())],
      ],
    },
  });
  const event = payout?.gatewayRef ? "payout_gateway_receipt" : "withdrawal_released";
  tg(event, {
    investor,
    payout,
    receiptNote: payout?.gatewayRef ? "Payment gateway payout completed" : null,
  });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Payout receipt — ${fmtInr(payout.amount)} sent to ${payout.destination}. Ref: ${payout.gatewayRef || payout.id || "—"}.`
  );
}

export function notifyWithdrawalRejected(investor, payout, remarks, wallet) {
  notify({
    investor,
    purpose: "withdrawal_rejected",
    context: {
      amountFormatted: fmtInr(payout.amount),
      remarks: remarks || "Contact support for details",
      walletAvailable: fmtInr(wallet?.available),
    },
    receipt: {
      title: "Withdrawal Rejection Notice",
      receiptNo: payout.id,
      status: "REJECTED",
      filename: `withdrawal-rejected-${payout.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(payout.amount)],
        ["Remarks", remarks || "—"],
        ["Refunded to wallet", fmtInr(wallet?.available)],
      ],
    },
  });
  tg("withdrawal_rejected", { investor, payout, remarks });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Withdrawal ${fmtInr(payout.amount)} rejected; amount refunded to wallet. ${remarks || ""}`
  );
}

export async function notifyInvestmentActivity(
  investor,
  { planName, amount, settlementCycle, source = "investor", subscription, plan, agreementId }
) {
  const monthlyRoi = subscription?.monthlyRoiPct ?? plan?.monthlyRoiPct;
  const lockIn = subscription?.lockInDays ?? plan?.lockInDays;
  const maturity = subscription?.maturityDate;

  const extraAttachments = [];
  if (agreementId) {
    try {
      const { getAgreementPdfBuffer } = await import("./agreements.js");
      const buf = await getAgreementPdfBuffer(agreementId, investor.id, { isAdmin: false });
      if (buf) {
        extraAttachments.push({
          filename: `investment-agreement-${agreementId.slice(-8)}.pdf`,
          content: buf,
          contentType: "application/pdf",
        });
      }
    } catch {
      /* agreement PDF optional */
    }
  }

  notify({
    investor,
    purpose: "investment",
    context: {
      amountFormatted: fmtInr(amount),
      planName: planName || plan?.name || "Investment Plan",
      settlementCycle: settlementCycle || subscription?.settlementCycle || "MONTHLY",
      monthlyRoiPct: monthlyRoi != null ? String(monthlyRoi) : "—",
      lockInDays: lockIn != null ? String(lockIn) : "—",
      maturityDate: fmtDate(maturity),
      source: source === "admin" ? "Admin assigned" : "Self-service",
    },
    receipt: {
      title: "Investment Confirmation Receipt",
      receiptNo: subscription?.id || "—",
      status: "ACTIVE",
      filename: `investment-${subscription?.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Amount", fmtInr(amount)],
        ["Plan", planName || plan?.name || "—"],
        ["Settlement", settlementCycle || subscription?.settlementCycle || "—"],
        ["Monthly ROI", monthlyRoi != null ? `${monthlyRoi}%` : "—"],
        ["Lock-in", lockIn != null ? `${lockIn} days` : "—"],
        ["Maturity", fmtDate(maturity)],
        ["Start date", fmtDate(subscription?.startDate)],
      ],
    },
    extraAttachments,
  });

  tg("investment", { investor, planName, amount, settlementCycle, source });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Investment confirmed — ${planName || "Plan"} ${fmtInr(amount)}${settlementCycle ? ` (${settlementCycle})` : ""}. Maturity: ${fmtDate(maturity)}.`
  );
}

export function notifyRoiCredited(investor, { subscription, plan, amount, cycle, periodStart, periodEnd, wallet, roiPayoutId }) {
  notify({
    investor,
    purpose: "roi_credited",
    context: {
      amountFormatted: fmtInr(amount),
      planName: plan?.name || "Investment Plan",
      cycle: cycle || subscription?.settlementCycle || "MONTHLY",
      periodStart: fmtDate(periodStart),
      periodEnd: fmtDate(periodEnd),
      walletAvailable: fmtInr(wallet?.available),
    },
    receipt: {
      title: "ROI Payout Receipt",
      receiptNo: roiPayoutId || subscription?.id,
      status: "CREDITED",
      filename: `roi-payout-${(roiPayoutId || subscription?.id || "receipt").slice(-8)}.pdf`,
      lines: [
        ["Amount", fmtInr(amount)],
        ["Plan", plan?.name || "—"],
        ["Cycle", cycle || "—"],
        ["Period", `${fmtDate(periodStart)} — ${fmtDate(periodEnd)}`],
        ["Wallet balance", fmtInr(wallet?.available)],
      ],
    },
  });
  wa(
    investor,
    `AKSHYA INVESTMENTS: ROI credited — ${fmtInr(amount)} for ${plan?.name || "your plan"}. Wallet: ${fmtInr(wallet?.available)}.`
  );
}

export function notifyRoiReminder(investor, { subscription, plan, amount, cycle, dueDate }) {
  notify({
    investor,
    purpose: "roi_reminder",
    context: {
      amountFormatted: fmtInr(amount),
      planName: plan?.name || "Investment Plan",
      cycle: (cycle || "MONTHLY").toLowerCase(),
      dueDate: fmtDate(dueDate),
    },
    attachReceipt: false,
  });
}

export function notifyKycSubmitted(investor) {
  notify({ investor, purpose: "kyc_submitted", context: {}, attachReceipt: false });
  wa(investor, `AKSHYA INVESTMENTS: KYC submitted and under review.`);
}

export function notifyKycDecision(investor, kyc) {
  const approved = kyc.status === "APPROVED";
  notify({
    investor,
    purpose: approved ? "kyc_approved" : "kyc_rejected",
    context: { remarks: kyc.remarks || (approved ? "" : "Please resubmit corrected documents") },
    attachReceipt: false,
  });
  wa(investor, `AKSHYA INVESTMENTS: KYC ${kyc.status}. ${kyc.remarks || ""}`);
}

export function notifyMaturityReminder(investor, subscription, plan, daysLeft) {
  notify({
    investor,
    purpose: "investment",
    subjectOverride: `Maturity in ${daysLeft} days — ${plan?.name || "Investment Plan"}`,
    context: {
      amountFormatted: fmtInr(subscription.amount),
      planName: plan?.name || "Investment Plan",
      maturityDate: fmtDate(subscription.maturityDate),
      lockInDays: String(subscription.lockInDays),
      monthlyRoiPct: String(subscription.monthlyRoiPct),
      settlementCycle: subscription.settlementCycle || "MONTHLY",
      source: "Maturity reminder",
    },
    attachReceipt: false,
  });
  wa(
    investor,
    `AKSHYA INVESTMENTS: ${plan?.name || "Investment"} matures in ${daysLeft} day(s) on ${fmtDate(subscription.maturityDate)}. Amount: ${fmtInr(subscription.amount)}.`
  );
}

export function notifyMaturityChoicePrompt(investor, subscription, plan, profitAmount) {
  notify({
    investor,
    purpose: "investment",
    subjectOverride: "Action required — maturity payout choice (due tomorrow)",
    context: {
      amountFormatted: fmtInr(subscription.amount),
      planName: plan?.name,
      maturityDate: fmtDate(subscription.maturityDate),
      source: `Choose payout for profit ${fmtInr(profitAmount)}`,
    },
    attachReceipt: false,
  });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Action required — choose maturity payout for ${plan?.name} (profit ~${fmtInr(profitAmount)}).`
  );
}

export function notifyMaturityProfitReleased(investor, payout, choice) {
  notify({
    investor,
    purpose: "withdrawal_approved",
    subjectOverride: `Maturity profit ${fmtInr(payout.profitAmount)} processed`,
    context: {
      amountFormatted: fmtInr(payout.profitAmount),
      mode: choice,
      destination: "Wallet / account per your choice",
      reference: payout.id?.slice(-12) || "—",
      status: "PROCESSED",
    },
    receipt: {
      title: "Maturity Profit Receipt",
      receiptNo: payout.id,
      status: "PROCESSED",
      filename: `maturity-profit-${payout.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Profit amount", fmtInr(payout.profitAmount)],
        ["Choice", choice],
        ["Processed", fmtDateTime(new Date())],
      ],
    },
  });
  wa(
    investor,
    `AKSHYA INVESTMENTS: Maturity profit ${fmtInr(payout.profitAmount)} processed (${choice}).`
  );
}

export function notifyPlanMatured(investor, subscription, plan) {
  const compounded = compoundedMaturity(subscription.amount, subscription.monthlyRoiPct, subscription.lockInDays);
  const simple = simpleMaturity(subscription.amount, subscription.monthlyRoiPct, subscription.lockInDays);
  notify({
    investor,
    purpose: "investment",
    subjectOverride: `Plan matured — ${plan?.name || "Investment"} (${fmtInr(subscription.amount)})`,
    context: {
      amountFormatted: fmtInr(subscription.amount),
      planName: plan?.name || "Investment Plan",
      maturityDate: fmtDate(subscription.maturityDate),
      lockInDays: String(subscription.lockInDays),
      monthlyRoiPct: String(subscription.monthlyRoiPct),
      settlementCycle: subscription.settlementCycle || "MONTHLY",
      source: `Matured — simple return ${fmtInr(simple.totalReturn)}, compounded ${fmtInr(compounded.maturityValue)}`,
    },
    receipt: {
      title: "Investment Maturity Receipt",
      receiptNo: subscription.id,
      status: "MATURED",
      filename: `maturity-${subscription.id?.slice(-8) || "receipt"}.pdf`,
      lines: [
        ["Principal", fmtInr(subscription.amount)],
        ["Plan", plan?.name || "—"],
        ["Maturity date", fmtDate(subscription.maturityDate)],
        ["Simple return", fmtInr(simple.totalReturn)],
        ["Compounded value", fmtInr(compounded.maturityValue)],
      ],
    },
  });
  wa(
    investor,
    `AKSHYA INVESTMENTS: ${plan?.name || "Investment"} matured. Principal ${fmtInr(subscription.amount)}; compounded value ${fmtInr(compounded.maturityValue)}.`
  );
}
