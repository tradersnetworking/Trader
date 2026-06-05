import { getToken } from "./api.js";
import { prepareKycFile, sha256OfFile, packKycDraftForm, unpackKycDraftForm } from "./kyc-upload.js";
import { networkErrorMessage } from "./upload-limits.js";
import { investApi } from "./api.js";

const RETRY_DELAYS = [0, 1500, 3500];

function xhrUpload(url, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
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
    xhr.timeout = 300000;
    xhr.send(formData);
  });
}

export function makeAdminKycApi(investorId) {
  const base = `/admin/investors/${encodeURIComponent(investorId)}/kyc`;

  return {
    loadDraft: () => investApi(base + "/draft"),
    saveDraft: ({ step, form, signatureData, signatureMode }) =>
      investApi(base + "/draft", {
        method: "PUT",
        body: { step, form: packKycDraftForm(form, { signatureData, signatureMode }) },
      }),
    async uploadDocument(fieldKey, file, { onProgress, knownHashes = {} } = {}) {
      const prepared = await prepareKycFile(file);
      const hash = await sha256OfFile(prepared);
      const dupField = Object.entries(knownHashes).find(([, h]) => h === hash)?.[0];
      if (dupField && dupField !== fieldKey) {
        throw new Error(`This file is already used for ${dupField}. Choose a different document.`);
      }
      const fd = new FormData();
      fd.append("file", prepared);
      const url = `/api/invest${base}/files/${encodeURIComponent(fieldKey)}`;
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
    },
    async deleteDocument(fieldKey) {
      const token = getToken("invest");
      const res = await fetch(`/api/invest${base}/files/${encodeURIComponent(fieldKey)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove file");
      return data;
    },
    unpackKycDraftForm,
  };
}
