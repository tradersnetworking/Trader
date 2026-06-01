import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";
import { paymentOriginPublic, loadPortalConfig, resetPortalConfigCache } from "../../lib/portalConfig.js";

async function refreshPortalConfig() {
  resetPortalConfigCache();
  await loadPortalConfig(true);
}

export default function AdditionalDomainsPanel() {
  const [domains, setDomains] = useState([]);
  const [form, setForm] = useState({ hostname: "", note: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    investApi("/admin/additional-domains")
      .then((d) => setDomains(d.domains || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      await investApi("/admin/additional-domains", { method: "POST", body: form });
      setForm({ hostname: "", note: "" });
      setMsg("Additional domain added. Point DNS A record to your VPS and enable.");
      load();
      await refreshPortalConfig();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id, enabled) => {
    try {
      await investApi(`/admin/additional-domains/${id}`, { method: "PUT", body: { enabled } });
      load();
      await refreshPortalConfig();
    } catch (e) {
      setErr(e.message);
    }
  };

  const setShare = async (id) => {
    try {
      await investApi(`/admin/additional-domains/${id}`, { method: "PUT", body: { useForSharing: true } });
      setMsg("This domain is now used for referral & social share links.");
      load();
      await refreshPortalConfig();
    } catch (e) {
      setErr(e.message);
    }
  };

  const updateHost = async (id, hostname) => {
    try {
      await investApi(`/admin/additional-domains/${id}`, { method: "PUT", body: { hostname } });
      load();
      await refreshPortalConfig();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this additional domain? Share links will revert to invest subdomain.")) return;
    try {
      await investApi(`/admin/additional-domains/${id}`, { method: "DELETE" });
      setMsg("Domain removed.");
      load();
      await refreshPortalConfig();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h3 className="font-bold text-navy dark:text-white">Additional Invest Domains</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a custom domain (e.g. <span className="font-mono">akshayainvest.com</span>) that serves the invest portal.
          Referral and social shares use the <strong>enabled share domain</strong> when configured; otherwise{" "}
          <span className="font-mono">invest.akshayaexim.com</span> is used.
        </p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Payments always process on main domain only ({paymentOriginPublic() || "akshayaexim.com"}) — never on subdomains or additional domains.
        </p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <form onSubmit={add} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
        <Field label="Domain name">
          <input className="input font-mono" placeholder="akshayainvest.com" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} required />
        </Field>
        <Field label="Note (optional)">
          <input className="input" placeholder="Marketing alias" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <button type="submit" className="btn-gold text-sm" disabled={saving}>{saving ? "Adding…" : "+ Add domain"}</button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading domains…</p>
      ) : domains.length === 0 ? (
        <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">No additional domains yet. Shares use invest subdomain until you add one.</p>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <div key={d.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{d.hostname}</span>
                    {d.enabled ? <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">ON</span> : <span className="rounded bg-slate-500/15 px-2 py-0.5 text-xs text-muted-foreground">OFF</span>}
                    {d.useForSharing && d.enabled && <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-700">Share links</span>}
                  </div>
                  {d.note && <p className="mt-1 text-xs text-muted-foreground">{d.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-outline text-xs" onClick={() => toggle(d.id, !d.enabled)}>{d.enabled ? "Turn off" : "Turn on"}</button>
                  {d.enabled && !d.useForSharing && (
                    <button type="button" className="btn-outline text-xs" onClick={() => setShare(d.id)}>Use for shares</button>
                  )}
                  <button type="button" className="text-xs text-red-500" onClick={() => remove(d.id)}>Delete</button>
                </div>
              </div>
              <div className="mt-3">
                <Field label="Edit hostname">
                  <input className="input font-mono text-sm" defaultValue={d.hostname} onBlur={(e) => { if (e.target.value !== d.hostname) updateHost(d.id, e.target.value); }} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">DNS / VPS setup</p>
        <ol className="mt-1 list-inside list-decimal space-y-1">
          <li>Add an A record for your domain → VPS IP (same server as invest subdomain).</li>
          <li>Copy <span className="font-mono">deploy/nginx/additional-domain.conf.example</span> and set your domain + SSL cert.</li>
          <li>Reload nginx. The domain serves the invest portal; payments stay on akshayaexim.com / .in.</li>
        </ol>
      </div>
    </div>
  );
}
