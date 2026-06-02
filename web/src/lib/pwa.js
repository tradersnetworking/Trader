/** Invest-portal PWA only — no install prompt or manifest on main marketplace host. */

const INVEST_MANIFEST = "/manifest.invest.webmanifest";
const DISMISS_KEY = "aex_invest_pwa_dismiss_until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

let deferredPrompt = null;
let swRegistration = null;

function upsertLink(rel, href, extra = {}) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
}

function removeLink(rel) {
  document.querySelector(`link[rel="${rel}"]`)?.remove();
}

function upsertMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(name) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

export function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIosSafari() {
  const ua = navigator.userAgent || "";
  const ios = /iphone|ipad|ipod/i.test(ua);
  const webkit = /webkit/i.test(ua);
  return ios && webkit && !/crios|fxios/i.test(ua);
}

function onBeforeInstallPrompt(e) {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new Event("aex-pwa-ready"));
}

export function configurePortalPwa(mode) {
  if (mode === "invest") {
    upsertLink("manifest", INVEST_MANIFEST);
    upsertMeta("theme-color", "#002366");
    upsertMeta("mobile-web-app-capable", "yes");
    upsertMeta("apple-mobile-web-app-capable", "yes");
    upsertMeta("apple-mobile-web-app-title", "AKSHAYA Invest");
    upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return;
  }

  deferredPrompt = null;
  removeLink("manifest");
  removeMeta("mobile-web-app-capable");
  removeMeta("apple-mobile-web-app-capable");
  removeMeta("apple-mobile-web-app-title");
  window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
}

export async function registerInvestServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    return swRegistration;
  } catch {
    return null;
  }
}

export async function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  swRegistration = null;
}

export function canShowPwaInstallPrompt() {
  if (isStandaloneDisplay()) return false;
  const until = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
  if (until > Date.now()) return false;
  if (deferredPrompt) return true;
  return isIosSafari();
}

export function dismissPwaInstallPrompt() {
  sessionStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  window.dispatchEvent(new Event("aex-pwa-dismiss"));
}

export async function triggerPwaInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === "accepted") dismissPwaInstallPrompt();
    return outcome === "accepted";
  }
  return false;
}

export function subscribePwaInstallReady(cb) {
  const handler = () => cb();
  window.addEventListener("aex-pwa-ready", handler);
  window.addEventListener("aex-pwa-dismiss", handler);
  return () => {
    window.removeEventListener("aex-pwa-ready", handler);
    window.removeEventListener("aex-pwa-dismiss", handler);
  };
}
