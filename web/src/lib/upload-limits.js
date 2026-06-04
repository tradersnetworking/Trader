/** Must match server multer limit (upload.js) and nginx client_max_body_size. */
export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_BYTES = 72 * 1024 * 1024;

export function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** Validate File entries before multipart submit; returns error string or null. */
export function validateUploadFiles(fileMap) {
  let total = 0;
  for (const f of Object.values(fileMap || {})) {
    if (!f) continue;
    if (f.size > MAX_UPLOAD_FILE_BYTES) {
      return `“${f.name}” is too large (max ${formatBytes(MAX_UPLOAD_FILE_BYTES)} per file).`;
    }
    total += f.size;
  }
  if (total > MAX_UPLOAD_TOTAL_BYTES) {
    return `Total upload size is ${formatBytes(total)} (max ${formatBytes(MAX_UPLOAD_TOTAL_BYTES)}). Upload fewer files or compress images.`;
  }
  return null;
}

export function networkErrorMessage(err, { status } = {}) {
  const msg = err?.message || "";
  if (status === 413) {
    return "Upload too large. Use JPG, JPEG, PNG, or PDF under 10 MB per file (total under 72 MB).";
  }
  if (status === 502 || status === 504) {
    return "Upload timed out while processing. Try fewer or smaller files (compress photos), then submit again.";
  }
  if (msg === "Failed to fetch" || err?.name === "TypeError") {
    return "Upload failed — connection lost or the server timed out. Use JPG/JPEG/PNG/PDF under 10 MB each (total under 72 MB), wait for uploads to finish, and try again.";
  }
  return msg || "Request failed";
}
