import { useLocation } from "react-router-dom";
import { getPortalConfig } from "./portalConfig.js";

/** @typedef {"main-host" | "invest-host" | "local"} HostKind */

let investAliasHosts = new Set();

/** Called after /api/invest/public/portal-config loads */
export function setInvestAliasHosts(hosts = []) {
  investAliasHosts = new Set(
    hosts.map((h) => String(h).toLowerCase().replace(/^www\./, "").split(":")[0]).filter(Boolean)
  );
}

function normHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/^www\./, "").split(":")[0];
}

/** @returns {HostKind} */
export function getHostKind() {
  if (typeof window === "undefined") return "local";
  const h = normHost(window.location.hostname);
  if (h.startsWith("invest.")) return "invest-host";
  if (investAliasHosts.has(h)) return "invest-host";
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return "local";
  return "main-host";
}

export function isInvestHost() {
  return getHostKind() === "invest-host";
}

export function isMainHost() {
  return getHostKind() === "main-host";
}

export function isLocalDev() {
  return getHostKind() === "local";
}

/** Sync portal mode from hostname (invest subdomain / additional domain vs main). */
export function getAppSiteMode(pathname = "/") {
  const kind = getHostKind();
  if (kind === "invest-host") return "invest";
  if (kind === "main-host") return "main";
  const p = pathname || "/";
  return p === "/invest" || p.startsWith("/invest/") ? "invest" : "main";
}

/** Active portal: invest subdomain, or /invest/* on localhost */
export function useSiteMode() {
  const { pathname } = useLocation();
  return getAppSiteMode(pathname);
}

/** Route prefix for invest React Router paths */
export function investRouteBase() {
  return isInvestHost() ? "" : "/invest";
}

function norm(subpath = "") {
  if (!subpath || subpath === "/") return "";
  return subpath.startsWith("/") ? subpath : `/${subpath}`;
}

/** In-app path for invest portal (respects host vs localhost prefix) */
export function investPath(subpath = "") {
  const base = investRouteBase();
  const tail = norm(subpath);
  if (!base) return tail || "/";
  return `${base}${tail}`;
}

/** Full URL to invest portal for in-app navigation (current host if already on invest). */
export function investOrigin() {
  if (typeof window === "undefined") return "https://invest.akshayaexim.com";
  if (isInvestHost()) return window.location.origin;
  if (isLocalDev()) return `${window.location.origin}${investPath("")}`;
  const cfg = getPortalConfig();
  if (cfg?.investPortalUrl) return cfg.investPortalUrl.replace(/\/$/, "");
  const host = window.location.hostname.replace(/^www\./i, "");
  const proto = window.location.protocol;
  return `${proto}//invest.${host}`;
}

export function investUrl(subpath = "") {
  const tail = norm(subpath);
  if (isInvestHost() || isLocalDev()) return investPath(subpath);
  return `${investOrigin()}${tail || "/"}`;
}

/** Full URL to marketplace main domain */
export function mainOrigin() {
  if (typeof window === "undefined") return "https://akshayaexim.com";
  if (isMainHost() || isLocalDev()) return window.location.origin;
  const host = window.location.hostname.replace(/^invest\./i, "");
  const proto = window.location.protocol;
  return `${proto}//${host}`;
}

export function mainPath(subpath = "") {
  const tail = norm(subpath);
  if (isInvestHost()) return `${mainOrigin()}${tail || "/"}`;
  return tail || "/";
}

export function mainUrl(subpath = "") {
  return mainPath(subpath);
}

/** Hash anchor on invest home (plans, calculator) */
export function investHash(id) {
  return `${investPath("")}#${id}`;
}

export function applySiteRootClass(mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("site-main", "site-invest");
  root.classList.add(mode === "invest" ? "site-invest" : "site-main");
}
