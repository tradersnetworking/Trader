import { getToken, ApiError } from "./api.js";

const EXT_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export function mimeFromFilename(filename) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXT_MIME[ext] || "application/octet-stream";
}

export function filenameFromStoredUrl(storedUrl) {
  if (!storedUrl || typeof storedUrl !== "string") return "file";
  if (storedUrl.startsWith("data:")) return "inline";
  const clean = storedUrl.split("?")[0];
  return clean.slice(clean.lastIndexOf("/") + 1) || "file";
}

/** Map stored /uploads/... paths to authenticated API URLs (Kuber-style). */
export function resolveSecureUploadUrl(storedUrl, scope = "invest") {
  if (!storedUrl) return "";
  if (storedUrl.startsWith("data:")) return storedUrl;
  if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) return storedUrl;

  let path = storedUrl.trim();
  const folderMatch = path.match(/(?:^|\/)(kyc_documents|payment_proofs|mail_attachments)\/([^/?#]+)$/);
  if (folderMatch) {
    return `/api/${scope}/uploads-secure/${folderMatch[2]}`;
  }

  const flat = path.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
  const filename = flat.split("/").pop();
  if (!filename || filename.includes("..")) return path;
  return `/api/${scope}/uploads-secure/${filename}`;
}

async function fetchBlobWithScope(path, scope) {
  const headers = {};
  const token = getToken(scope);
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { headers });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      throw new ApiError(data.error || `Failed to load file (${res.status})`, { status: res.status });
    }
    throw new ApiError(`Failed to load file (${res.status})`, { status: res.status });
  }
  const blob = await res.blob();
  if (!blob.size) throw new ApiError("Empty file", { status: res.status });
  return blob;
}

/** Fetch protected upload with session token; caller must revoke blobUrl. */
export async function fetchSecureUpload(storedUrl, scope = "invest") {
  if (!storedUrl) throw new ApiError("No file");
  if (storedUrl.startsWith("data:")) {
    const res = await fetch(storedUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return {
      blobUrl,
      mimeType: blob.type || "image/png",
      filename: "signature",
    };
  }

  const url = resolveSecureUploadUrl(storedUrl, scope);
  const blob = await fetchBlobWithScope(url, scope);
  const filename = filenameFromStoredUrl(storedUrl);
  const headerType = blob.type?.split(";")[0]?.trim();
  const mimeType =
    headerType && headerType !== "application/octet-stream" ? headerType : mimeFromFilename(filename);
  return { blobUrl: URL.createObjectURL(blob), mimeType, filename };
}

export async function openSecureUploadInTab(storedUrl, scope = "invest") {
  const { blobUrl, mimeType, filename } = await fetchSecureUpload(storedUrl, scope);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
    a.download = filename;
  }
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}
