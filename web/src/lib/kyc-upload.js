import { getToken } from "./api.js";
import { compressImageIfNeeded } from "./image-compress.js";
import { validateKycFile, KYC_MAX_BYTES } from "./kyc-document-fields.js";
import { networkErrorMessage } from "./upload-limits.js";

const RETRY_DELAYS = [0, 1500, 3500];

export async function sha256OfFile(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Validate before any network call — returns error string or null. */
export function validateBeforeKycUpload(file, { imageOnly = false } = {}) {
  return validateKycFile(file, { imageOnly });
}

export async function prepareKycFile(file) {
  let f = file;
  const err = validateBeforeKycUpload(f);
  if (err) throw new Error(err);
  if (f.size > 5 * 1024 * 1024 && f.type.startsWith("image/")) {
    f = await compressImageIfNeeded(f);
  }
  if (f.size > KYC_MAX_BYTES) {
    throw new Error(`File is still too large after compression (max ${KYC_MAX_BYTES / (1024 * 1024)} MB).`);
  }
  return f;
}

function xhrUpload(url, formData, { onProgress, method = "POST" } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    const token = getToken("invest");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else {
        const msg =
          (data && typeof data === "object" && data.error) ||
          networkErrorMessage(null, { status: xhr.status }) ||
          `Upload failed (${xhr.status})`;
        const err = new Error(msg);
        err.status = xhr.status;
        err.code = data?.code;
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error(networkErrorMessage(new TypeError("Failed to fetch"))));
    xhr.ontimeout = () => reject(new Error(networkErrorMessage(null, { status: 504 })));
    xhr.timeout = 300000;
    xhr.send(formData);
  });
}

export async function uploadKycDocument(fieldKey, file, { onProgress, knownHashes = {} } = {}) {
  const prepared = await prepareKycFile(file);
  const hash = await sha256OfFile(prepared);
  const dupField = Object.entries(knownHashes).find(([, h]) => h === hash)?.[0];
  if (dupField && dupField !== fieldKey) {
    throw new Error(`This file is already used for ${dupField}. Choose a different document.`);
  }

  const fd = new FormData();
  fd.append("file", prepared);
  const url = `/api/invest/kyc/files/${encodeURIComponent(fieldKey)}`;

  let lastErr;
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    if (RETRY_DELAYS[i]) await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]));
    try {
      const res = await xhrUpload(url, fd, { onProgress: i === 0 ? onProgress : undefined });
      return { ...res, sha256: hash, preparedFile: prepared };
    } catch (e) {
      lastErr = e;
      if (e.status === 400 || e.status === 413 || e.status === 429) break;
    }
  }
  throw lastErr;
}

export async function deleteKycDocument(fieldKey) {
  const token = getToken("invest");
  const res = await fetch(`/api/invest/kyc/files/${encodeURIComponent(fieldKey)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not remove file");
  return data;
}

export async function saveKycDraftApi({ step, form }) {
  const { investApi } = await import("./api.js");
  return investApi("/kyc/draft", { method: "PUT", body: { step, form } });
}
