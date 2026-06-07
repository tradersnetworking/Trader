/** Client-side fallback when email-communication API is unavailable */

export const DEFAULT_EMAIL_PURPOSE_META = {
  registration: { label: "Registration / Welcome", description: "Sent when a new investor completes registration", group: "Account" },
  password_reset: { label: "Forgot Password", description: "Password reset link or confirmation", group: "Account" },
  otp: { label: "OTP / Verification Code", description: "One-time codes for signup, withdrawal, verify", group: "Account" },
  deposit_submitted: { label: "Deposit Submitted", description: "When investor submits a deposit request", group: "Finance" },
  deposit_approved: { label: "Deposit Approved", description: "When admin approves a deposit", group: "Finance" },
  deposit_rejected: { label: "Deposit Rejected", description: "When admin rejects a deposit", group: "Finance" },
  withdrawal_submitted: { label: "Withdrawal Submitted", description: "When investor requests a withdrawal", group: "Finance" },
  withdrawal_approved: { label: "Withdrawal Approved", description: "When admin approves a withdrawal", group: "Finance" },
  withdrawal_rejected: { label: "Withdrawal Rejected", description: "When admin rejects a withdrawal", group: "Finance" },
  kyc_submitted: { label: "KYC Submitted", description: "When investor submits KYC documents", group: "Compliance" },
  kyc_approved: { label: "KYC Approved", description: "When KYC is verified", group: "Compliance" },
  kyc_rejected: { label: "KYC Rejected", description: "When KYC is rejected", group: "Compliance" },
  investment: { label: "Investment", description: "Investment plan confirmations", group: "Finance" },
  roi_reminder: { label: "ROI Payout Reminder", description: "Day-before monthly ROI payout alert", group: "Finance" },
  roi_credited: { label: "ROI Credited", description: "When ROI return is credited to wallet", group: "Finance" },
  ticket_reply: { label: "Support Ticket Reply", description: "When staff replies to a support ticket", group: "Support" },
  ticket_acknowledgment: { label: "Ticket Auto-Acknowledgment", description: "When a support ticket is created", group: "Support" },
  broadcast: { label: "Admin Broadcast", description: "Bulk announcements from admin", group: "Support" },
  generic: { label: "Generic / Other", description: "Fallback for uncategorized mail", group: "Other" },
};

export const DEFAULT_EMAIL_PURPOSES = Object.keys(DEFAULT_EMAIL_PURPOSE_META);

export const DEFAULT_EMAIL_COMM_CONFIG = {
  identities: [
    { id: "noreply", label: "No Reply (Default)", name: "AKSHYA INVESTMENTS", address: "noreply@akshayaexim.in" },
    { id: "support", label: "Support", name: "AKSHYA INVESTMENTS Support", address: "support@akshayaexim.in" },
    { id: "finance", label: "Finance & Payouts", name: "AKSHYA INVESTMENTS Finance", address: "finance@akshayaexim.in" },
    { id: "compliance", label: "Compliance / KYC", name: "AKSHYA INVESTMENTS Compliance", address: "compliance@akshayaexim.in" },
    { id: "invest", label: "Investor Relations", name: "AKSHYA INVESTMENTS", address: "invest@akshayaexim.in" },
  ],
  assignments: Object.fromEntries(
    DEFAULT_EMAIL_PURPOSES.map((p) => [
      p,
      ["deposit_submitted", "deposit_approved", "deposit_rejected", "withdrawal_submitted", "withdrawal_approved", "withdrawal_rejected", "investment", "roi_reminder", "roi_credited"].includes(p)
        ? "finance"
        : "noreply",
    ])
  ),
  autoEmails: {
    registration: { enabled: true, subject: "Welcome to AKSHYA INVESTMENTS" },
    password_reset: { enabled: true, subject: "Reset your AKSHYA INVESTMENTS password" },
    otp: { enabled: true, subject: "Your AKSHYA INVESTMENTS verification code" },
    deposit_submitted: { enabled: true, subject: "Deposit request received" },
    deposit_approved: { enabled: true, subject: "Deposit approved" },
    deposit_rejected: { enabled: true, subject: "Deposit update" },
    withdrawal_submitted: { enabled: true, subject: "Withdrawal request received" },
    withdrawal_approved: { enabled: true, subject: "Withdrawal approved" },
    withdrawal_rejected: { enabled: true, subject: "Withdrawal update" },
    kyc_submitted: { enabled: true, subject: "KYC documents received" },
    kyc_approved: { enabled: true, subject: "KYC verified successfully" },
    kyc_rejected: { enabled: true, subject: "KYC verification update" },
    investment: { enabled: true, subject: "Investment confirmation" },
    roi_reminder: { enabled: true, subject: "Upcoming ROI payout tomorrow" },
    roi_credited: { enabled: true, subject: "ROI credited to your wallet" },
    ticket_reply: { enabled: true, subject: "Support ticket update" },
    ticket_acknowledgment: { enabled: true, subject: "We received your support request" },
    broadcast: { enabled: true, subject: "Message from AKSHYA INVESTMENTS" },
    generic: { enabled: true, subject: "Notification from AKSHYA INVESTMENTS" },
  },
};

export const GROUP_ORDER = ["Account", "Finance", "Compliance", "Support", "Other"];
