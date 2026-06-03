import { useCallback, useEffect, useState } from "react";
import { Alert } from "../ui.jsx";

/**
 * Super-admin: pull latest from GitHub and rebuild Docker on VPS.
 * @param {(path: string, opts?: object) => Promise<any>} api — mainApi or investApi
 */
export default function PlatformUpdatePanel({ api }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await api("/admin/platform/deploy/status");
      setStatus(d);
    } catch (e) {
      setErr(e.message || "Could not load deploy status");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const runUpdate = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const d = await api("/admin/platform/deploy", {
        method: "POST",
        body: { confirm: "DEPLOY" },
      });
      setResult(d);
      await load();
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) {
    return <p className="text-sm text-muted-foreground">Loading platform update settings…</p>;
  }

  return (
    <div className="page-stack max-w-3xl">
      <div>
        <h3 className="text-lg font-bold text-foreground">Platform Update</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pull the latest code from GitHub and rebuild the live Docker stack on this VPS. Use after you push
          changes to the <code className="text-xs">main</code> branch.
        </p>
      </div>

      {err && <Alert type="error">{err}</Alert>}

      {!status?.enabled && (
        <Alert type="info">
          One-click update is not enabled on this server. On the VPS, add{" "}
          <code className="text-xs">PLATFORM_DEPLOY_ENABLED=true</code> to <code className="text-xs">deploy/.env</code>,
          uncomment the <code className="text-xs">/host-repo</code> and Docker socket volumes in{" "}
          <code className="text-xs">deploy/docker-compose.yml</code>, then rebuild the API container once.
        </Alert>
      )}

      <div className="card space-y-3 p-5 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">GitHub</span>
            <p className="break-all font-medium">{status?.githubUrl || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Branch</span>
            <p className="font-medium">{status?.branch || "main"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Host repo path</span>
            <p className="font-mono text-xs">{status?.repoPath || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Live commit</span>
            <p className="font-mono text-xs">{status?.currentCommit || "—"}</p>
          </div>
        </div>
        {status?.running && (
          <p className="text-xs font-semibold text-amber-600">An update is running…</p>
        )}
        {status?.last && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <p className="font-semibold text-foreground">
              Last run: {status.last.ok ? "Success" : "Failed"} · {status.last.finished || status.last.started}
            </p>
            {status.last.startedBy && <p className="text-muted-foreground">By {status.last.startedBy}</p>}
            {status.last.commitAfter && <p className="mt-1 font-mono">{status.last.commitAfter}</p>}
          </div>
        )}
      </div>

      {!confirmOpen ? (
        <button
          type="button"
          className="btn-gold w-full sm:w-auto"
          disabled={!status?.enabled || busy || status?.running}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? "Updating…" : "Update from GitHub"}
        </button>
      ) : (
        <div className="card space-y-3 border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            Pull <code className="text-xs">{status?.branch}</code> and rebuild Docker? The site may be briefly
            unavailable during rebuild (1–3 minutes).
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold" disabled={busy} onClick={runUpdate}>
              {busy ? "Running update…" : "Yes, update now"}
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card space-y-2 p-4">
          <p className={`text-sm font-bold ${result.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {result.ok ? "Update completed" : "Update failed"}
          </p>
          {result.error && <p className="text-xs text-rose-600">{result.error}</p>}
          {(result.stdout || result.stderr) && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-[10px] leading-relaxed whitespace-pre-wrap">
              {[result.stdout, result.stderr].filter(Boolean).join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
