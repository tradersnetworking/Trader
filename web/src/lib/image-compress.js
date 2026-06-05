/** Compress large images in-browser before KYC upload. */

async function imageToJpegFile(file, { maxEdge = 2400, quality = 0.9, maxBytes = 5 * 1024 * 1024 } = {}) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
  const sizeScale =
    file.size > maxBytes ? Math.min(scale, Math.sqrt(maxBytes / file.size) * 0.95) : scale;
  const w = Math.max(1, Math.round(bitmap.width * sizeScale));
  const h = Math.max(1, Math.round(bitmap.height * sizeScale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression failed"))), "image/jpeg", quality);
  });
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export async function compressImageIfNeeded(file, maxBytes = 5 * 1024 * 1024, quality = 0.85) {
  if (!file?.type?.startsWith("image/") || file.size <= maxBytes) return file;
  if (file.type === "application/pdf") return file;
  return imageToJpegFile(file, { quality });
}

/** Normalize phone-camera photos before upload — improves acceptance rate. */
export async function prepareKycImageForUpload(file) {
  if (!file?.type?.startsWith("image/")) return file;
  if (file.type === "application/pdf") return file;
  return imageToJpegFile(file, { maxEdge: 2400, quality: 0.92, maxBytes: 8 * 1024 * 1024 });
}
