/**
 * Browser storage policy: localStorage holds auth tokens only.
 * UI state, checkout drafts, and consent flags use sessionStorage and are cleared on refresh cycles.
 */

import { clearPendingInvest } from "./pendingInvest.js";

export const STORAGE_SCHEMA_VERSION = 3;

const SESSION_SCHEMA_KEY = "aex_storage_schema";

/** Keys allowed in localStorage (credentials only). */
export const CREDENTIAL_LOCAL_KEYS = new Set(["aex_main_token", "aex_invest_token"]);

const EPHEMERAL_SESSION_KEYS = new Set([
  "invest_pending",
  "paypal_deposit_id",
  "paypal_access_token",
  "bank_deposit_va",
  "aex_main_session_msg",
  "aex_invest_session_msg",
]);

function safe(fn) {
  try {
    fn();
  } catch {
    /* private mode / blocked storage */
  }
}

/** Remove every localStorage key except invest/main JWT tokens. */
export function pruneLocalStorageToCredentials() {
  safe(() => {
    const saved = {};
    for (const key of CREDENTIAL_LOCAL_KEYS) {
      const v = localStorage.getItem(key);
      if (v) saved[key] = v;
    }
    localStorage.clear();
    for (const [key, value] of Object.entries(saved)) {
      localStorage.setItem(key, value);
    }
  });
}

export function clearEphemeralSessionData() {
  safe(() => {
    const remove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (EPHEMERAL_SESSION_KEYS.has(key) || key.startsWith("aex_pending")) {
        remove.push(key);
      }
    }
    remove.forEach((k) => sessionStorage.removeItem(k));
    clearPendingInvest();
  });
}

/** On app load / schema bump: drop stale local data, keep tokens. */
export function syncBrowserStorageSchema() {
  safe(() => {
    const prev = Number(sessionStorage.getItem(SESSION_SCHEMA_KEY) || 0);
    if (prev >= STORAGE_SCHEMA_VERSION) return;
    pruneLocalStorageToCredentials();
    clearEphemeralSessionData();
    sessionStorage.setItem(SESSION_SCHEMA_KEY, String(STORAGE_SCHEMA_VERSION));
  });
}

/** After login or when entering KYC-gated dashboard — fresh API data, no cached drafts. */
export function refreshInvestClientState() {
  pruneLocalStorageToCredentials();
  clearEphemeralSessionData();
}

export function purgeOnLogout() {
  safe(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** sessionStorage helpers for non-credential UI prefs (cleared when tab closes). */
export function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function sessionSet(key, value) {
  safe(() => {
    if (value == null || value === "") sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  });
}
