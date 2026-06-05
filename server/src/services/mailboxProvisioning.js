/**
 * Seed five mailboxes per portal (.com main, .in invest) with Hostinger-style SMTP/IMAP.
 * Passwords come from env — create accounts in hosting panel first, then set SMTP_PASS / portal passwords.
 */

import {
  getMailboxConfig,
  saveMailboxConfig,
  isMailboxSmtpConfigured,
  DEFAULT_MAIN_MAILBOXES,
  DEFAULT_INVEST_MAILBOXES,
} from "./mailboxConfig.js";
import { probeSmtpAuth, smtpRelayUser } from "./smtpTransport.js";
import { getSetting, setSettings } from "./investSettings.js";
import {
  saveEmailCommunicationConfig,
  ensureTransactionalNoreplyRouting,
  MAIN_EMAIL_COMM_CONFIG,
  DEFAULT_EMAIL_COMM_CONFIG,
} from "./emailCommunication.js";

const CONFIG_KEYS = {
  main: { mailboxes: "main_mailboxes_config", email: "main_email_communication_config" },
  invest: { mailboxes: "invest_mailboxes_config", email: "email_communication_config" },
};

function smtpHost() {
  return process.env.SMTP_HOST || "smtp.hostinger.com";
}

function imapHost() {
  return process.env.IMAP_HOST || "imap.hostinger.com";
}

function sharedMailboxPassword() {
  return process.env.MAILBOX_PASSWORD || process.env.SMTP_PASS || "";
}

function portalMailboxPassword(portal) {
  const shared = sharedMailboxPassword();
  if (portal === "main") {
    return process.env.MAIN_MAILBOX_SMTP_PASS || process.env.MAIN_MAILBOX_PASSWORD || shared || "";
  }
  return process.env.INVEST_MAILBOX_SMTP_PASS || process.env.INVEST_MAILBOX_PASSWORD || shared || "";
}

function hasMailboxPasswordEnv() {
  return Boolean(
    process.env.MAILBOX_PASSWORD ||
      process.env.SMTP_PASS ||
      process.env.MAIN_MAILBOX_SMTP_PASS ||
      process.env.MAIN_MAILBOX_PASSWORD ||
      process.env.INVEST_MAILBOX_SMTP_PASS ||
      process.env.INVEST_MAILBOX_PASSWORD
  );
}

function applyProviderTemplate(mailbox, portal, { forcePassword = false } = {}) {
  const pass = portalMailboxPassword(portal);
  const port = String(process.env.SMTP_PORT || "465");
  const secure = process.env.SMTP_SECURE === "true" || port === "465";
  const relayUser =
    portal === "main"
      ? process.env.MAIN_SMTP_RELAY_USER || process.env.SMTP_RELAY_USER || process.env.SMTP_USER || mailbox.address
      : process.env.INVEST_SMTP_RELAY_USER ||
        process.env.SMTP_RELAY_USER ||
        process.env.SMTP_USER ||
        mailbox.address;
  const smtp = {
    host: smtpHost(),
    port,
    secure,
    user: relayUser,
    pass: pass && (forcePassword || !mailbox.smtp?.pass) ? pass : mailbox.smtp?.pass || "",
  };
  const imap = {
    host: imapHost(),
    port: String(process.env.IMAP_PORT || "993"),
    secure: process.env.IMAP_SECURE !== "false",
    user: mailbox.address,
    pass: pass && (forcePassword || !mailbox.imap?.pass) ? pass : mailbox.imap?.pass || "",
  };
  return { ...mailbox, smtp, imap };
}

async function syncLegacySmtpSettings(portal) {
  const pass = portalMailboxPassword(portal);
  if (!pass) return null;
  const config = await getMailboxConfig(portal, true);
  const noreply = config.mailboxes.find((m) => m.id === "noreply");
  if (!noreply?.address) return null;
  const pairs = {
    smtp_host: smtpHost(),
    smtp_port: String(process.env.SMTP_PORT || "587"),
    smtp_secure: process.env.SMTP_SECURE === "true" ? "true" : "false",
    smtp_user: noreply.address,
    smtp_pass: pass,
    default_communication_email: noreply.address,
    mail_from: `${noreply.name} <${noreply.address}>`,
  };
  if (portal === "invest") {
    await setSettings(pairs);
  }
  return pairs;
}

/** Apply SMTP/IMAP hosts + username (= email); optional shared password from env. */
export async function provisionPortalMailboxes(portal, { force = false, forcePassword = false } = {}) {
  const current = await getMailboxConfig(portal, true);
  const merged = {
    defaultMailboxId: "noreply",
    mailboxes: current.mailboxes.map((mb) => {
      if (!force && isMailboxSmtpConfigured(mb)) return mb;
      return applyProviderTemplate(mb, portal, { forcePassword });
    }),
  };
  await saveMailboxConfig(portal, merged);
  const bundle = await getMailboxConfig(portal, false);
  const configured = merged.mailboxes.filter(isMailboxSmtpConfigured).length;
  const noreply = merged.mailboxes.find((m) => m.id === "noreply");
  const pass = portalMailboxPassword(portal) || noreply?.smtp?.pass;
  const authUser = smtpRelayUser(portal, noreply);
  let smtpProbe = null;
  if (pass && authUser) {
    smtpProbe = await probeSmtpAuth({ user: authUser, pass });
    if (smtpProbe.ok) {
      const withProfile = {
        ...merged,
        mailboxes: merged.mailboxes.map((mb) => ({
          ...mb,
          smtp: {
            ...mb.smtp,
            host: smtpProbe.host,
            port: String(smtpProbe.port),
            secure: smtpProbe.secure,
            user: authUser,
          },
        })),
      };
      await saveMailboxConfig(portal, withProfile);
    }
  }
  return {
    portal,
    domain: portal === "main" ? "akshayaexim.com" : "akshayaexim.in",
    addresses: merged.mailboxes.map((m) => m.address),
    smtpConfigured: configured,
    passwordApplied: Boolean(pass),
    smtpVerified: Boolean(smtpProbe?.ok),
    smtpAuthUser: authUser,
    smtpProbe,
    message: smtpProbe?.ok
      ? smtpProbe.message
      : smtpProbe?.hint ||
        (configured === 5
          ? "SMTP saved but login not verified — check Hostinger mailbox password and third-party access."
          : "SMTP hosts and users set — add mailbox passwords in Mail Settings or set SMTP_PASS in server env."),
  };
}

export async function ensureEmailCommunicationConfig(portal) {
  const key = CONFIG_KEYS[portal]?.email || CONFIG_KEYS.invest.email;
  const existing = await getSetting(key);
  if (existing) return { portal, skipped: true };
  const defaults = portal === "main" ? MAIN_EMAIL_COMM_CONFIG : DEFAULT_EMAIL_COMM_CONFIG;
  await saveEmailCommunicationConfig(defaults, portal);
  return { portal, seeded: true };
}

export async function ensureMailboxAddressesSeeded(portal) {
  const key = CONFIG_KEYS[portal]?.mailboxes || CONFIG_KEYS.invest.mailboxes;
  const raw = await getSetting(key);
  if (raw) return { portal, skipped: true };
  const defaults = portal === "main" ? DEFAULT_MAIN_MAILBOXES : DEFAULT_INVEST_MAILBOXES;
  const withTemplate = {
    ...defaults,
    mailboxes: defaults.mailboxes.map((mb) => applyProviderTemplate(mb, portal)),
  };
  await setSettings({ [key]: JSON.stringify(withTemplate) });
  return { portal, seeded: true, addresses: withTemplate.mailboxes.map((m) => m.address) };
}

/** Run on seed / deploy: create configs, wire SMTP template, set default communication routing. */
export async function ensureAllEmailInfrastructure({ provisionSmtp = true } = {}) {
  const results = [];
  const passwordReady = hasMailboxPasswordEnv();
  for (const portal of ["main", "invest"]) {
    results.push(await ensureMailboxAddressesSeeded(portal));
    results.push(await ensureEmailCommunicationConfig(portal));
    results.push(await ensureTransactionalNoreplyRouting(portal));
    if (provisionSmtp && passwordReady) {
      results.push(
        await provisionPortalMailboxes(portal, {
          force: true,
          forcePassword: true,
        })
      );
      results.push({ portal, legacySmtp: await syncLegacySmtpSettings(portal) });
    } else if (provisionSmtp) {
      results.push(await provisionPortalMailboxes(portal, { force: false, forcePassword: false }));
    }
  }
  const curSupport = await getSetting("support_email");
  await setSettings({
    support_email: curSupport || "support@akshayaexim.in",
    default_communication_email: "noreply@akshayaexim.in",
    mail_from: "AKSHAYA INVESTMENTS <noreply@akshayaexim.in>",
  });
  return results;
}

export function listDefaultMailboxAddresses(portal) {
  const defaults = portal === "main" ? DEFAULT_MAIN_MAILBOXES : DEFAULT_INVEST_MAILBOXES;
  return defaults.mailboxes.map((m) => ({ id: m.id, label: m.label, address: m.address }));
}
