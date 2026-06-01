import { nanoid } from "nanoid";
import { config } from "../config.js";
import { getSetting, setSettings } from "./investSettings.js";

const STORAGE_KEY = "invest_additional_domains";

const MAIN_HOSTS = new Set([
  "akshayaexim.com",
  "www.akshayaexim.com",
  "akshayaexim.in",
  "www.akshayaexim.in",
  "localhost",
  "127.0.0.1",
]);

let aliasHostCache = new Set();
let disabledHostCache = new Set();
let shareOriginCache = null;
let cacheAt = 0;

export function normalizeHostname(raw = "") {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .split(":")[0];
}

function defaultInvestSubdomainUrl() {
  const fromEnv = process.env.INVEST_ORIGIN || config.investOrigin || "";
  if (fromEnv && !fromEnv.includes("localhost")) return fromEnv.replace(/\/$/, "");
  return "https://invest.akshayaexim.com";
}

function parseConfig(raw) {
  if (!raw) return { domains: [] };
  try {
    const parsed = JSON.parse(raw);
    return { domains: Array.isArray(parsed.domains) ? parsed.domains : [] };
  } catch {
    return { domains: [] };
  }
}

export async function getAdditionalDomainsConfig() {
  const raw = await getSetting(STORAGE_KEY);
  return parseConfig(raw);
}

export async function saveAdditionalDomainsConfig(data) {
  await setSettings({ [STORAGE_KEY]: JSON.stringify(data) });
  await refreshDomainCache(true);
  return getAdditionalDomainsConfig();
}

export async function refreshDomainCache(force = false) {
  if (!force && Date.now() - cacheAt < 30_000 && aliasHostCache.size >= 0) return;
  const cfg = await getAdditionalDomainsConfig();
  aliasHostCache = new Set();
  disabledHostCache = new Set();
  shareOriginCache = null;
  for (const d of cfg.domains) {
    const h = normalizeHostname(d.hostname);
    if (!h) continue;
    if (d.enabled) aliasHostCache.add(h);
    else disabledHostCache.add(h);
    if (d.enabled && !shareOriginCache && d.useForSharing !== false) {
      shareOriginCache = `https://${h}`;
    }
  }
  cacheAt = Date.now();
}

export function isInvestAliasHostSync(hostname) {
  const h = normalizeHostname(hostname);
  return aliasHostCache.has(h);
}

export async function isInvestAliasHost(hostname) {
  await refreshDomainCache();
  return isInvestAliasHostSync(hostname);
}

/** Host serves invest portal (subdomain or enabled additional domain). */
export async function isInvestPortalHost(hostname) {
  const h = normalizeHostname(hostname);
  if (h.startsWith("invest.")) return true;
  return isInvestAliasHost(h);
}

export async function getInvestShareOrigin() {
  await refreshDomainCache();
  return shareOriginCache || defaultInvestSubdomainUrl();
}

export async function getInvestBrowseOrigin() {
  return getInvestShareOrigin();
}

export async function getPublicPortalConfig() {
  await refreshDomainCache();
  const subdomain = defaultInvestSubdomainUrl();
  const shareBase = shareOriginCache || subdomain;
  const payment = (process.env.PAYMENT_ORIGIN || config.paymentOrigin || config.clientOrigin || "https://akshayaexim.com").replace(/\/$/, "");
  const cfg = await getAdditionalDomainsConfig();
  const enabled = cfg.domains.filter((d) => d.enabled);
  return {
    investSubdomainUrl: subdomain,
    shareBaseUrl: shareBase,
    investPortalUrl: shareBase,
    paymentOrigin: payment,
    additionalDomainActive: enabled.length > 0,
    shareUsesAdditionalDomain: Boolean(shareOriginCache && shareOriginCache !== subdomain),
    additionalDomains: enabled.map((d) => ({
      id: d.id,
      hostname: normalizeHostname(d.hostname),
      useForSharing: d.useForSharing !== false,
    })),
  };
}

function validateHostname(hostname) {
  const h = normalizeHostname(hostname);
  if (!h) throw new Error("Domain name is required");
  if (h.includes("invest.")) throw new Error("Use Additional Domain for custom names — not invest.* subdomains");
  if (MAIN_HOSTS.has(h) || MAIN_HOSTS.has(`www.${h}`)) throw new Error("Main marketplace domains cannot be added as additional invest domains");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(h)) {
    throw new Error("Invalid domain name format");
  }
  return h;
}

export async function addAdditionalDomain({ hostname, note = "", enabled = true, useForSharing = true }) {
  const h = validateHostname(hostname);
  const cfg = await getAdditionalDomainsConfig();
  if (cfg.domains.some((d) => normalizeHostname(d.hostname) === h)) {
    throw new Error("This domain is already configured");
  }
  const entry = {
    id: nanoid(12),
    hostname: h,
    enabled: Boolean(enabled),
    useForSharing: Boolean(useForSharing),
    note: String(note || "").slice(0, 200),
    createdAt: new Date().toISOString(),
  };
  cfg.domains.push(entry);
  if (entry.useForSharing) {
    cfg.domains = cfg.domains.map((d) => ({ ...d, useForSharing: d.id === entry.id }));
  }
  await saveAdditionalDomainsConfig(cfg);
  return entry;
}

export async function updateAdditionalDomain(id, patch) {
  const cfg = await getAdditionalDomainsConfig();
  const idx = cfg.domains.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("Domain not found");
  const cur = cfg.domains[idx];
  if (patch.hostname !== undefined) cur.hostname = validateHostname(patch.hostname);
  if (patch.note !== undefined) cur.note = String(patch.note || "").slice(0, 200);
  if (patch.enabled !== undefined) cur.enabled = Boolean(patch.enabled);
  if (patch.useForSharing === true) {
    cfg.domains = cfg.domains.map((d) => ({ ...d, useForSharing: d.id === id }));
  } else if (patch.useForSharing === false && cur.useForSharing) {
    cur.useForSharing = false;
  }
  cfg.domains[idx] = cur;
  await saveAdditionalDomainsConfig(cfg);
  return cur;
}

export async function deleteAdditionalDomain(id) {
  const cfg = await getAdditionalDomainsConfig();
  const next = cfg.domains.filter((d) => d.id !== id);
  if (next.length === cfg.domains.length) throw new Error("Domain not found");
  await saveAdditionalDomainsConfig({ domains: next });
  return { ok: true };
}

export function isDisabledInvestAliasHostSync(hostname) {
  return disabledHostCache.has(normalizeHostname(hostname));
}

/** Sync host kind helper for Express — call refreshDomainCache on boot. */
export function resolveHostKindSync(req) {
  const h = normalizeHostname(req.hostname || req.headers.host);
  if (h.startsWith("invest.")) return "invest";
  if (isInvestAliasHostSync(h)) return "invest";
  if (isDisabledInvestAliasHostSync(h)) return "invest-disabled";
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return "local";
  return "main";
}

// Warm cache on import in production
refreshDomainCache(true).catch(() => {});
