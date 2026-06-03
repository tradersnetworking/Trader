// Scope-aware API client. scope is "main" (marketplace) or "invest" (portal).
import { networkErrorMessage } from "./upload-limits.js";

const TOKEN_KEYS = { main: "aex_main_token", invest: "aex_invest_token" };

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isAuthError(err) {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

export function getToken(scope) {
  return localStorage.getItem(TOKEN_KEYS[scope]) || "";
}
export function setToken(scope, token) {
  if (token) localStorage.setItem(TOKEN_KEYS[scope], token);
  else localStorage.removeItem(TOKEN_KEYS[scope]);
}

export async function api(scope, path, { method = "GET", body, isForm } = {}) {
  const headers = {};
  const token = getToken(scope);
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !isForm) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const cache =
    method === "GET" && scope === "invest" && String(path).startsWith("/public/")
      ? "no-store"
      : undefined;
  let res;
  try {
    res = await fetch(`/api/${scope}${path}`, { method, headers, body: payload, cache });
  } catch (e) {
    throw new ApiError(networkErrorMessage(e), { status: 0 });
  }
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.error) ||
      (typeof data === "string" && data.slice(0, 200)) ||
      (res.status === 413 ? "Upload too large. Use smaller files (max 10 MB each)." : `Request failed (${res.status})`);
    throw new ApiError(message, { status: res.status, code: data?.code });
  }
  return data;
}

export const mainApi = (path, opts) => api("main", path, opts);
export const investApi = (path, opts) => api("invest", path, opts);
export const investSecurityApi = (path, opts) => api("invest", `/security${path}`, opts);

export async function mainApiForm(path, formData, method = "POST") {
  const headers = {};
  const token = getToken("main");
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api/main${path}`, { method, headers, body: formData });
  } catch (e) {
    throw new ApiError(networkErrorMessage(e), { status: 0 });
  }
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.error) ||
      (res.status === 413 ? "Upload too large. Use smaller files (max 10 MB each)." : `Request failed (${res.status})`);
    throw new ApiError(message, { status: res.status, code: data?.code });
  }
  return data;
}

export async function investApiForm(path, formData, method = "POST") {
  const headers = {};
  const token = getToken("invest");
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api/invest${path}`, { method, headers, body: formData });
  } catch (e) {
    throw new ApiError(networkErrorMessage(e), { status: 0 });
  }
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.error) ||
      (res.status === 413 ? "Upload too large. Use smaller files (max 10 MB each)." : `Request failed (${res.status})`);
    throw new ApiError(message, { status: res.status, code: data?.code });
  }
  return data;
}

/** Binary response (PDF, CSV) for invest portal. */
export async function investFetchBlob(path, { method = "GET" } = {}) {
  const headers = {};
  const token = getToken("invest");
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/invest${path}`, { method, headers });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      throw new ApiError(data.error || `Request failed (${res.status})`, { status: res.status, code: data?.code });
    }
    const text = await res.text();
    throw new ApiError(text?.slice(0, 200) || `Request failed (${res.status})`, { status: res.status });
  }
  const blob = await res.blob();
  if (!blob.size) throw new ApiError("Empty file returned", { status: res.status });
  return blob;
}

/** Invalidate server session then clear local token. */
export async function logoutScope(scope) {
  try {
    if (getToken(scope)) await api(scope, "/auth/logout", { method: "POST" });
  } catch {
    /* still clear local token */
  }
  setToken(scope, "");
}
