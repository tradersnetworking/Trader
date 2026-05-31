// Scope-aware API client. scope is "main" (marketplace) or "invest" (portal).
const TOKEN_KEYS = { main: "aex_main_token", invest: "aex_invest_token" };

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
  const res = await fetch(`/api/${scope}${path}`, { method, headers, body: payload });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const mainApi = (path, opts) => api("main", path, opts);
export const investApi = (path, opts) => api("invest", path, opts);
