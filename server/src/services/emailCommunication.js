import { getSetting, setSettings } from "./investSettings.js";
import { getMailbox, getDefaultMailbox, isMailboxSmtpConfigured } from "./mailboxConfig.js";

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

const MAIN_PURPOSE_META_EXTRA = {
  quote_received: { label: "Quote / RFQ Received", description: "When a buyer submits a quote request", group: "Trade" },
  order_confirmed: { label: "Order Confirmed", description: "When an order is confirmed on marketplace", group: "Trade" },
  trade_kyc: { label: "Trade KYC Update", description: "Trade buyer/supplier KYC notifications", group: "Compliance" },
};

export const MAIN_EMAIL_PURPOSE_META = { ...DEFAULT_EMAIL_PURPOSE_META, ...MAIN_PURPOSE_META_EXTRA };
export const MAIN_EMAIL_PURPOSES = Object.keys(MAIN_EMAIL_PURPOSE_META);

function identitiesFor(portal) {
  if (portal === "main") {
    return [
      { id: "noreply", label: "No Reply (Default)", name: "Akshaya EXIM TRADERS", address: "noreply@akshayaexim.com" },
      { id: "support", label: "Support", name: "Akshaya Exim Support", address: "support@akshayaexim.com" },
      { id: "finance", label: "Finance & Billing", name: "Akshaya Exim Finance", address: "finance@akshayaexim.com" },
      { id: "compliance", label: "Compliance / KYC", name: "Akshaya Exim Compliance", address: "compliance@akshayaexim.com" },
      { id: "trade", label: "Trade & Orders", name: "Akshaya Exim Trade Desk", address: "trade@akshayaexim.com" },
    ];
  }
  return [
    { id: "noreply", label: "No Reply (Default)", name: "Akshaya Exim Invest", address: "noreply@akshayaexim.in" },
    { id: "support", label: "Support", name: "Akshaya Invest Support", address: "support@akshayaexim.in" },
    { id: "finance", label: "Finance & Payouts", name: "Akshaya Invest Finance", address: "finance@akshayaexim.in" },
    { id: "compliance", label: "Compliance / KYC", name: "Akshaya Invest Compliance", address: "compliance@akshayaexim.in" },
    { id: "invest", label: "Investor Relations", name: "Akshaya Exim Invest", address: "invest@akshayaexim.in" },
  ];
}

const INVEST_AUTO_SUBJECTS = {
  registration: "Welcome to Akshaya Exim Invest",
  password_reset: "Reset your Akshaya Invest password",
  otp: "Your Akshaya Invest verification code",
  deposit_submitted: "Deposit request received",
  deposit_approved: "Deposit approved",
  deposit_rejected: "Deposit update",
  withdrawal_submitted: "Withdrawal request received",
  withdrawal_approved: "Withdrawal approved",
  withdrawal_rejected: "Withdrawal update",
  kyc_submitted: "KYC documents received",
  kyc_approved: "KYC verified successfully",
  kyc_rejected: "KYC verification update",
  investment: "Investment confirmation",
  ticket_reply: "Support ticket update",
  ticket_acknowledgment: "We received your support request",
  broadcast: "Message from Akshaya Exim Invest",
  generic: "Notification from Akshaya Exim Invest",
};

function defaultConfig(portal) {
  const purposes = portal === "main" ? MAIN_EMAIL_PURPOSES : DEFAULT_EMAIL_PURPOSES;
  const siteLabel = portal === "main" ? "Akshaya EXIM TRADERS" : "Akshaya Exim Invest";
  return {
    identities: identitiesFor(portal),
    assignments: Object.fromEntries(purposes.map((p) => [p, "noreply"])),
    autoEmails: Object.fromEntries(
      purposes.map((p) => [
        p,
        {
          enabled: true,
          subject:
            portal === "main"
              ? `Notification from ${siteLabel}`
              : INVEST_AUTO_SUBJECTS[p] || `Notification from ${siteLabel}`,
        },
      ])
    ),
  };
}

export const DEFAULT_EMAIL_COMM_CONFIG = defaultConfig("invest");
export const MAIN_EMAIL_COMM_CONFIG = defaultConfig("main");

const CONFIG_KEYS = { main: "main_email_communication_config", invest: "email_communication_config" };

function configKey(portal) {
  return CONFIG_KEYS[portal] || CONFIG_KEYS.invest;
}

function purposeMetaFor(portal) {
  return portal === "main" ? MAIN_EMAIL_PURPOSE_META : DEFAULT_EMAIL_PURPOSE_META;
}

function purposesFor(portal) {
  return portal === "main" ? MAIN_EMAIL_PURPOSES : DEFAULT_EMAIL_PURPOSES;
}

function parseConfig(raw, portal = "invest") {
  const fallback = defaultConfig(portal);
  if (!raw) return JSON.parse(JSON.stringify(fallback));
  try {
    const parsed = JSON.parse(raw);
    const ids = new Set(fallback.identities.map((i) => i.id));
    const identities = fallback.identities.map((base) => {
      const saved = (parsed.identities || []).find((i) => i.id === base.id);
      return saved ? { ...base, ...saved, id: base.id } : base;
    });
    const assignments = { ...fallback.assignments, ...(parsed.assignments || {}) };
    for (const p of purposesFor(portal)) {
      if (!ids.has(assignments[p])) assignments[p] = "noreply";
    }
    return {
      identities,
      assignments,
      autoEmails: { ...fallback.autoEmails, ...(parsed.autoEmails || {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

export async function getEmailCommunicationConfig(portal = "invest") {
  const raw = await getSetting(configKey(portal));
  return parseConfig(raw, portal);
}

export async function saveEmailCommunicationConfig(config, portal = "invest") {
  await setSettings({ [configKey(portal)]: JSON.stringify(config) });
  return getEmailCommunicationConfig(portal);
}

export async function getEmailCommunicationBundle(portal = "invest") {
  const config = await getEmailCommunicationConfig(portal);
  const purposes = purposesFor(portal);
  const purposeMeta = purposeMetaFor(portal);
  const autoEmailsEnabled = purposes.filter((p) => config.autoEmails[p]?.enabled !== false).length;
  const defaultBox = await getDefaultMailbox(portal, false);
  const supportBox = await getMailbox(portal, "support", false);

  const resolvedFrom = {};
  for (const purpose of purposes) {
    const id = config.assignments[purpose] || "noreply";
    const identity = config.identities.find((i) => i.id === id);
    const mailbox = await getMailbox(portal, id, false);
    const address = mailbox?.address || identity?.address;
    const name = mailbox?.name || identity?.name;
    if (address) resolvedFrom[purpose] = `${name} <${address}>`;
    else resolvedFrom[purpose] = `${defaultBox?.name || "Akshaya Exim"} <${defaultBox?.address || "noreply@akshayaexim.com"}>`;
  }

  const noreplyMb = await getMailbox(portal, "noreply", true);
  const smtpConfigured = isMailboxSmtpConfigured(noreplyMb);

  return {
    portal,
    config,
    purposeMeta,
    purposes,
    resolvedFrom,
    summary: {
      smtp: {
        configured: smtpConfigured,
        enabled: smtpConfigured,
        from: defaultBox?.address ? `${defaultBox.name} <${defaultBox.address}>` : "",
      },
      inbox: {
        configured: !!(supportBox?.address),
        enabled: true,
        address: supportBox?.address || "",
      },
      identities: config.identities.length,
      autoEmailsEnabled,
      autoEmailsTotal: purposes.length,
      defaultMailbox: defaultBox?.address || "",
    },
  };
}

export async function sendPurposeTestEmail(purpose, testTo, portal = "invest") {
  const bundle = await getEmailCommunicationBundle(portal);
  const auto = bundle.config.autoEmails[purpose];
  const from = bundle.resolvedFrom[purpose] || bundle.summary.smtp.from;
  const { sendMail } = await import("../utils/mailer.js");
  const subject = auto?.subject || `Test: ${purpose}`;
  await sendMail({
    to: testTo,
    subject: `[Test] ${subject}`,
    html: `<p>Test email for <b>${purpose}</b> on ${portal} portal.</p><p>From: ${from}</p>`,
    portal,
    purpose,
  });
  return { ok: true, message: `Test email sent to ${testTo}` };
}
