import { getSetting, setSettings } from "./investSettings.js";
import {
  getAdditionalDomainsConfig,
  normalizeHostname,
} from "./additionalDomains.js";
import {
  DEFAULT_INVEST_MAILBOXES,
  getMailboxConfig,
  saveMailboxConfig,
} from "./mailboxConfig.js";

const ROUTE_KEY = "invest_mail_route_additional_domain";
const DOMAIN_ID_KEY = "invest_mail_additional_domain_id";
const SUBDOMAIN_SUFFIX = "akshayaexim.in";

export function localPartFromAddress(address, fallbackId = "noreply") {
  if (!address || !address.includes("@")) return fallbackId;
  return address.split("@")[0];
}

export function addressForLocalPart(localPart, domain) {
  return `${localPart}@${domain}`;
}

export async function getInvestEmailRoutingInfo() {
  const routeEnabled = (await getSetting(ROUTE_KEY)) === "true";
  const cfg = await getAdditionalDomainsConfig();
  const preferredId = await getSetting(DOMAIN_ID_KEY);
  let active =
    cfg.domains.find((d) => d.id === preferredId && d.enabled) ||
    cfg.domains.find((d) => d.enabled && d.useForSharing) ||
    cfg.domains.find((d) => d.enabled);
  const additionalDomain = active ? normalizeHostname(active.hostname) : null;
  const effectiveDomain = routeEnabled && additionalDomain ? additionalDomain : SUBDOMAIN_SUFFIX;
  return {
    routeEnabled,
    routingActive: routeEnabled && Boolean(additionalDomain),
    subdomainDomain: SUBDOMAIN_SUFFIX,
    additionalDomain,
    additionalDomainId: active?.id || "",
    effectiveDomain,
    canEnableRouting: Boolean(additionalDomain),
    availableDomains: cfg.domains.map((d) => ({
      id: d.id,
      hostname: normalizeHostname(d.hostname),
      enabled: d.enabled,
      useForSharing: d.useForSharing !== false,
      note: d.note || "",
    })),
  };
}

export async function setInvestEmailRouting({ enabled, domainId }) {
  if (domainId !== undefined && domainId) {
    const cfg = await getAdditionalDomainsConfig();
    const match = cfg.domains.find((d) => d.id === domainId && d.enabled);
    if (!match) throw new Error("Selected additional domain is not enabled or does not exist");
    await setSettings({ [DOMAIN_ID_KEY]: domainId });
  } else if (domainId === "" || domainId === null) {
    await setSettings({ [DOMAIN_ID_KEY]: "" });
  }

  if (enabled === true || enabled === false) {
    await setSettings({ [ROUTE_KEY]: enabled ? "true" : "false" });
    if (enabled === false) {
      await revertInvestMailboxesToSubdomain();
      return getInvestEmailRoutingInfo();
    }
  }

  const info = await getInvestEmailRoutingInfo();
  if (info.routingActive) {
    await ensureInvestMailboxesRouted();
  }
  return getInvestEmailRoutingInfo();
}

/** Resolve hostname from an enabled additional domain id or hostname string. */
export async function resolveConfiguredAdditionalDomain(input) {
  if (!input) throw new Error("Additional domain is required");
  const cfg = await getAdditionalDomainsConfig();
  const byId = cfg.domains.find((d) => d.id === input && d.enabled);
  if (byId) return normalizeHostname(byId.hostname);
  const h = normalizeHostname(input);
  const byHost = cfg.domains.find((d) => d.enabled && normalizeHostname(d.hostname) === h);
  if (byHost) return h;
  throw new Error("Domain must be an enabled additional invest domain");
}

function defaultSubdomainAddress(mailboxId) {
  const fb = DEFAULT_INVEST_MAILBOXES.mailboxes.find((m) => m.id === mailboxId);
  return fb?.address || addressForLocalPart(mailboxId, SUBDOMAIN_SUFFIX);
}

function rewriteMailboxForDomain(mb, domain) {
  const subdomainAddress = mb.subdomainAddress || mb.address || defaultSubdomainAddress(mb.id);
  const local = localPartFromAddress(subdomainAddress, mb.id);
  const nextAddress = addressForLocalPart(local, domain);
  const smtp = { ...mb.smtp };
  const imap = { ...mb.imap };
  const smtpUser = smtp.user || mb.address || "";
  const imapUser = imap.user || mb.address || "";
  if (!smtp.user || smtpUser.endsWith(`@${SUBDOMAIN_SUFFIX}`) || smtpUser === subdomainAddress) {
    smtp.user = nextAddress;
  }
  if (!imap.user || imapUser.endsWith(`@${SUBDOMAIN_SUFFIX}`) || imapUser === subdomainAddress) {
    imap.user = nextAddress;
  }
  return { ...mb, subdomainAddress, address: nextAddress, smtp, imap };
}

/** Rewrite all 5 invest mailboxes to @additionalDomain addresses + sync SMTP/IMAP logins. */
export async function applyAdditionalDomainToMailboxes(domainHostname) {
  const domain = await resolveConfiguredAdditionalDomain(domainHostname);

  const existing = await getMailboxConfig("invest", true);
  const mailboxes = existing.mailboxes.map((mb) => rewriteMailboxForDomain(mb, domain));

  await saveMailboxConfig("invest", { mailboxes });
  await syncInvestEmailIdentitiesFromMailboxes(mailboxes);
  return { mailboxes, domain };
}

/** Restore @akshayaexim.in addresses on all invest mailboxes. */
export async function revertInvestMailboxesToSubdomain() {
  const info = await getInvestEmailRoutingInfo();
  const extraSuffix = info.additionalDomain ? `@${info.additionalDomain}` : null;
  const existing = await getMailboxConfig("invest", true);
  const mailboxes = existing.mailboxes.map((mb) => {
    const subdomainAddress = mb.subdomainAddress || defaultSubdomainAddress(mb.id);
    const smtp = { ...mb.smtp };
    const imap = { ...mb.imap };
    if (!smtp.user || (extraSuffix && smtp.user.endsWith(extraSuffix))) smtp.user = subdomainAddress;
    if (!imap.user || (extraSuffix && imap.user.endsWith(extraSuffix))) imap.user = subdomainAddress;
    return { ...mb, address: subdomainAddress, subdomainAddress, smtp, imap };
  });
  await saveMailboxConfig("invest", { mailboxes });
  await syncInvestEmailIdentitiesFromMailboxes(mailboxes);
  await setSettings({ [ROUTE_KEY]: "false" });
  return { mailboxes };
}

/** Keep email-communication sender identities aligned with mailbox addresses. */
export async function syncInvestEmailIdentitiesFromMailboxes(mailboxes) {
  const { getEmailCommunicationConfig, saveEmailCommunicationConfig } = await import("./emailCommunication.js");
  const config = await getEmailCommunicationConfig("invest");
  config.identities = config.identities.map((id) => {
    const mb = mailboxes.find((m) => m.id === id.id);
    if (!mb) return id;
    return { ...id, address: mb.address, name: mb.name || id.name };
  });
  await saveEmailCommunicationConfig(config, "invest");
  return config;
}

/** When routing is on, ensure mailboxes use additional domain (auto-apply if still on .in). */
export async function ensureInvestMailboxesRouted() {
  const info = await getInvestEmailRoutingInfo();
  if (!info.routingActive || !info.additionalDomain) return info;

  const cfg = await getMailboxConfig("invest", true);
  const stillOnSubdomain = cfg.mailboxes.some((m) => (m.address || "").endsWith(`@${SUBDOMAIN_SUFFIX}`));
  if (stillOnSubdomain) {
    await applyAdditionalDomainToMailboxes(info.additionalDomain);
  }
  return getInvestEmailRoutingInfo();
}

export async function getInvestEmailRoutingBundle() {
  const routing = await getInvestEmailRoutingInfo();
  const mailboxCfg = await getMailboxConfig("invest", false);
  return { routing, mailboxes: mailboxCfg };
}
