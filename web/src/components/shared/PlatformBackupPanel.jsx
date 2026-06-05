import { useCallback, useEffect, useState } from "react";
import { investApiForm, investFetchBlob } from "../../lib/api.js";
import { Alert } from "../ui.jsx";

function formatBytes(n) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Super-admin: full VPS backup (SQLite DBs + uploads) with restore.
 * @param {(path: string, opts?: object) => Promise<any>} api — investApi
 */
export default function PlatformBackupPanel({ api }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [restoreId, setRestoreId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await api("/admin/platform/backup/status");
      setStatus(d);
    } catch (e) {
      setErr(e.message || "Could not load backup status");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const runBackup = async () => {
    setConfirmAction(null);
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const d = await api("/admin/platform/backup", {
        method: "POST",
        body: { confirm: "BACKUP" },
      });
      setResult(d);
      await load();
    } catch (e) {
      setErr(e.message || "Backup failed");
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async (id) => {
    setConfirmAction(null);
    setRestoreId(null);
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const d = await api(`/admin/platform/backup/${id}/restore`, {
        method: "POST",
        body: { confirm: "RESTORE" },
      });
      setResult(d);
      await load();
    } catch (e) {
      setErr(e.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const runUploadRestore = async () => {
    if (!uploadFile) return;
    setConfirmAction(null);
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("backup", uploadFile);
      fd.append("confirm", "RESTORE");
      const d = await investApiForm("/admin/platform/backup/restore-upload", fd);
      setResult(d);
      setUploadFile(null);
      await load();
    } catch (e) {
      setErr(e.message || "Restore from upload failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async (id, filename) => {
    setErr("");
    try {
      const blob = await investFetchBlob(`/admin/platform/backup/${id}/download`);
      downloadBlob(blob, filename || `${id}.tar.gz`);
    } catch (e) {
      setErr(e.message || "Download failed");
    }
  };

  const deleteBackup = async (id) => {
    if (!window.confirm("Delete this backup permanently?")) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/admin/platform/backup/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) {
    return <p className="text-sm text-muted-foreground">Loading server backup settings…</p>;
  }

  const backups = status?.backups || [];

  return (
    <div className="page-stack max-w-3xl">
      <div>
        <h3 className="text-lg font-bold text-foreground">Full server backup & restore</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot the live SQLite databases and uploaded files (KYC documents, signatures, images).
          Use this before major changes or to migrate to another VPS.
        </p>
      </div>

      {err && <Alert type="error">{err}</Alert>}

      {!status?.enabled && (
        <Alert type="info">
          Server backup is disabled. Set <code className="text-xs">PLATFORM_BACKUP_ENABLED=true</code> in{" "}
          <code className="text-xs">deploy/.env</code> (enabled by default).
        </Alert>
      )}

      <div className="card space-y-3 p-5 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Storage</span>
            <p className="font-mono text-xs">{status?.backupDir || "/data/backups"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Retention</span>
            <p className="font-medium">Keep last {status?.maxBackups || 20} backups</p>
          </div>
          <div>
            <span className="text-muted-foreground">Includes</span>
            <p className="text-xs">main.db · invest.db · uploads/</p>
          </div>
          <div>
            <span className="text-muted-foreground">Auto-restart after restore</span>
            <p className="font-medium">{status?.canRestart ? "Yes (Docker)" : "Manual restart required"}</p>
          </div>
        </div>
        {(status?.backupRunning || status?.restoreRunning) && (
          <p className="text-xs font-semibold text-amber-600">A backup or restore operation is running…</p>
        )}
        {status?.last && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <p className="font-semibold text-foreground">
              Last {status.last.type}: {status.last.ok ? "Success" : "Failed"} ·{" "}
              {status.last.finished || status.last.started}
            </p>
            {status.last.error && <p className="text-rose-600">{status.last.error}</p>}
            {status.last.warning && <p className="mt-1 text-muted-foreground">{status.last.warning}</p>}
          </div>
        )}
      </div>

      {confirmAction === "backup" ? (
        <div className="card space-y-3 border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold">Create a full server backup now?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold" disabled={busy} onClick={runBackup}>
              {busy ? "Backing up…" : "Yes, create backup"}
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setConfirmAction(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : confirmAction === "restore-upload" ? (
        <div className="card space-y-3 border-rose-500/40 bg-rose-500/5 p-4">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
            Restore from uploaded file? Current data will be overwritten. An automatic pre-restore backup is created first.
          </p>
          <p className="text-xs text-muted-foreground">{uploadFile?.name}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold" disabled={busy} onClick={runUploadRestore}>
              {busy ? "Restoring…" : "Yes, restore now"}
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setConfirmAction(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : restoreId ? (
        <div className="card space-y-3 border-rose-500/40 bg-rose-500/5 p-4">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
            Restore backup <code className="text-xs">{restoreId}</code>? Current data will be overwritten.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold" disabled={busy} onClick={() => runRestore(restoreId)}>
              {busy ? "Restoring…" : "Yes, restore"}
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setRestoreId(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-gold w-full sm:w-auto"
          disabled={!status?.enabled || busy || status?.backupRunning || status?.restoreRunning}
          onClick={() => setConfirmAction("backup")}
        >
          {busy ? "Working…" : "Create full backup"}
        </button>
      )}

      <div className="card p-5 space-y-3">
        <h4 className="font-semibold">Saved backups</h4>
        {!backups.length && <p className="text-sm text-muted-foreground">No backups yet. Create one above.</p>}
        <div className="space-y-2">
          {backups.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-sm">
                <p className="font-mono text-xs truncate">{b.id}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(b.createdAt).toLocaleString()} · {formatBytes(b.sizeBytes)}
                  {b.createdBy ? ` · ${b.createdBy}` : ""}
                </p>
                {b.label && <p className="text-xs">{b.label}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  className="btn-outline px-3 py-1.5 text-xs"
                  onClick={() => downloadBackup(b.id, b.filename)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="btn-outline px-3 py-1.5 text-xs text-amber-700"
                  disabled={busy}
                  onClick={() => setRestoreId(b.id)}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="btn-outline px-3 py-1.5 text-xs text-rose-600"
                  disabled={busy}
                  onClick={() => deleteBackup(b.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h4 className="font-semibold">Restore from downloaded file</h4>
        <p className="text-sm text-muted-foreground">
          Upload a <code className="text-xs">.tar.gz</code> backup created on this platform (from this server or another VPS).
        </p>
        <input
          type="file"
          accept=".tar.gz,.tgz,application/gzip"
          className="text-sm"
          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          className="btn-outline w-full sm:w-auto"
          disabled={!uploadFile || busy}
          onClick={() => setConfirmAction("restore-upload")}
        >
          Restore uploaded backup
        </button>
      </div>

      {result && (
        <div className="card space-y-2 p-4">
          <p className={`text-sm font-bold ${result.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {result.ok ? "Operation completed" : "Operation failed"}
          </p>
          {result.error && <p className="text-xs text-rose-600">{result.error}</p>}
          {result.backup && (
            <p className="text-xs text-muted-foreground">
              Backup {result.backup.id} · {formatBytes(result.backup.sizeBytes)}
            </p>
          )}
          {result.warning && <p className="text-xs text-amber-700">{result.warning}</p>}
          {result.preBackup && (
            <p className="text-xs text-muted-foreground">Pre-restore safety backup: {result.preBackup.id}</p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Restore replaces both marketplace and invest databases plus all uploads. The site may be unavailable briefly.
        For JSON-only data export (no files), use the section below.
      </p>
    </div>
  );
}
