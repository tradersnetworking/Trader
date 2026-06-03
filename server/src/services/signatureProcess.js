import fs from "fs";
import path from "path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { uploadsDir, fileUrl } from "../utils/upload.js";

/** Remove light background; keep dark ink for agreement PDFs. Original file path unchanged. */
export async function processSignatureForAgreement(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  const outName = `sig-agreement-${nanoid(12)}.png`;
  const outPath = path.join(uploadsDir, outName);

  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .resize(1400, 500, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const threshold = 232;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= threshold) data[i + 3] = 0;
    else data[i + 3] = 255;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outPath);

  return fileUrl(outName);
}

export async function processSignatureDataUrlForAgreement(dataUrl) {
  if (!dataUrl?.startsWith("data:image")) return null;
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) return null;
  const tmp = path.join(uploadsDir, `sig-tmp-${nanoid(8)}.${m[1] === "png" ? "png" : "jpg"}`);
  fs.writeFileSync(tmp, Buffer.from(m[2], "base64"));
  try {
    return await processSignatureForAgreement(tmp);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}
