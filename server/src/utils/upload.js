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

const KYC_MIMES = new Set(["image/jpeg", "image/png", "application/pdf"]);

/** Client-facing max 10 MB; server accepts up to 15 MB (multipart overhead). */
export const KYC_CLIENT_MAX_BYTES = 10 * 1024 * 1024;
export const KYC_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const KYC_MAX_FIELD_BYTES = 2 * 1024 * 1024;

export const upload = multer({
  storage,
  limits: {
    fileSize: KYC_MAX_FILE_BYTES,
    files: 16,
    fieldSize: KYC_MAX_FIELD_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = KYC_MIMES.has(mime) || [".jpg", ".jpeg", ".png", ".pdf"].includes(ext);
    cb(ok ? null : new Error("Only JPG, JPEG, PNG, and PDF files are allowed"), ok);
  },
});

export const kycSingleUpload = multer({
  storage,
  limits: { fileSize: KYC_MAX_FILE_BYTES, files: 1, fieldSize: KYC_MAX_FIELD_BYTES },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = KYC_MIMES.has(mime) || [".jpg", ".jpeg", ".png", ".pdf"].includes(ext);
    cb(ok ? null : new Error("Only JPG, JPEG, PNG, and PDF files are allowed"), ok);
  },
}).single("file");

export const fileUrl = (filename) => (filename ? `/uploads/${filename}` : null);
