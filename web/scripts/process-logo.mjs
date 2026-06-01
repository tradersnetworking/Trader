import sharp from "sharp";
import { copyFileSync, mkdirSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "assets");
mkdirSync(outDir, { recursive: true });

const input = process.argv[2] || join(outDir, "logo-source.png");
const fullOut = join(outDir, "logo.png");
const markOut = join(outDir, "logo-mark.png");
const tmpOut = join(outDir, "logo-tmp.png");

/** Remove near-black background for use on navy headers and light pages */
async function makeTransparent(src, dest, threshold = 50) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) data[i + 3] = 0;
  }
  await sharp(data, { raw: info }).png().toFile(dest);
}

await makeTransparent(input, tmpOut);
await sharp(tmpOut).png({ compressionLevel: 9 }).toFile(fullOut);
console.log("Wrote transparent logo.png");

const meta = await sharp(fullOut).metadata();
/* Icon-only mark: top portion of full logo with safe padding */
const cropH = Math.min(meta.height, Math.round(meta.height * 0.52));
const croppedBuf = await sharp(fullOut)
  .extract({ left: 0, top: 0, width: meta.width, height: cropH })
  .png()
  .toBuffer();
const croppedMeta = await sharp(croppedBuf).metadata();
await sharp(croppedBuf)
  .extend({
    top: Math.round(croppedMeta.height * 0.06),
    bottom: Math.round(croppedMeta.height * 0.1),
    left: Math.round(croppedMeta.width * 0.06),
    right: Math.round(croppedMeta.width * 0.06),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(markOut);
console.log("Wrote logo-mark.png");

await sharp(markOut).resize(32, 32).png().toFile(join(outDir, "favicon.png"));
copyFileSync(join(outDir, "favicon.png"), join(root, "public", "favicon.png"));

await sharp(markOut).resize(192, 192).png().toFile(join(outDir, "icon-192.png"));
await sharp(fullOut)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(outDir, "icon-512.png"));

try {
  unlinkSync(tmpOut);
} catch {
  /* ignore */
}

console.log("Done — logo.png, logo-mark.png, favicon.png, icon-192.png, icon-512.png");
