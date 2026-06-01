import { sendMail } from "../utils/mailer.js";
import { config } from "../config.js";
import { compoundedMaturity, simpleMaturity } from "../utils/invest.js";

const PORTAL = config.investPortalUrl;

function fmtInr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function layout(title, bodyHtml) {
  const logoUrl = `${PORTAL}/assets/logo-mark.png`;
  return `<!DOCTYPE html><html><body style="font-family:Inter,Segoe UI,sans-serif;background:#f4f6fb;padding:24px;color:#0a1f44">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
<div style="background:linear-gradient(135deg,#002366,#0056b3);padding:20px 24px;color:#fff;text-align:center">
<img src="${logoUrl}" alt="Akshaya Exim Traders" width="72" height="72" style="display:block;margin:0 auto 12px;object-fit:contain" />
<h1 style="margin:0;font-size:18px">Akshaya Exim Invest</h1>
<p style="margin:4px 0 0;font-size:12px;opacity:.85">${title}</p>
</div>
<div style="padding:24px;font-size:14px;line-height:1.6">${bodyHtml}</div>
<div style="padding:16px 24px;background:#f8fafc;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0">
<a href="${PORTAL}/dashboard" style="color:#0a3d91">Open Investor Dashboard</a> · invest.akshayaexim.com
</div></div></body></html>`;
}

function row(label, value) {
  return `<tr><td style="padding:6px 0;color:#64748b;width:140px">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`;
}

function table(rows) {
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${rows}</table>`;
}

async function notify({ to, subject, html, text, purpose }) {
  if (!to) return;
  try {
    await sendMail({ to, subject, html, text, purpose });
  } catch (err) {
    console.error("[invest-notify]", subject, "→", to, err.message);
  }
}

export function notifyDepositSubmitted(investor, deposit) {
  const html = layout(
    "Deposit Request Received",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>We received your wallet deposit request. It is <b>pending admin verification</b>.</p>
${table(row("Amount", fmtInr(deposit.amount)) + row("Method", deposit.method) + row("Reference", deposit.reference || "—") + row("Status", "PENDING"))}
<p>You will receive another email once your deposit is approved or rejected.</p>`
  );
  return notify({
    to: investor.email,
    subject: `Deposit request received — ${fmtInr(deposit.amount)} pending`,
    html,
    text: `Hi ${investor.name}, your deposit of ${fmtInr(deposit.amount)} via ${deposit.method} is pending review.`,
    purpose: "deposit_submitted",
  });
}

export function notifyDepositApproved(investor, deposit) {
  const html = layout(
    "Deposit Approved",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Great news! Your deposit has been <b style="color:#059669">approved</b> and credited to your wallet.</p>
${table(row("Amount", fmtInr(deposit.amount)) + row("Method", deposit.method) + row("Status", "APPROVED"))}
<p><a href="${PORTAL}/dashboard?tab=money" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">View Wallet</a></p>`
  );
  return notify({
    to: investor.email,
    subject: `Deposit approved — ${fmtInr(deposit.amount)} credited to wallet`,
    html,
    text: `Hi ${investor.name}, your deposit of ${fmtInr(deposit.amount)} has been approved and credited.`,
    purpose: "deposit_approved",
  });
}

export function notifyDepositRejected(investor, deposit, remarks) {
  const html = layout(
    "Deposit Rejected",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your deposit request was <b style="color:#dc2626">not approved</b>.</p>
${table(row("Amount", fmtInr(deposit.amount)) + row("Method", deposit.method) + row("Remarks", remarks || "Please contact support"))}
<p>If you believe this is an error, reply to this email or contact support@akshayaexim.com.</p>`
  );
  return notify({
    to: investor.email,
    subject: `Deposit rejected — ${fmtInr(deposit.amount)}`,
    html,
    text: `Hi ${investor.name}, your deposit of ${fmtInr(deposit.amount)} was rejected. ${remarks || ""}`,
    purpose: "deposit_rejected",
  });
}

export function notifyWithdrawalRequested(investor, payout) {
  const html = layout(
    "Withdrawal Request Received",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>We received your withdrawal request. Funds are held until admin releases the payout.</p>
${table(row("Amount", fmtInr(payout.amount)) + row("Mode", payout.mode) + row("Destination", payout.destination) + row("Status", "PENDING"))}
<p>You will be notified when the payout is processed.</p>`
  );
  return notify({
    to: investor.email,
    subject: `Withdrawal request — ${fmtInr(payout.amount)} pending`,
    html,
    text: `Hi ${investor.name}, withdrawal of ${fmtInr(payout.amount)} to ${payout.destination} is pending.`,
    purpose: "withdrawal_submitted",
  });
}

export function notifyWithdrawalReleased(investor, payout) {
  const html = layout(
    "Withdrawal Processed",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your withdrawal has been <b style="color:#059669">released</b> to your account.</p>
${table(row("Amount", fmtInr(payout.amount)) + row("Mode", payout.mode) + row("Destination", payout.destination) + row("Status", payout.status) + row("Reference", payout.gatewayRef || "—"))}`
  );
  return notify({
    to: investor.email,
    subject: `Withdrawal processed — ${fmtInr(payout.amount)} sent`,
    html,
    text: `Hi ${investor.name}, ${fmtInr(payout.amount)} has been sent to ${payout.destination}.`,
    purpose: "withdrawal_approved",
  });
}

export function notifyWithdrawalRejected(investor, payout, remarks) {
  const html = layout(
    "Withdrawal Rejected — Refunded",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your withdrawal request was <b style="color:#dc2626">rejected</b>. The amount has been refunded to your wallet.</p>
${table(row("Amount", fmtInr(payout.amount)) + row("Remarks", remarks || "Contact support for details"))}`
  );
  return notify({
    to: investor.email,
    subject: `Withdrawal rejected — ${fmtInr(payout.amount)} refunded`,
    html,
    text: `Hi ${investor.name}, withdrawal of ${fmtInr(payout.amount)} was rejected and refunded. ${remarks || ""}`,
    purpose: "withdrawal_rejected",
  });
}

export function notifyKycSubmitted(investor) {
  const html = layout(
    "KYC Submitted",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your KYC documents have been submitted and are <b>under review</b>.</p>
<p>We typically review within 1–2 business days. You will receive an email once approved.</p>`
  );
  return notify({
    to: investor.email,
    subject: "KYC submitted — under review",
    html,
    text: `Hi ${investor.name}, your KYC is under review.`,
    purpose: "kyc_submitted",
  });
}

export function notifyKycDecision(investor, kyc) {
  const approved = kyc.status === "APPROVED";
  const html = layout(
    approved ? "KYC Approved" : "KYC Rejected",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your KYC verification is <b style="color:${approved ? "#059669" : "#dc2626"}">${kyc.status}</b>.</p>
${kyc.remarks ? `<p>Remarks: ${kyc.remarks}</p>` : ""}
${approved ? `<p><a href="${PORTAL}/dashboard?tab=plans" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Browse Investment Plans</a></p>` : `<p>Please resubmit corrected documents from your dashboard.</p>`}`
  );
  return notify({
    to: investor.email,
    subject: approved ? "KYC approved — you can invest now" : "KYC rejected — action required",
    html,
    text: `Hi ${investor.name}, your KYC is ${kyc.status}. ${kyc.remarks || ""}`,
    purpose: approved ? "kyc_approved" : "kyc_rejected",
  });
}

export function notifyMaturityReminder(investor, subscription, plan, daysLeft) {
  const html = layout(
    "Investment Maturity Reminder",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your investment is approaching <b>maturity in ${daysLeft} day(s)</b>.</p>
${table(
    row("Plan", plan?.name || "Investment Plan") +
      row("Invested", fmtInr(subscription.amount)) +
      row("Monthly ROI", `${subscription.monthlyRoiPct}%`) +
      row("Maturity Date", fmtDate(subscription.maturityDate)) +
      row("Lock-in", `${subscription.lockInDays} days`)
  )}
<p>After maturity, compounding applies to your returns. Visit your dashboard for projected maturity value.</p>
<p><a href="${PORTAL}/dashboard?tab=investments">View My Investments →</a></p>`
  );
  return notify({
    to: investor.email,
    subject: `Maturity in ${daysLeft} days — ${plan?.name || "Investment Plan"}`,
    html,
    text: `Hi ${investor.name}, your ${plan?.name} investment of ${fmtInr(subscription.amount)} matures on ${fmtDate(subscription.maturityDate)}.`,
    purpose: "investment",
  });
}

export function notifyMaturityChoicePrompt(investor, subscription, plan, profitAmount) {
  const html = layout(
    "Choose Maturity Payout Option",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your investment matures <b>tomorrow</b>. Please choose how to receive your profit of <b>${fmtInr(profitAmount)}</b>:</p>
<ul>
<li><b>Keep in Wallet</b> — credit profit to your invest wallet</li>
<li><b>Withdraw to Account</b> — transfer profit to your UPI/bank</li>
<li><b>Reinvest</b> — add profit to wallet for new investments</li>
</ul>
${table(row("Plan", plan?.name) + row("Principal", fmtInr(subscription.amount)) + row("Est. Profit", fmtInr(profitAmount)))}
<p><a href="${PORTAL}/dashboard?tab=investments" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Choose Now</a></p>`
  );
  return notify({
    to: investor.email,
    subject: "Action required — maturity payout choice (due tomorrow)",
    html,
    text: `Hi ${investor.name}, choose wallet, withdraw, or reinvest for your maturing ${plan?.name} plan.`,
    purpose: "investment",
  });
}

export function notifyMaturityProfitReleased(investor, payout, choice) {
  const html = layout(
    "Maturity Profit Processed",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Your maturity profit of <b>${fmtInr(payout.profitAmount)}</b> has been processed as <b>${choice}</b>.</p>
<p><a href="${PORTAL}/dashboard?tab=money">View Wallet →</a></p>`
  );
  return notify({
    to: investor.email,
    subject: `Maturity profit ${fmtInr(payout.profitAmount)} processed`,
    html,
    text: `Hi ${investor.name}, maturity profit ${fmtInr(payout.profitAmount)} processed (${choice}).`,
    purpose: "investment",
  });
}

export function notifyPlanMatured(investor, subscription, plan) {
  const compounded = compoundedMaturity(subscription.amount, subscription.monthlyRoiPct, subscription.lockInDays);
  const simple = simpleMaturity(subscription.amount, subscription.monthlyRoiPct, subscription.lockInDays);
  const html = layout(
    "Investment Plan Matured",
    `<p>Hi <b>${investor.name}</b>,</p>
<p>Congratulations! Your investment has <b style="color:#059669">completed its lock-in period</b> and is now matured.</p>
${table(
    row("Plan", plan?.name || "Investment Plan") +
      row("Principal", fmtInr(subscription.amount)) +
      row("Maturity Date", fmtDate(subscription.maturityDate)) +
      row("Simple Return", fmtInr(simple.totalReturn)) +
      row("Compounded Maturity Value", fmtInr(compounded.maturityValue))
  )}
<p>Compounding now applies to your returns. Contact admin for payout of matured returns or reinvest from your dashboard.</p>
<p><a href="${PORTAL}/dashboard?tab=investments" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">View Investment</a></p>`
  );
  return notify({
    to: investor.email,
    subject: `Plan matured — ${plan?.name || "Investment"} (${fmtInr(subscription.amount)})`,
    html,
    text: `Hi ${investor.name}, your ${plan?.name} investment of ${fmtInr(subscription.amount)} has matured. Compounded value: ${fmtInr(compounded.maturityValue)}.`,
    purpose: "investment",
  });
}
