import nodemailer from "nodemailer";
import { getSetting, setSettings } from "./investSettings.js";

export const MAILBOX_IDS = {
  main: ["noreply", "support", "finance", "compliance", "trade"],
  invest: ["noreply", "support", "finance", "compliance", "invest"],
};

const CONFIG_KEYS = {
  main: "main_mailboxes_config",
  invest: "invest_mailboxes_config",
};

function emptySmtp() {
  return { host: "", port: "587", secure: false, user: "", pass: "" };
}

function emptyImap() {
  return { host: "", port: "993", secure: true, user: "", pass: "" };
}

function mailbox(id, label, name, address) {
  return { id, label, name, address, smtp: emptySmtp(), imap: emptyImap() };
}

export const DEFAULT_MAIN_MAILBOXES = {
  defaultMailboxId: "noreply",
  mailboxes: [
    mailbox("noreply", "No Reply (Default)", "Akshaya EXIM TRADERS", "noreply@akshayaexim.com"),
    mailbox("support", "Support", "Akshaya Exim Support", "support@akshayaexim.com"),
    mailbox("finance", "Finance & Billing", "Akshaya Exim Finance", "finance@akshayaexim.com"),
    mailbox("compliance", "Compliance / KYC", "Akshaya Exim Compliance", "compliance@akshayaexim.com"),
    mailbox("trade", "Trade & Orders", "Akshaya Exim Trade Desk", "trade@akshayaexim.com"),
  ],
};

export const DEFAULT_INVEST_MAILBOXES = {
  defaultMailboxId: "noreply",
  mailboxes: [
    mailbox("noreply", "No Reply (Default)", "AKSHYA INVESTMENTS", "noreply@akshayaexim.in"),
    mailbox("support", "Support", "AKSHYA INVESTMENTS Support", "support@akshayaexim.in"),
    mailbox("finance", "Finance & Payouts", "AKSHYA INVESTMENTS Finance", "finance@akshayaexim.in"),
    mailbox("compliance", "Compliance / KYC", "AKSHYA INVESTMENTS Compliance", "compliance@akshayaexim.in"),
    mailbox("invest", "Investor Relations", "AKSHYA INVESTMENTS", "invest@akshayaexim.in"),
  ],
};

function defaultsFor(portal) {
  return portal === "main" ? DEFAULT_MAIN_MAILBOXES : DEFAULT_INVEST_MAILBOXES;
}

function mergeMailbox(saved, fallback) {
  const smtp = { ...fallback.smtp, ...(saved.smtp || {}) };
  const imap = { ...fallback.imap, ...(saved.imap || {}) };
  if (smtp.pass === "••••••••") smtp.pass = fallback.smtp.pass;
  if (imap.pass === "••••••••") imap.pass = fallback.imap.pass;
  return {
    id: fallback.id,
    label: saved.label || fallback.label,
    name: saved.name || fallback.name,
    address: saved.address || fallback.address,
    subdomainAddress: saved.subdomainAddress || "",
    smtp,
    imap,
  };
}

function parseConfig(raw, portal) {
  const base = JSON.parse(JSON.stringify(defaultsFor(portal)));
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    const byId = Object.fromEntries((parsed.mailboxes || []).map((m) => [m.id, m]));
    return {
      defaultMailboxId: parsed.defaultMailboxId || "noreply",
      mailboxes: base.mailboxes.map((fb) => mergeMailbox(byId[fb.id] || {}, fb)),
    };
  } catch {
    return base;
  }
}

function maskSecrets(config) {
  return {
    ...config,
    mailboxes: config.mailboxes.map((m) => ({
      ...m,
      smtp: { ...m.smtp, pass: m.smtp.pass ? "••••••••" : "" },
      imap: { ...m.imap, pass: m.imap.pass ? "••••••••" : "" },
    })),
  };
}

export async function getMailboxConfig(portal, includeSecrets = false) {
  const key = CONFIG_KEYS[portal] || CONFIG_KEYS.invest;
  const raw = await getSetting(key);
  const config = parseConfig(raw, portal);
  return includeSecrets ? config : maskSecrets(config);
}

export async function saveMailboxConfig(portal, incoming) {
  const existing = await getMailboxConfig(portal, true);
  const allowed = new Set(MAILBOX_IDS[portal] || MAILBOX_IDS.invest);
  const merged = {
    defaultMailboxId: "noreply",
    mailboxes: existing.mailboxes.map((base) => {
      const patch = (incoming.mailboxes || []).find((m) => m.id === base.id);
      if (!patch || !allowed.has(base.id)) return base;
      const smtp = { ...base.smtp, ...(patch.smtp || {}) };
      const imap = { ...base.imap, ...(patch.imap || {}) };
      if (smtp.pass === "••••••••" || smtp.pass === "") smtp.pass = base.smtp.pass;
      if (imap.pass === "••••••••" || imap.pass === "") imap.pass = base.imap.pass;
      return {
        ...base,
        label: patch.label ?? base.label,
        name: patch.name ?? base.name,
        address: patch.address ?? base.address,
        subdomainAddress: patch.subdomainAddress ?? base.subdomainAddress ?? "",
        smtp,
        imap,
      };
    }),
  };
  const key = CONFIG_KEYS[portal] || CONFIG_KEYS.invest;
  await setSettings({ [key]: JSON.stringify(merged) });
  return getMailboxConfig(portal, false);
}

export async function getMailbox(portal, mailboxId, includeSecrets = false) {
  const config = await getMailboxConfig(portal, includeSecrets);
  return config.mailboxes.find((m) => m.id === mailboxId) || config.mailboxes.find((m) => m.id === "noreply");
}

export async function getDefaultMailbox(portal, includeSecrets = false) {
  return getMailbox(portal, "noreply", includeSecrets);
}

export function isMailboxSmtpConfigured(mailbox) {
  return !!(mailbox?.smtp?.host && mailbox?.smtp?.user && mailbox?.smtp?.pass);
}

export function isMailboxImapConfigured(mailbox) {
  return !!(mailbox?.imap?.host && mailbox?.imap?.user && mailbox?.imap?.pass);
}

export function createSmtpTransporter(mailbox) {
  if (!isMailboxSmtpConfigured(mailbox)) return null;
  return nodemailer.createTransport({
    host: mailbox.smtp.host,
    port: Number(mailbox.smtp.port) || 587,
    secure: mailbox.smtp.secure === true || mailbox.smtp.secure === "true",
    auth: { user: mailbox.smtp.user, pass: mailbox.smtp.pass },
  });
}

export async function getTransporterForMailbox(portal, mailboxId) {
  const mailbox = await getMailbox(portal, mailboxId, true);
  return createSmtpTransporter(mailbox);
}

export async function testMailboxSmtp(portal, mailboxId) {
  const transporter = await getTransporterForMailbox(portal, mailboxId);
  if (!transporter) throw new Error("SMTP not configured for this mailbox");
  await transporter.verify();
  const mailbox = await getMailbox(portal, mailboxId, false);
  return { ok: true, message: `SMTP verified for ${mailbox.address}` };
}

export async function testMailboxImap(portal, mailboxId) {
  const mailbox = await getMailbox(portal, mailboxId, true);
  if (!isMailboxImapConfigured(mailbox)) throw new Error("IMAP not configured for this mailbox");
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: mailbox.imap.host,
    port: Number(mailbox.imap.port) || 993,
    secure: mailbox.imap.secure !== false && mailbox.imap.secure !== "false",
    auth: { user: mailbox.imap.user, pass: mailbox.imap.pass },
  });
  await client.connect();
  await client.logout();
  return { ok: true, message: `IMAP verified for ${mailbox.address}` };
}

export async function getMailboxBundle(portal) {
  const config = await getMailboxConfig(portal, false);
  const configured = config.mailboxes.filter((m) => isMailboxSmtpConfigured(m)).length;
  const imapReady = config.mailboxes.filter((m) => isMailboxImapConfigured(m)).length;
  const defaultBox = config.mailboxes.find((m) => m.id === "noreply");
  let emailDomain = portal === "main" ? "akshayaexim.com" : "akshayaexim.in";
  let emailRouting = null;
  if (portal === "invest") {
    const { getInvestEmailRoutingInfo } = await import("./investEmailRouting.js");
    emailRouting = await getInvestEmailRoutingInfo();
    emailDomain = emailRouting.effectiveDomain;
  }
  return {
    portal,
    domain: emailDomain,
    emailRouting,
    config,
    summary: {
      total: config.mailboxes.length,
      smtpConfigured: configured,
      imapConfigured: imapReady,
      defaultAddress: defaultBox?.address || "",
      effectiveDomain: emailDomain,
    },
  };
}
