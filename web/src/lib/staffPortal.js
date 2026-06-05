import { api, getToken } from "./api.js";
import { investUrl, mainUrl, isLocalDev, isInvestHost, isMainHost } from "./site.js";

/** Apply tokens returned when admin/super-admin signs in or updates email. */
export function applyStaffSiblingLogin(res, { loginMain, loginInvest }) {
  if (res?.mainToken && res?.mainUser && loginMain) loginMain(res.mainToken, res.mainUser);
  if (res?.investToken && res?.investUser && loginInvest) loginInvest(res.investToken, res.investUser);
}

/** Staff (ADMIN / SUPERADMIN) may switch between marketplace and invest hosts. */
export function showCrossPortalSwitch() {
  return true;
}

/** True when switching between production subdomains (separate localStorage). */
export function needsStaffHandoff(fromPortal, toPortal) {
  if (isLocalDev() || fromPortal === toPortal) return false;
  if (fromPortal === "invest" && toPortal === "main") return !isMainHost();
  if (fromPortal === "main" && toPortal === "invest") return !isInvestHost();
  return false;
}

/**
 * Open the other staff dashboard. Uses one-time handoff across origins;
 * on localhost both tokens are stored at login when possible.
 */
export async function openStaffPortal({ fromPortal, toPortal, next = "/admin" }) {
  const targetScope = toPortal === "invest" ? "invest" : "main";
  const dest =
    toPortal === "invest" ? investUrl(next) : mainUrl(next);

  if (!needsStaffHandoff(fromPortal, toPortal)) {
    if (getToken(targetScope)) {
      window.location.href = dest;
      return;
    }
  }

  const fromScope = fromPortal === "invest" ? "invest" : "main";
  const { code } = await api(fromScope, "/auth/staff-handoff", {
    method: "POST",
    body: { target: targetScope },
  });
  if (!code) throw new Error("Could not start portal switch. Try again.");
  const handoffBase =
    toPortal === "invest" ? investUrl("/staff-handoff") : mainUrl("/staff-handoff");
  const nextPath = next.startsWith("/") ? next : `/${next}`;
  const sep = handoffBase.includes("?") ? "&" : "?";
  const target = `${handoffBase}${sep}code=${encodeURIComponent(code)}&next=${encodeURIComponent(nextPath)}`;
  window.location.assign(target);
}
