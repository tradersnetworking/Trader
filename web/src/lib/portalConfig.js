/** Public invest portal URLs — share base, browse base, payment origin (main domain only). */

let cached = null;
let loadPromise = null;

export function resetPortalConfigCache() {
  cached = null;
  loadPromise = null;
}

export async function loadPortalConfig(force = false) {
  if (force) resetPortalConfigCache();
  if (cached) return cached;
  if (!loadPromise) {
    loadPromise = fetch("/api/invest/public/portal-config")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        cached = {
          investSubdomainUrl: data.investSubdomainUrl || "https://invest.akshayaexim.com",
          shareBaseUrl: data.shareBaseUrl || data.investSubdomainUrl || "https://invest.akshayaexim.com",
          investPortalUrl: data.investPortalUrl || data.shareBaseUrl || "https://invest.akshayaexim.com",
          paymentOrigin: data.paymentOrigin || "https://akshayaexim.com",
          additionalDomainActive: Boolean(data.additionalDomainActive),
          shareUsesAdditionalDomain: Boolean(data.shareUsesAdditionalDomain),
          additionalDomains: data.additionalDomains || [],
        };
        return import("./site.js").then(({ setInvestAliasHosts }) => {
          setInvestAliasHosts(cached.additionalDomains.map((d) => d.hostname));
          return cached;
        });
      });
  }
  return loadPromise;
}

export function getPortalConfig() {
  return cached;
}

export function investShareBase() {
  return cached?.shareBaseUrl || "https://invest.akshayaexim.com";
}

export function investBrowseBase() {
  if (typeof window !== "undefined" && window.location.hostname) {
    const h = window.location.hostname.toLowerCase().replace(/^www\./, "");
    if (h.startsWith("invest.") || (cached?.additionalDomains || []).some((d) => d.hostname === h)) {
      return window.location.origin;
    }
  }
  return cached?.investPortalUrl || cached?.shareBaseUrl || "https://invest.akshayaexim.com";
}

export function investShareUrl(subpath = "") {
  const base = investShareBase().replace(/\/$/, "");
  const tail = subpath && subpath !== "/" ? (subpath.startsWith("/") ? subpath : `/${subpath}`) : "";
  return `${base}${tail || "/"}`;
}

export function paymentOriginPublic() {
  return cached?.paymentOrigin || "https://akshayaexim.com";
}
