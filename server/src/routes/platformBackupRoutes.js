import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  backupConfig,
  createPlatformBackup,
  deletePlatformBackup,
  getBackupArchivePath,
  getBackupStatus,
  restorePlatformBackup,
  streamBackupArchive,
} from "../services/platformBackup.js";
import { logAudit } from "../services/auditLog.js";

function restoreUploadMiddleware() {
  const cfg = backupConfig();
  const storage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fs.mkdir(cfg.backupDir, { recursive: true });
        cb(null, cfg.backupDir);
      } catch (e) {
        cb(e);
      }
    },
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || "upload.tar.gz").replace(/[^\w.-]/g, "_");
      cb(null, `upload-restore-${Date.now()}-${safe}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: Number(process.env.PLATFORM_BACKUP_MAX_UPLOAD_BYTES || 1024 * 1024 * 1024) },
    fileFilter: (_req, file, cb) => {
      const name = String(file.originalname || "").toLowerCase();
      const ok = name.endsWith(".tar.gz") || name.endsWith(".tgz") || file.mimetype === "application/gzip";
      cb(ok ? null : new Error("Upload a .tar.gz backup archive."), ok);
    },
  }).single("backup");
}

/** Register super-admin backup/restore routes on invest or main admin router. */
export function registerPlatformBackupRoutes(router, { authRequired, asyncH, superOnly, scope }) {
  const base = scope === "invest" ? "/platform" : "/admin/platform";
  const uploadMw = restoreUploadMiddleware();

  router.get(
    `${base}/backup/status`,
    authRequired(scope),
    superOnly,
    asyncH(async (_req, res) => {
      res.json(await getBackupStatus());
    })
  );

  router.post(
    `${base}/backup`,
    authRequired(scope),
    superOnly,
    asyncH(async (req, res) => {
      if (String(req.body?.confirm || "") !== "BACKUP") {
        return res.status(400).json({
          error: 'Confirmation required. Send JSON body: { "confirm": "BACKUP", "label": "optional note" }',
        });
      }
      const result = await createPlatformBackup({
        actorEmail: req.user?.email,
        actorName: req.user?.name,
        label: req.body?.label,
      });
      if (!result.ok) return res.status(result.error?.includes("already") ? 409 : 503).json(result);
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
        action: "PLATFORM_BACKUP",
        entity: "PlatformBackup",
        entityId: result.backup?.id,
        meta: JSON.stringify({ sizeBytes: result.backup?.sizeBytes }),
      }).catch(() => {});
      res.json(result);
    })
  );

  router.get(
    `${base}/backup/:id/download`,
    authRequired(scope),
    superOnly,
    asyncH(async (req, res) => {
      const archivePath = await getBackupArchivePath(req.params.id);
      if (!archivePath) return res.status(404).json({ error: "Backup not found" });
      streamBackupArchive(archivePath, res, `${req.params.id}.tar.gz`);
    })
  );

  router.post(
    `${base}/backup/:id/restore`,
    authRequired(scope),
    superOnly,
    asyncH(async (req, res) => {
      if (String(req.body?.confirm || "") !== "RESTORE") {
        return res.status(400).json({
          error: 'Confirmation required. Send JSON body: { "confirm": "RESTORE" }',
        });
      }
      const result = await restorePlatformBackup({
        backupId: req.params.id,
        actorEmail: req.user?.email,
        actorName: req.user?.name,
      });
      if (!result.ok) return res.status(503).json(result);
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
        action: "PLATFORM_RESTORE",
        entity: "PlatformBackup",
        entityId: req.params.id,
        meta: JSON.stringify({ preBackup: result.preBackup?.id, restart: result.restart }),
      }).catch(() => {});
      res.json(result);
    })
  );

  router.post(
    `${base}/backup/restore-upload`,
    authRequired(scope),
    superOnly,
    (req, res, next) => {
      uploadMw(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || "Upload failed" });
        next();
      });
    },
    asyncH(async (req, res) => {
      if (String(req.body?.confirm || "") !== "RESTORE") {
        if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => {});
        return res.status(400).json({
          error: 'Confirmation required. Send form field confirm=RESTORE with the backup file.',
        });
      }
      if (!req.file?.path) return res.status(400).json({ error: "No backup file uploaded." });
      const archivePath = req.file.path;
      const result = await restorePlatformBackup({
        archivePath,
        actorEmail: req.user?.email,
        actorName: req.user?.name,
      });
      await fs.rm(archivePath, { force: true }).catch(() => {});
      if (!result.ok) return res.status(503).json(result);
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
        action: "PLATFORM_RESTORE",
        entity: "PlatformBackup",
        entityId: result.restoredFrom,
        meta: JSON.stringify({ source: "upload", preBackup: result.preBackup?.id }),
      }).catch(() => {});
      res.json(result);
    })
  );

  router.delete(
    `${base}/backup/:id`,
    authRequired(scope),
    superOnly,
    asyncH(async (req, res) => {
      const result = await deletePlatformBackup(req.params.id);
      if (!result.ok) return res.status(400).json(result);
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
        action: "PLATFORM_BACKUP_DELETE",
        entity: "PlatformBackup",
        entityId: req.params.id,
      }).catch(() => {});
      res.json(result);
    })
  );
}
