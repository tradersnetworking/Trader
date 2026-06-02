import { investApi, investFetchBlob } from "./api.js";

async function assertPdfBlob(blob) {
  if (!blob?.size) throw new Error("Empty agreement PDF returned");
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const sig = String.fromCharCode(...head);
  if (!sig.startsWith("%PDF")) {
    throw new Error("Could not load agreement PDF. Please sign in again and retry.");
  }
  if (!blob.type?.includes("pdf")) {
    return new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
  }
  return blob;
}

export async function fetchAgreementPdfViewUrl(agreementId, { admin = false } = {}) {
  const base = admin ? `/admin/agreements/${agreementId}` : `/agreements/${agreementId}`;
  const { url } = await investApi(`${base}/view-url`);
  if (!url) throw new Error("Could not open agreement viewer");
  return url;
}

export async function fetchAgreementPdfBlob(agreementId, { download = false, admin = false } = {}) {
  const base = admin ? `/admin/agreements/${agreementId}` : `/agreements/${agreementId}`;
  const path = download ? `${base}/download` : `${base}/view`;
  const blob = await investFetchBlob(path);
  return assertPdfBlob(blob);
}

export async function fetchAgreementUserSettings() {
  return investApi("/agreements/settings/public");
}

export async function fetchAgreementAdminSettings() {
  return investApi("/admin/agreement-settings");
}

export async function saveAgreementAdminSettings(body) {
  return investApi("/admin/agreement-settings", { method: "PUT", body });
}

export async function fetchAgreementCompanySettings() {
  return investApi("/admin/agreement-company-settings");
}

export async function saveAgreementCompanySettings(body) {
  return investApi("/admin/agreement-company-settings", { method: "PUT", body });
}
