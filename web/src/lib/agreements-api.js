import { investFetchBlob } from "./api.js";

function isPdfBlob(blob) {
  if (!blob?.size) return false;
  if (blob.type?.includes("pdf")) return true;
  return true;
}

export async function fetchAgreementPdfBlob(agreementId, { download = false, admin = false } = {}) {
  const base = admin ? `/admin/agreements/${agreementId}` : `/agreements/${agreementId}`;
  const path = download ? `${base}/download` : `${base}/view`;
  const blob = await investFetchBlob(path);
  if (!isPdfBlob(blob)) {
    throw new Error("Could not load agreement PDF. Please sign in again and retry.");
  }
  return blob;
}

export async function openAgreementPdfInNewTab(agreementId, { admin = false } = {}) {
  const blob = await fetchAgreementPdfBlob(agreementId, { admin });
  const tabUrl = URL.createObjectURL(blob);
  window.open(tabUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(tabUrl), 120_000);
}

export async function fetchAgreementUserSettings() {
  const { investApi } = await import("./api.js");
  return investApi("/agreements/settings/public");
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
