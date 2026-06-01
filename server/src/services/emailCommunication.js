import { getAllSettings, getSetting, setSettings } from "./investSettings.js";

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
  ticket_reply: { label: "Support Ticket Reply", description: "When staff replies to a support ticket", group: "Support" },
  ticket_acknowledgment: { label: "Ticket Auto-Acknowledgment", description: "When a support ticket is created", group: "Support" },
  broadcast: { label: "Admin Broadcast", description: "Bulk announcements from admin", group: "Support" },
  generic: { label: "Generic / Other", description: "Fallback for uncategorized mail", group: "Other" },
};

export const DEFAULT_EMAIL_PURPOSES = Object.keys(DEFAULT_EMAIL_PURPOSE_META);

export const DEFAULT_EMAIL_COMM_CONFIG = {
  identities: [
    { id: "default", label: "Default (SMTP From)", name: "Akshaya Exim Invest", address: "" },
    { id: "noreply", label: "No Reply", name: "Akshaya Exim Invest", address: "noreply@akshayaexim.com" },
    { id: "support", label: "Support", name: "Akshaya Exim Support", address: "support@akshayaexim.com" },
    { id: "finance", label: "Finance", name: "Akshaya Exim Finance", address: "finance@akshayaexim.com" },
    { id: "compliance", label: "Compliance / KYC", name: "Akshaya Exim Compliance", address: "compliance@akshayaexim.com" },
  ],
  assignments: Object.fromEntries(DEFAULT_EMAIL_PURPOSES.map((p) => [p, "noreply"])),
  autoEmails: {
    registration: { enabled: true, subject: "Welcome to Akshaya Exim Invest" },
    password_reset: { enabled: true, subject: "Reset your Akshaya Invest password" },
    otp: { enabled: true, subject: "Your Akshaya Invest verification code" },
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
    ticket_reply: { enabled: true, subject: "Support ticket update" },
    ticket_acknowledgment: { enabled: true, subject: "We received your support request" },
    broadcast: { enabled: true, subject: "Message from Akshaya Exim Invest" },
    generic: { enabled: true, subject: "Notification from Akshaya Exim Invest" },
  },
};

const CONFIG_KEY = "email_communication_config";

function parseConfig(raw) {
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_EMAIL_COMM_CONFIG));
  try {
    const parsed = JSON.parse(raw);
    return {
      identities: parsed.identities?.length ? parsed.identities : DEFAULT_EMAIL_COMM_CONFIG.identities,
      assignments: { ...DEFAULT_EMAIL_COMM_CONFIG.assignments, ...(parsed.assignments || {}) },
      autoEmails: { ...DEFAULT_EMAIL_COMM_CONFIG.autoEmails, ...(parsed.autoEmails || {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_EMAIL_COMM_CONFIG));
  }
}

export async function getEmailCommunicationConfig() {
  const raw = await getSetting(CONFIG_KEY);
  return parseConfig(raw);
}

export async function saveEmailCommunicationConfig(config) {
  await setSettings({ [CONFIG_KEY]: JSON.stringify(config) });
  return getEmailCommunicationConfig();
}

export async function getEmailCommunicationBundle() {
  const settings = await getAllSettings(false);
  const config = await getEmailCommunicationConfig();
  const purposes = DEFAULT_EMAIL_PURPOSES;
  const autoEmailsEnabled = purposes.filter((p) => config.autoEmails[p]?.enabled !== false).length;
  const smtpConfigured = !!(settings.smtp_host && settings.smtp_user);
  const noreply = config.identities.find((i) => i.id === "noreply");

  const resolvedFrom = {};
  for (const purpose of purposes) {
    const id = config.assignments[purpose] || "noreply";
    const identity = config.identities.find((i) => i.id === id);
    if (identity?.address) resolvedFrom[purpose] = `${identity.name} <${identity.address}>`;
    else if (settings.mail_from) resolvedFrom[purpose] = settings.mail_from;
    else resolvedFrom[purpose] = noreply?.address ? `${noreply.name} <${noreply.address}>` : "Akshaya Exim Invest <support@akshayaexim.com>";
  }

  return {
    config,
    purposeMeta: DEFAULT_EMAIL_PURPOSE_META,
    purposes,
    resolvedFrom,
    summary: {
      smtp: {
        configured: smtpConfigured,
        enabled: smtpConfigured,
        envFallback: false,
        from: settings.mail_from || noreply?.address || "",
      },
      inbox: {
        configured: !!settings.support_email,
        enabled: true,
        address: settings.support_email || "support@akshayaexim.com",
      },
      identities: config.identities.length,
      autoEmailsEnabled,
      autoEmailsTotal: purposes.length,
    },
  };
}

export async function sendPurposeTestEmail(purpose, testTo) {
  const bundle = await getEmailCommunicationBundle();
  const auto = bundle.config.autoEmails[purpose];
  const from = bundle.resolvedFrom[purpose] || bundle.summary.smtp.from;
  const { sendMail } = await import("../utils/mailer.js");
  const subject = auto?.subject || `Test: ${purpose}`;
  await sendMail({
    to: testTo,
    subject: `[Test] ${subject}`,
    html: `<p>This is a test email for purpose <b>${purpose}</b>.</p><p>Resolved From: ${from}</p>`,
  });
  return { ok: true, message: `Test email sent to ${testTo}` };
}
