import { getToken } from "./api.js";

export async function fetchAgreementPdfBlob(agreementId, { download = false, admin = false } = {}) {
  const base = admin ? `/admin/agreements/${agreementId}` : `/agreements/${agreementId}`;
  const path = download ? `${base}/download` : `${base}/view`;
  const token = getToken("invest");
  const res = await fetch(`/api/invest${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      throw new Error(data.error || "Could not load PDF");
    }
    throw new Error("Could not load PDF");
  }
  return res.blob();
}

export async function fetchAgreementUserSettings() {
  const token = getToken("invest");
  const res = await fetch("/api/invest/agreements/settings/public", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data;
}

export async function fetchAgreementAdminSettings() {
  const { investApi } = await import("./api.js");
  return investApi("/admin/agreement-settings");
}

export async function saveAgreementAdminSettings(body) {
  const { investApi } = await import("./api.js");
  return investApi("/admin/agreement-settings", { method: "PUT", body });
}

export async function fetchAgreementCompanySettings() {
  const { investApi } = await import("./api.js");
  return investApi("/admin/agreement-company-settings");
}

export async function saveAgreementCompanySettings(body) {
  const { investApi } = await import("./api.js");
  return investApi("/admin/agreement-company-settings", { method: "PUT", body });
}
