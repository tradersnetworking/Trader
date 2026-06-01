import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${nanoid(8)}${ext}`);
  },
});

const KYC_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();
    const ok =
      KYC_MIMES.has(mime) ||
      [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"].includes(ext);
    cb(ok ? null : new Error("Only images (JPG, PNG, WebP) and PDF files are allowed"), ok);
  },
});

export const fileUrl = (filename) => (filename ? `/uploads/${filename}` : null);
