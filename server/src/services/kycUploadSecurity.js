import fs from "fs";
import path from "path";
import crypto from "crypto";

const BLOCKED_EXT = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".sh",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".html",
  ".htm",
  ".svg",
  ".zip",
  ".rar",
  ".7z",
  ".dll",
  ".so",
  ".jar",
]);

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".pdf"]);

const MAGIC = [
  { ext: ".jpg", mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: ".png", mime: "image/png", check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: ".pdf", mime: "application/pdf", check: (b) => b.slice(0, 5).toString("utf8") === "%PDF-" },
];

export function logKycUpload(level, message, meta = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, area: "kyc-upload", message, ...meta });
  if (level === "error") console.error(line);
  else console.log(line);
}

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function validateKycUploadBasics(file) {
  if (!file?.path) return { ok: false, code: "MISSING", message: "No file received." };
  const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
  if (BLOCKED_EXT.has(ext)) {
    return { ok: false, code: "BLOCKED_TYPE", message: "Executable or unsafe file types are not allowed." };
  }
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, code: "INVALID_TYPE", message: "Only JPG, JPEG, PNG, and PDF files are allowed." };
  }
  const size = file.size ?? fs.statSync(file.path).size;
  if (size > 15 * 1024 * 1024) {
    return { ok: false, code: "TOO_LARGE", message: "File exceeds the 15 MB server limit." };
  }
  if (size < 512) {
    return { ok: false, code: "TOO_SMALL", message: "File is empty or too small." };
  }
  return { ok: true, ext, size };
}

export function validateKycFileMagic(filePath, extHint) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, buf, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  const ext = extHint || path.extname(filePath).toLowerCase();
  if (ext === ".jpeg" || ext === ".jpg") {
    const m = MAGIC.find((x) => x.ext === ".jpg");
    if (!m?.check(buf)) return { ok: false, code: "MIME_MISMATCH", message: "File content does not match JPEG format." };
    return { ok: true, mime: "image/jpeg" };
  }
  if (ext === ".png") {
    const m = MAGIC.find((x) => x.ext === ".png");
    if (!m?.check(buf)) return { ok: false, code: "MIME_MISMATCH", message: "File content does not match PNG format." };
    return { ok: true, mime: "image/png" };
  }
  if (ext === ".pdf") {
    const m = MAGIC.find((x) => x.ext === ".pdf");
    if (!m?.check(buf)) return { ok: false, code: "MIME_MISMATCH", message: "File content does not match PDF format." };
    return { ok: true, mime: "application/pdf" };
  }
  return { ok: false, code: "INVALID_TYPE", message: "Unsupported file type." };
}

/** Optional ClamAV / external scan hook — set KYC_VIRUS_SCAN_CMD with {file} placeholder. */
export async function scanUploadedFile(filePath) {
  const cmd = process.env.KYC_VIRUS_SCAN_CMD;
  if (!cmd) {
    return { ok: true, result: "skipped" };
  }
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const run = promisify(execFile);
    const safeCmd = cmd.replace("{file}", filePath);
    await run(safeCmd, { shell: true, timeout: 60000 });
    return { ok: true, result: "clean" };
  } catch (e) {
    const msg = e.message || "";
    if (/Can't open file or directory|No such file|not found|AV Engine|database/i.test(msg)) {
      logKycUpload("warn", "Virus scan skipped (definitions not ready)", { filePath });
      return { ok: true, result: "skipped-no-defs" };
    }
    logKycUpload("error", "Virus scan failed", { filePath, err: msg });
    return { ok: false, result: "failed", message: "File failed security scan." };
  }
}
