import { useEffect, useState } from "react";
import { investApi, mainApi, getToken } from "../../lib/api.js";
import { Alert } from "../ui.jsx";

const PORTAL_CONFIG = {
  invest: {
    api: investApi,
    exportPath: "/admin/export",
    datasetsPath: "/admin/export/datasets",
    importPath: "/admin/import",
    filePrefix: "akshaya-invest",
  },
  main: {
    api: mainApi,
    exportPath: "/admin/export",
    datasetsPath: "/admin/export/datasets",
    importPath: "/admin/import",
    filePrefix: "akshaya-main",
  },
};

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataPortabilityPanel({ portal = "invest", canImport = false }) {
  const cfg = PORTAL_CONFIG[portal];
  const api = cfg.api;

  const [datasets, setDatasets] = useState({});
  const [selected, setSelected] = useState([]);
  const [format, setFormat] = useState("json");
  const [loading, setLoading] = useState(false);
  const [lastCounts, setLastCounts] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(cfg.datasetsPath)
      .then((d) => {
        const ds = d.datasets || {};
        setDatasets(ds);
        setSelected(Object.keys(ds));
      })
      .catch(() => {});
  }, [portal]);

  const toggle = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const exportData = async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        format,
        datasets: selected.join(","),
      });
      if (format === "csv") {
        const token = getToken(portal);
        const res = await fetch(`/api/${portal}${cfg.exportPath}?${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(await res.text());
        const text = await res.text();
        downloadBlob(text, `${cfg.filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
      } else {
        const data = await api(`${cfg.exportPath}?${qs}`);
        setLastCounts(data.counts);
        downloadBlob(
          JSON.stringify(data, null, 2),
          `${cfg.filePrefix}-${new Date().toISOString().slice(0, 10)}.json`,
          "application/json"
        );
      }
    } catch (e) {
      setErr(e.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const onImportFile = (e) => {
    setImportPreview(null);
    setImportResult(null);
    setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setImportPreview({
          name: file.name,
          datasets: parsed.datasets || Object.keys(parsed.data || {}),
          counts: parsed.counts || {},
        });
        setImportPayload(parsed);
      } catch {
        setErr("Import file must be valid JSON export from this platform.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const [importPayload, setImportPayload] = useState(null);

  const runImport = async () => {
    if (!importPayload || !canImport) return;
    if (!window.confirm("Import selected data? Existing records may be updated. Continue?")) return;
    setLoading(true);
    setErr("");
    try {
      const result = await api(cfg.importPath, { method: "POST", body: importPayload });
      setImportResult(result);
      setImportPreview(null);
      setImportPayload(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack max-w-3xl">
      <div>
        <h2 className="text-lg font-bold">Backup, export & import</h2>
        <p className="text-sm text-muted-foreground">
          Download platform data for backup or migration. Passwords, SMTP secrets, and uploaded files are never included.
        </p>
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {importResult && (
        <Alert type="success">
          Import complete: {Object.entries(importResult.imported || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "done"}
          {importResult.errors?.length ? ` · ${importResult.errors.length} warning(s)` : ""}
        </Alert>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">What to export</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(datasets).map(([key, meta]) => (
            <label key={key} className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-sm cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(key)}
                onChange={() => toggle(key)}
              />
              <span>
                <span className="font-medium">{meta.label || key}</span>
                {meta.sensitive && <span className="ml-1 text-xs text-amber-600">(sensitive metadata)</span>}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">File format</label>
            <select className="input w-auto" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="json">JSON (recommended — full structure)</option>
              <option value="csv">CSV (tabular — one section per dataset)</option>
            </select>
          </div>
          <button type="button" className="btn-gold" disabled={loading || selected.length === 0} onClick={exportData}>
            {loading ? "Working…" : "Download export"}
          </button>
        </div>

        {lastCounts && (
          <p className="text-xs text-muted-foreground">
            Last export row counts: {Object.entries(lastCounts).map(([k, v]) => `${k} ${v}`).join(" · ")}
          </p>
        )}
      </div>

      {canImport && (
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold">Import data</h3>
          <p className="text-sm text-muted-foreground">
            Upload a JSON export from this portal. Supported: investment plans, site settings (invest); categories & products (main).
            CSV import is not supported — use JSON exports only.
          </p>
          <input type="file" accept=".json,application/json" onChange={onImportFile} className="text-sm" />
          {importPreview && (
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <div><strong>{importPreview.name}</strong></div>
              <div>Datasets: {(importPreview.datasets || []).join(", ") || "—"}</div>
              <button type="button" className="btn-gold mt-2 text-sm" disabled={loading} onClick={runImport}>
                Confirm import
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card p-4 text-xs text-muted-foreground space-y-1">
        <p><strong>Not included in exports:</strong> password hashes, reset tokens, SMTP passwords, KYC document files, agreement PDF binaries.</p>
        <p><strong>Full server backup:</strong> Super Admin can create and restore complete snapshots (databases + uploads) in the section above.</p>
      </div>
    </div>
  );
}
