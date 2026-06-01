import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

export function resolveLocalUploadPath(storedUrl) {
  if (!storedUrl?.trim()) return null;
  const u = storedUrl.trim();
  const pub = u.match(/^\/uploads\/(.+)$/);
  if (pub) return path.join(uploadsDir, decodeURIComponent(pub[1]));
  try {
    if (fs.existsSync(u)) return u;
  } catch { /* ignore */ }
  return null;
}

export function loadUploadImageBuffer(storedUrl) {
  const local = resolveLocalUploadPath(storedUrl);
  if (!local) return null;
  try {
    if (!fs.existsSync(local)) return null;
    return fs.readFileSync(local);
  } catch {
    return null;
  }
}

export function documentOnFileLabel(url) {
  return url?.trim() ? "On file" : "Not provided";
}
