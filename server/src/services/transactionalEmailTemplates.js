/** HTML/text bodies use {{placeholder}} tokens filled from investor + transaction context. */

export const TRANSACTIONAL_TEMPLATES = {
  deposit_submitted: {
    title: "Deposit Request Received",
    subject: "Deposit request received — {{amountFormatted}} pending",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>We received your wallet deposit request. It is <b>pending admin verification</b>.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Method</td><td style="padding:6px 0;font-weight:600">{{method}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Reference</td><td style="padding:6px 0;font-weight:600">{{reference}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0;font-weight:600">PENDING</td></tr>
</table>
<p>Your transaction receipt is attached. You will receive another email once your deposit is approved or rejected.</p>`,
    bodyText: "Hi {{investorName}}, your deposit of {{amountFormatted}} via {{method}} is pending review. Reference: {{reference}}.",
  },
  deposit_approved: {
    title: "Deposit Approved",
    subject: "Deposit approved — {{amountFormatted}} credited to wallet",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your deposit has been <b style="color:#059669">approved</b> and credited to your wallet.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Method</td><td style="padding:6px 0;font-weight:600">{{method}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Wallet balance</td><td style="padding:6px 0;font-weight:600">{{walletAvailable}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0;font-weight:600">APPROVED</td></tr>
</table>
<p>Your receipt is attached for your records.</p>
<p><a href="{{portalUrl}}/dashboard?tab=money" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">View Wallet</a></p>`,
    bodyText: "Hi {{investorName}}, your deposit of {{amountFormatted}} has been approved. Wallet balance: {{walletAvailable}}.",
  },
  deposit_rejected: {
    title: "Deposit Rejected",
    subject: "Deposit rejected — {{amountFormatted}}",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your deposit request was <b style="color:#dc2626">not approved</b>.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Method</td><td style="padding:6px 0;font-weight:600">{{method}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Remarks</td><td style="padding:6px 0;font-weight:600">{{remarks}}</td></tr>
</table>
<p>If you believe this is an error, contact support@akshayaexim.in.</p>`,
    bodyText: "Hi {{investorName}}, your deposit of {{amountFormatted}} was rejected. {{remarks}}",
  },
  withdrawal_submitted: {
    title: "Withdrawal Request Received",
    subject: "Withdrawal request — {{amountFormatted}} pending",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>We received your withdrawal request. Funds are held until admin releases the payout.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Mode</td><td style="padding:6px 0;font-weight:600">{{mode}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Destination</td><td style="padding:6px 0;font-weight:600">{{destination}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0;font-weight:600">PENDING</td></tr>
</table>
<p>Your withdrawal request receipt is attached.</p>`,
    bodyText: "Hi {{investorName}}, withdrawal of {{amountFormatted}} to {{destination}} ({{mode}}) is pending.",
  },
  withdrawal_approved: {
    title: "Withdrawal Processed",
    subject: "Withdrawal processed — {{amountFormatted}} sent",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your withdrawal has been <b style="color:#059669">released</b> to your account.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Mode</td><td style="padding:6px 0;font-weight:600">{{mode}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Destination</td><td style="padding:6px 0;font-weight:600">{{destination}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Reference</td><td style="padding:6px 0;font-weight:600">{{reference}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0;font-weight:600">{{status}}</td></tr>
</table>
<p>Your payout receipt is attached.</p>`,
    bodyText: "Hi {{investorName}}, {{amountFormatted}} has been sent to {{destination}}. Ref: {{reference}}.",
  },
  withdrawal_rejected: {
    title: "Withdrawal Rejected — Refunded",
    subject: "Withdrawal rejected — {{amountFormatted}} refunded",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your withdrawal request was <b style="color:#dc2626">rejected</b>. The amount has been refunded to your wallet.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Remarks</td><td style="padding:6px 0;font-weight:600">{{remarks}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Wallet balance</td><td style="padding:6px 0;font-weight:600">{{walletAvailable}}</td></tr>
</table>`,
    bodyText: "Hi {{investorName}}, withdrawal of {{amountFormatted}} was rejected and refunded. {{remarks}}",
  },
  investment: {
    title: "Investment Confirmation",
    subject: "Investment confirmed — {{planName}} ({{amountFormatted}})",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your investment in <b>{{planName}}</b> is now <b style="color:#059669">active</b>.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Plan</td><td style="padding:6px 0;font-weight:600">{{planName}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Settlement</td><td style="padding:6px 0;font-weight:600">{{settlementCycle}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Monthly ROI</td><td style="padding:6px 0;font-weight:600">{{monthlyRoiPct}}%</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Lock-in</td><td style="padding:6px 0;font-weight:600">{{lockInDays}} days</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Maturity date</td><td style="padding:6px 0;font-weight:600">{{maturityDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Source</td><td style="padding:6px 0;font-weight:600">{{source}}</td></tr>
</table>
<p>Your investment receipt is attached. View your portfolio anytime on the dashboard.</p>
<p><a href="{{portalUrl}}/dashboard?tab=investments" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">View Investments</a></p>`,
    bodyText: "Hi {{investorName}}, you invested {{amountFormatted}} in {{planName}} ({{settlementCycle}}). Maturity: {{maturityDate}}.",
  },
  roi_reminder: {
    title: "Upcoming ROI Payout",
    subject: "Upcoming profit payout — {{amountFormatted}}",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your scheduled <b>{{cycle}}</b> return for <b>{{planName}}</b> is due around <b>{{dueDate}}</b>.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Expected amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Plan</td><td style="padding:6px 0;font-weight:600">{{planName}}</td></tr>
</table>
<p>Amount will be credited to your earnings wallet when due.</p>`,
    bodyText: "Hi {{investorName}}, {{amountFormatted}} {{cycle}} return for {{planName}} is scheduled around {{dueDate}}.",
  },
  kyc_submitted: {
    title: "KYC Submitted",
    subject: "KYC submitted — under review",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your KYC documents have been submitted and are <b>under review</b>.</p>
<p>We typically review within 1–2 business days. You will receive an email once approved.</p>`,
    bodyText: "Hi {{investorName}}, your KYC is under review.",
  },
  kyc_approved: {
    title: "KYC Approved",
    subject: "KYC approved — you can invest now",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your KYC verification is <b style="color:#059669">APPROVED</b>.</p>
<p><a href="{{portalUrl}}/dashboard?tab=plans" style="display:inline-block;background:#d4a017;color:#0a1f44;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Browse Investment Plans</a></p>`,
    bodyText: "Hi {{investorName}}, your KYC is approved. You can invest now.",
  },
  kyc_rejected: {
    title: "KYC Rejected",
    subject: "KYC rejected — action required",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your KYC verification was <b style="color:#dc2626">not approved</b>.</p>
<p>Remarks: {{remarks}}</p>
<p>Please resubmit corrected documents from your dashboard.</p>`,
    bodyText: "Hi {{investorName}}, your KYC was rejected. {{remarks}}",
  },
  roi_credited: {
    title: "ROI Credited",
    subject: "ROI credited — {{amountFormatted}} for {{planName}}",
    bodyHtml: `<p>Hi <b>{{investorName}}</b>,</p>
<p>Your <b>{{cycle}}</b> return has been <b style="color:#059669">credited</b> to your wallet.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<tr><td style="padding:6px 0;color:#64748b;width:140px">Amount</td><td style="padding:6px 0;font-weight:600">{{amountFormatted}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Plan</td><td style="padding:6px 0;font-weight:600">{{planName}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Period</td><td style="padding:6px 0;font-weight:600">{{periodStart}} — {{periodEnd}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Wallet balance</td><td style="padding:6px 0;font-weight:600">{{walletAvailable}}</td></tr>
</table>
<p>Your ROI receipt is attached.</p>`,
    bodyText: "Hi {{investorName}}, {{amountFormatted}} {{cycle}} ROI for {{planName}} credited. Wallet: {{walletAvailable}}.",
  },
};
