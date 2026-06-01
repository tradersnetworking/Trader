import sharp from "sharp";
import { copyFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
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

for (const size of [16, 32, 48]) {
  await sharp(markOut).resize(size, size).png().toFile(join(outDir, `favicon-${size}.png`));
}
await sharp(markOut).resize(32, 32).png().toFile(join(outDir, "favicon.png"));
copyFileSync(join(outDir, "favicon.png"), join(root, "public", "favicon.png"));

/** Embed PNG in ICO container (supported by modern browsers) */
function writeIcoFromPng(pngPath, icoPath) {
  const png = readFileSync(pngPath);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir[0] = 32;
  dir[1] = 32;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(22, 12);
  writeFileSync(icoPath, Buffer.concat([header, dir, png]));
}
writeIcoFromPng(join(outDir, "favicon.png"), join(root, "public", "favicon.ico"));
writeIcoFromPng(join(outDir, "favicon.png"), join(outDir, "favicon.ico"));

await sharp(markOut).resize(180, 180).png().toFile(join(outDir, "apple-touch-icon.png"));
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
