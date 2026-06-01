import { useCallback, useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";
import KpiStatCard from "./InvestDashboardWidgets.jsx";
import {
  DEFAULT_EMAIL_COMM_CONFIG,
  DEFAULT_EMAIL_PURPOSE_META,
  DEFAULT_EMAIL_PURPOSES,
  GROUP_ORDER,
} from "../../lib/email-communication-defaults.js";

export default function CommunicationSettingsPanel() {
  const [config, setConfig] = useState(null);
  const [commEmail, setCommEmail] = useState("");
  const [commSaving, setCommSaving] = useState(false);
  const [commMsg, setCommMsg] = useState("");
  const [purposeMeta, setPurposeMeta] = useState(DEFAULT_EMAIL_PURPOSE_META);
  const [purposes, setPurposes] = useState(DEFAULT_EMAIL_PURPOSES);
  const [summary, setSummary] = useState(null);
  const [resolvedFrom, setResolvedFrom] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("identities");
  const [testPurpose, setTestPurpose] = useState("registration");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await investApi("/admin/settings/email-communication");
      setConfig(data.config);
      setPurposeMeta(data.purposeMeta || DEFAULT_EMAIL_PURPOSE_META);
      setPurposes(data.purposes || DEFAULT_EMAIL_PURPOSES);
      setSummary(data.summary);
      setResolvedFrom(data.resolvedFrom || {});
      const settings = await investApi("/admin/settings");
      setCommEmail(settings.settings?.default_communication_email || "");
    } catch (e) {
      setConfig(JSON.parse(JSON.stringify(DEFAULT_EMAIL_COMM_CONFIG)));
      setPurposeMeta(DEFAULT_EMAIL_PURPOSE_META);
      setPurposes(DEFAULT_EMAIL_PURPOSES);
      setLoadError(e.message || "Could not load saved settings — showing defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveCommEmail = async () => {
    setCommSaving(true);
    setCommMsg("");
    try {
      await investApi("/admin/settings", { method: "PUT", body: { default_communication_email: commEmail } });
      setCommMsg("Default communication email saved.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setCommSaving(false);
    }
  };

  const saveRouting = async () => {
    if (!config) return;
    setSaving(true);
    setMsg("");
    try {
      await investApi("/admin/settings/email-communication", { method: "POST", body: { config } });
      setMsg("Mail routing & automation saved.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return setLoadError("Enter a recipient email for the test.");
    setTesting(true);
    setLoadError("");
    try {
      const r = await investApi("/admin/settings/email-communication/test", {
        method: "POST",
        body: { purpose: testPurpose, testTo: testTo.trim() },
      });
      setMsg(r.message || "Test sent.");
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setTesting(false);
    }
  };

  const addIdentity = () => {
    if (!config) return;
    const id = `custom_${Date.now()}`;
    setConfig({
      ...config,
      identities: [...config.identities, { id, label: "Custom Mail", name: "Akshaya Exim Invest", address: "" }],
    });
  };

  const removeIdentity = (id) => {
    if (!config || id === "default") return;
    setConfig({
      ...config,
      identities: config.identities.filter((i) => i.id !== id),
      assignments: Object.fromEntries(purposes.map((p) => [p, config.assignments[p] === id ? "noreply" : config.assignments[p]])),
    });
  };

  const updateIdentity = (id, patch) => {
    if (!config) return;
    setConfig({
      ...config,
      identities: config.identities.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  };

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: purposes.filter((p) => purposeMeta[p]?.group === group),
  })).filter((g) => g.items.length);

  const enabledCount = config ? purposes.filter((p) => config.autoEmails[p]?.enabled !== false).length : 0;

  const tabs = [
    { id: "identities", label: "Mail Addresses" },
    { id: "routing", label: "Purpose Routing" },
    { id: "automation", label: `Auto Emails (${enabledCount}/${purposes.length})` },
    { id: "test", label: "Send Test" },
  ];

  return (
    <div className="page-stack min-w-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white">Email & Communication</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure sender mail IDs, route automated emails by purpose, and control notification subjects. SMTP server settings remain under Site & API Settings.
          </p>
        </div>
        <button type="button" className="btn-outline shrink-0 text-sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {loadError && <Alert type="error">{loadError}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}
      {commMsg && <Alert type="success">{commMsg}</Alert>}

      <div className="card space-y-3 p-4 sm:p-5">
        <h3 className="font-bold">Default communication email</h3>
        <p className="text-sm text-muted-foreground">Primary From address for nurture emails, mail desk, and support replies on invest portal (shared with main domain).</p>
        <Field label="Email address">
          <input className="input max-w-md" type="email" value={commEmail} onChange={(e) => setCommEmail(e.target.value)} placeholder="support@akshayaexim.com" />
        </Field>
        <button type="button" className="btn-gold text-sm" disabled={commSaving} onClick={saveCommEmail}>{commSaving ? "Saving…" : "Save default email"}</button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiStatCard tone="blue" label="SMTP From" value={summary.smtp.from || "—"} subValue={summary.smtp.configured ? "Configured" : "Not configured"} icon="📧" loading={loading} />
          <KpiStatCard tone="violet" label="Support Inbox" value={summary.inbox.address || "—"} subValue={summary.inbox.configured ? "Configured" : "Default"} icon="📥" loading={loading} />
          <KpiStatCard tone="amber" label="Sender IDs" value={String(summary.identities)} subValue="Custom + default" icon="✉️" loading={loading} />
          <KpiStatCard tone="emerald" label="Auto Emails" value={`${summary.autoEmailsEnabled}/${summary.autoEmailsTotal}`} subValue="Enabled events" icon="⚡" loading={loading} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${tab === t.id ? "border-gold bg-gold/10 text-gold-700" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !config ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <>
          {tab === "identities" && (
            <div className="card space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Sender Mail IDs</h3>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline text-sm" onClick={addIdentity}>+ Add</button>
                  <button type="button" className="btn-gold text-sm" onClick={saveRouting} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                </div>
              </div>
              {config.identities.map((identity) => (
                <div key={identity.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-2"><Field label="ID"><input className="input font-mono text-xs" value={identity.id} disabled /></Field></div>
                  <div className="md:col-span-2"><Field label="Label"><input className="input" value={identity.label} onChange={(e) => updateIdentity(identity.id, { label: e.target.value })} /></Field></div>
                  <div className="md:col-span-3"><Field label="Display Name"><input className="input" value={identity.name} onChange={(e) => updateIdentity(identity.id, { name: e.target.value })} /></Field></div>
                  <div className="md:col-span-4">
                    <Field label="Email">
                      <input className="input" value={identity.address} disabled={identity.id === "default"} onChange={(e) => updateIdentity(identity.id, { address: e.target.value })} placeholder={identity.id === "default" ? "Uses SMTP From" : "mail@domain.com"} />
                    </Field>
                  </div>
                  {identity.id !== "default" && (
                    <button type="button" className="text-sm text-red-500 md:col-span-1" onClick={() => removeIdentity(identity.id)}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "routing" && (
            <div className="card space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Purpose → Sender Routing</h3>
                <button type="button" className="btn-gold text-sm" onClick={saveRouting} disabled={saving}>{saving ? "Saving…" : "Save routing"}</button>
              </div>
              {grouped.map(({ group, items }) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group}</p>
                  <div className="space-y-2">
                    {items.map((purpose) => (
                      <div key={purpose} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-center">
                        <div className="sm:col-span-5">
                          <p className="text-sm font-semibold">{purposeMeta[purpose]?.label || purpose}</p>
                          <p className="text-xs text-muted-foreground">{purposeMeta[purpose]?.description}</p>
                        </div>
                        <div className="sm:col-span-3">
                          <select className="input text-sm" value={config.assignments[purpose] || "noreply"} onChange={(e) => setConfig({ ...config, assignments: { ...config.assignments, [purpose]: e.target.value } })}>
                            {config.identities.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                          </select>
                        </div>
                        <div className="text-xs text-muted-foreground sm:col-span-4">From: {resolvedFrom[purpose] || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "automation" && (
            <div className="card space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Automated Email Templates</h3>
                <button type="button" className="btn-gold text-sm" onClick={saveRouting} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
              {purposes.map((purpose) => {
                const auto = config.autoEmails[purpose] || { enabled: true, subject: "" };
                return (
                  <div key={purpose} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-center">
                    <label className="flex items-center gap-2 sm:col-span-4">
                      <input type="checkbox" checked={auto.enabled !== false} onChange={(e) => setConfig({ ...config, autoEmails: { ...config.autoEmails, [purpose]: { ...auto, enabled: e.target.checked } } })} />
                      <span className="text-sm font-semibold">{purposeMeta[purpose]?.label || purpose}</span>
                    </label>
                    <div className="sm:col-span-8">
                      <input className="input text-sm" value={auto.subject || ""} onChange={(e) => setConfig({ ...config, autoEmails: { ...config.autoEmails, [purpose]: { ...auto, subject: e.target.value } } })} placeholder="Email subject line" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "test" && (
            <div className="card max-w-lg space-y-4 p-4 sm:p-5">
              <h3 className="font-bold">Send Test Email</h3>
              <Field label="Purpose">
                <select className="input" value={testPurpose} onChange={(e) => setTestPurpose(e.target.value)}>
                  {purposes.map((p) => <option key={p} value={p}>{purposeMeta[p]?.label || p}</option>)}
                </select>
              </Field>
              <Field label="Recipient">
                <input className="input" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
              </Field>
              <button type="button" className="btn-gold" disabled={testing} onClick={sendTest}>{testing ? "Sending…" : "Send test"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
