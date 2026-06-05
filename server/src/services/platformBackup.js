/**
 * Super-admin full platform backup: SQLite DBs + uploads volume.
 * Backups persist under /data/backups (Docker app_data volume).
 */
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { uploadsDir } from "../utils/upload.js";

const execFileAsync = promisify(execFile);
const LAST_LOG = "/data/platform-backup-last.json";

let backupRunning = false;
let restoreRunning = false;

const BACKUP_ID_RE = /^backup-\d{4}-\d{2}-\d{2}T[\d-]+Z$/;

export function backupConfig() {
  return {
    enabled: process.env.PLATFORM_BACKUP_ENABLED !== "false",
    backupDir: process.env.PLATFORM_BACKUP_DIR || "/data/backups",
    maxBackups: Number(process.env.PLATFORM_BACKUP_MAX || 20),
    mainDb: "/data/main.db",
    investDb: "/data/invest.db",
    uploadsDir,
    repoPath: process.env.HOST_REPO_PATH || "/host-repo",
    composeFile: process.env.PLATFORM_DEPLOY_COMPOSE || "deploy/docker-compose.yml",
    canRestart: process.env.PLATFORM_DEPLOY_ENABLED === "true",
  };
}

function safeBackupId(id) {
  const s = String(id || "");
  if (!BACKUP_ID_RE.test(s)) return null;
  return s;
}

async function readLastLog() {
  try {
    return JSON.parse(await fs.readFile(LAST_LOG, "utf8"));
  } catch {
    return null;
  }
}

async function writeLastLog(entry) {
  await fs.mkdir(path.dirname(LAST_LOG), { recursive: true }).catch(() => {});
  await fs.writeFile(LAST_LOG, JSON.stringify(entry, null, 2));
}

async function fileSizeIfExists(filePath) {
  try {
    const st = await fs.stat(filePath);
    return st.size;
  } catch {
    return 0;
  }
}

async function listBackupMetaFiles(cfg) {
  try {
    const names = await fs.readdir(cfg.backupDir);
    const metas = [];
    for (const name of names) {
      if (!name.endsWith(".json") || name.startsWith(".")) continue;
      try {
        const raw = await fs.readFile(path.join(cfg.backupDir, name), "utf8");
        metas.push(JSON.parse(raw));
      } catch {
        /* skip corrupt meta */
      }
    }
    return metas.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  } catch {
    return [];
  }
}

async function pruneOldBackups(cfg) {
  const metas = await listBackupMetaFiles(cfg);
  const excess = metas.slice(cfg.maxBackups);
  for (const meta of excess) {
    const id = safeBackupId(meta.id);
    if (!id) continue;
    await fs.rm(path.join(cfg.backupDir, `${id}.tar.gz`), { force: true }).catch(() => {});
    await fs.rm(path.join(cfg.backupDir, `${id}.json`), { force: true }).catch(() => {});
  }
}

async function stageBackupContents(cfg, stageDir, manifest) {
  await fs.mkdir(path.join(stageDir, "uploads"), { recursive: true });
  await fs.copyFile(cfg.mainDb, path.join(stageDir, "main.db"));
  await fs.copyFile(cfg.investDb, path.join(stageDir, "invest.db"));
  try {
    await fs.cp(cfg.uploadsDir, path.join(stageDir, "uploads"), { recursive: true });
  } catch {
    await fs.mkdir(path.join(stageDir, "uploads"), { recursive: true });
  }
  await fs.writeFile(path.join(stageDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

export async function getBackupStatus() {
  const cfg = backupConfig();
  const backups = await listBackupMetaFiles(cfg);
  const last = await readLastLog();
  return {
    ...cfg,
    backupRunning,
    restoreRunning,
    backups,
    last,
  };
}

export async function createPlatformBackup({ actorEmail, actorName, label, allowDuringRestore = false } = {}) {
  const cfg = backupConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      error: "Platform backup is disabled. Set PLATFORM_BACKUP_ENABLED=true (default) on the server.",
    };
  }
  if (backupRunning) return { ok: false, error: "A backup is already running." };
  if (restoreRunning && !allowDuringRestore) {
    return { ok: false, error: "Cannot backup while a restore is in progress." };
  }

  backupRunning = true;
  const started = new Date().toISOString();
  const id = `backup-${started.replace(/[:.]/g, "-")}`;
  const archivePath = path.join(cfg.backupDir, `${id}.tar.gz`);
  const metaPath = path.join(cfg.backupDir, `${id}.json`);
  const stageDir = path.join(cfg.backupDir, `.stage-${id}`);

  try {
    await fs.mkdir(cfg.backupDir, { recursive: true });
    for (const db of [cfg.mainDb, cfg.investDb]) {
      try {
        await fs.access(db);
      } catch {
        return { ok: false, error: `Database file missing: ${db}` };
      }
    }

    const manifest = {
      version: 1,
      id,
      label: label || null,
      createdAt: started,
      createdBy: actorEmail || actorName || "superadmin",
      includes: ["main.db", "invest.db", "uploads/"],
    };
    await stageBackupContents(cfg, stageDir, manifest);
    await execFileAsync("tar", ["-czf", archivePath, "-C", stageDir, "."], { timeout: 600_000 });
    await fs.rm(stageDir, { recursive: true, force: true });

    const sizeBytes = await fileSizeIfExists(archivePath);
    const meta = {
      id,
      filename: `${id}.tar.gz`,
      label: label || null,
      sizeBytes,
      createdAt: started,
      createdBy: actorEmail || actorName || "superadmin",
      includes: manifest.includes,
    };
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    await pruneOldBackups(cfg);

    const finished = new Date().toISOString();
    const result = { ok: true, started, finished, backup: meta };
    await writeLastLog({ type: "backup", ok: true, ...result });
    return result;
  } catch (e) {
    await fs.rm(stageDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(archivePath, { force: true }).catch(() => {});
    await fs.rm(metaPath, { force: true }).catch(() => {});
    const result = { ok: false, started, finished: new Date().toISOString(), error: e.message };
    await writeLastLog({ type: "backup", ...result });
    return result;
  } finally {
    backupRunning = false;
  }
}

async function restartApiContainer(cfg) {
  if (!cfg.canRestart) {
    return { restarted: false, message: "Restart the API container manually to complete restore." };
  }
  const composePath = path.join(cfg.repoPath, cfg.composeFile);
  const projectDir = path.join(cfg.repoPath, "deploy");
  try {
    await fs.access(composePath);
    await execFileAsync(
      "docker",
      ["compose", "-f", composePath, "--project-directory", projectDir, "restart", "api"],
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 }
    );
    return { restarted: true, message: "API container restarted." };
  } catch (e) {
    return { restarted: false, message: e.message || "Could not restart API container." };
  }
}

async function extractArchive(archivePath, extractDir) {
  await fs.mkdir(extractDir, { recursive: true });
  await execFileAsync("tar", ["-xzf", archivePath, "-C", extractDir], { timeout: 600_000 });
  const manifestRaw = await fs.readFile(path.join(extractDir, "manifest.json"), "utf8");
  const manifest = JSON.parse(manifestRaw);
  for (const required of ["main.db", "invest.db"]) {
    await fs.access(path.join(extractDir, required));
  }
  return manifest;
}

async function applyRestorePayload(cfg, extractDir) {
  await fs.copyFile(path.join(extractDir, "main.db"), cfg.mainDb);
  await fs.copyFile(path.join(extractDir, "invest.db"), cfg.investDb);
  const uploadsSrc = path.join(extractDir, "uploads");
  try {
    await fs.access(uploadsSrc);
    await fs.rm(cfg.uploadsDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(cfg.uploadsDir, { recursive: true });
    await fs.cp(uploadsSrc, cfg.uploadsDir, { recursive: true });
  } catch {
    /* uploads optional in very old backups */
  }
}

export async function restorePlatformBackup({
  backupId,
  archivePath,
  actorEmail,
  actorName,
  skipPreBackup = false,
} = {}) {
  const cfg = backupConfig();
  if (!cfg.enabled) {
    return { ok: false, error: "Platform backup/restore is disabled on this server." };
  }
  if (restoreRunning) return { ok: false, error: "A restore is already running." };
  if (backupRunning) return { ok: false, error: "Cannot restore while a backup is running." };

  const id = backupId ? safeBackupId(backupId) : null;
  let resolvedArchive = archivePath;
  if (id) {
    resolvedArchive = path.join(cfg.backupDir, `${id}.tar.gz`);
  }
  if (!resolvedArchive) return { ok: false, error: "Invalid backup id or file." };

  try {
    await fs.access(resolvedArchive);
  } catch {
    return { ok: false, error: "Backup archive not found." };
  }

  restoreRunning = true;
  const started = new Date().toISOString();
  const extractDir = path.join(cfg.backupDir, `.restore-${Date.now()}`);

  try {
    let preBackup = null;
    if (!skipPreBackup) {
      const pre = await createPlatformBackup({
        actorEmail: "system",
        actorName: "pre-restore",
        label: "Auto backup before restore",
        allowDuringRestore: true,
      });
      if (!pre.ok) {
        return { ok: false, error: `Pre-restore safety backup failed: ${pre.error}` };
      }
      preBackup = pre.backup || null;
    }

    const manifest = await extractArchive(resolvedArchive, extractDir);
    await applyRestorePayload(cfg, extractDir);
    await fs.rm(extractDir, { recursive: true, force: true });

    const restart = await restartApiContainer(cfg);
    const finished = new Date().toISOString();
    const result = {
      ok: true,
      started,
      finished,
      restoredFrom: manifest.id || id || path.basename(resolvedArchive),
      preBackup,
      restart,
      warning: restart.restarted
        ? "Restore applied. The API container was restarted."
        : "Restore applied. Restart the API container to reload database connections.",
    };
    await writeLastLog({ type: "restore", ...result, startedBy: actorEmail || actorName });
    return result;
  } catch (e) {
    await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    const result = { ok: false, started, finished: new Date().toISOString(), error: e.message };
    await writeLastLog({ type: "restore", ...result, startedBy: actorEmail || actorName });
    return result;
  } finally {
    restoreRunning = false;
  }
}

export async function getBackupArchivePath(backupId) {
  const cfg = backupConfig();
  const id = safeBackupId(backupId);
  if (!id) return null;
  const archivePath = path.join(cfg.backupDir, `${id}.tar.gz`);
  try {
    await fs.access(archivePath);
    return archivePath;
  } catch {
    return null;
  }
}

export function streamBackupArchive(archivePath, res, filename) {
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename || path.basename(archivePath)}"`);
  return createReadStream(archivePath).pipe(res);
}

export async function deletePlatformBackup(backupId) {
  const cfg = backupConfig();
  const id = safeBackupId(backupId);
  if (!id) return { ok: false, error: "Invalid backup id." };
  await fs.rm(path.join(cfg.backupDir, `${id}.tar.gz`), { force: true });
  await fs.rm(path.join(cfg.backupDir, `${id}.json`), { force: true });
  return { ok: true, id };
}
