/** Compress large images in-browser before KYC upload. */

export async function compressImageIfNeeded(file, maxBytes = 5 * 1024 * 1024, quality = 0.85) {
  if (!file?.type?.startsWith("image/") || file.size <= maxBytes) return file;
  if (file.type === "application/pdf") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, Math.sqrt(maxBytes / file.size) * 0.95);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
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
