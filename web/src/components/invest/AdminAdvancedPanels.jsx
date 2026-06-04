import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert, Field, PasswordInput } from "../ui.jsx";
import { FinancialReportsPanel } from "./FinancialReportsPanel.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";

export function TreasuryPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => investApi("/admin/treasury").then(setData).catch(() => {});
  useEffect(() => { load(); }, []);
  const reconcile = async () => {
    const r = await investApi("/admin/treasury/reconcile", { method: "POST" });
    setMsg(t("financial.reconcileSaved").replace("{amount}", inr(r.driftAmount)));
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {[["overview", t("financial.tabOverview")], ["reports", t("financial.tabReports")]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === id ? "bg-primary/15 text-accent-tone" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "reports" ? (
        <FinancialReportsPanel />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{t("financial.loadingTreasury")}</p>
      ) : (
        <>
          {msg && <Alert type="success">{msg}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["totalLiabilities", data.totalLiabilities],
              ["available", data.totalAvailable],
              ["invested", data.totalInvested],
              ["earnings", data.totalEarnings],
              ["pendingDeposits", data.pendingDeposits],
              ["pendingWithdrawals", data.pendingWithdrawals],
              ["ledgerDrift", data.driftAmount],
            ].map(([key, v]) => (
              <div key={key} className="card p-4"><div className="text-xs text-muted-foreground">{t(`financial.${key}`)}</div><div className="text-xl font-bold">{inr(v || 0)}</div></div>
            ))}
          </div>
          <button type="button" className="btn-gold" onClick={reconcile}>{t("financial.reconcile")}</button>
        </>
      )}
    </div>
  );
}

export function CohortAnalyticsPanel() {
  const [data, setData] = useState(null);
  useEffect(() => { investApi("/admin/analytics/cohorts?months=12").then(setData).catch(() => {}); }, []);
  if (!data) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card p-4"><div className="text-xs text-muted-foreground">Signups</div><div className="text-2xl font-bold">{data.summary.signups}</div></div>
        <div className="card p-4"><div className="text-xs text-muted-foreground">KYC approved</div><div className="text-2xl font-bold">{data.summary.kycApproved}</div></div>
        <div className="card p-4"><div className="text-xs text-muted-foreground">First deposit</div><div className="text-2xl font-bold">{data.summary.firstDeposit}</div></div>
        <div className="card p-4"><div className="text-xs text-muted-foreground">Deposit volume</div><div className="text-2xl font-bold">{inr(data.summary.depositTotal)}</div></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="p-3">Month</th><th className="p-3">Signups</th><th className="p-3">KYC</th><th className="p-3">Deposits</th><th className="p-3">Conv %</th></tr></thead>
          <tbody>
            {data.cohorts.map((c) => (
              <tr key={c.month} className="border-t"><td className="p-3">{c.month}</td><td className="p-3">{c.signups}</td><td className="p-3">{c.kycApproved}</td><td className="p-3">{c.firstDeposit}</td><td className="p-3">{c.depositRate}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { default as RbacPanel } from "./RbacPermissionsPanel.jsx";

export function SupportMailPanel() {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState({});
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsErr, setSettingsErr] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(true);

  const load = () => {
    setLoading(true);
    setErr("");
    return investApi("/admin/support-mail")
      .then((d) => setMessages(d.messages || []))
      .catch((e) => {
        setErr(e.message || "Could not load mail desk");
        setMessages([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    investApi("/admin/settings").then((d) => setSettings(d.settings || {})).catch(() => {});
  }, []);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const r = await investApi("/admin/support-mail/sync", { method: "POST" });
      if (r.error) setSyncMsg(`Sync failed: ${r.error}`);
      else if (r.skipped) setSyncMsg("IMAP sync is disabled. Enable it in settings below.");
      else setSyncMsg(`Synced ${r.synced || 0} new message(s).`);
      load();
    } catch (e) {
      setSyncMsg(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSettingsErr("");
    setSettingsMsg("");
    try {
      await investApi("/admin/settings", { method: "PUT", body: settings });
      setSettingsMsg("Mail desk settings saved.");
    } catch (e2) {
      setSettingsErr(e2.message);
    }
  };

  const setSetting = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const send = async (id) => {
    if (!reply.trim()) return;
    await investApi(`/admin/support-mail/${id}/reply`, { method: "POST", body: { body: reply } });
    setReply("");
    load();
  };

  const imapConfigured = settings.support_mail_enabled === "true" && settings.support_imap_host && settings.support_imap_user;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-foreground">Mail Desk</h3>
          <p className="text-sm text-muted-foreground">Sync support@ inbox via IMAP and reply from the admin portal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline text-sm" onClick={() => setSettingsOpen((v) => !v)}>
            {settingsOpen ? "Hide settings" : "IMAP settings"}
          </button>
          <button type="button" className="btn-primary text-sm" disabled={syncing} onClick={sync}>
            {syncing ? "Syncing…" : "Sync IMAP inbox"}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <form onSubmit={saveSettings} className="card space-y-3 p-5">
          <h4 className="font-semibold">IMAP configuration</h4>
          <p className="text-xs text-muted-foreground">Configure the support mailbox. Password is stored securely; leave blank to keep the current password.</p>
          <Field label="Enable IMAP sync">
            <select className="input" value={settings.support_mail_enabled || "false"} onChange={(e) => setSetting("support_mail_enabled", e.target.value)}>
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="IMAP host"><input className="input" value={settings.support_imap_host || ""} onChange={(e) => setSetting("support_imap_host", e.target.value)} placeholder="imap.example.com" /></Field>
            <Field label="IMAP user"><input className="input" value={settings.support_imap_user || ""} onChange={(e) => setSetting("support_imap_user", e.target.value)} placeholder="support@akshayaexim.com" /></Field>
          </div>
          <Field label="IMAP password"><PasswordInput value={settings.support_imap_pass || ""} onChange={(e) => setSetting("support_imap_pass", e.target.value)} placeholder="Leave blank to keep" /></Field>
          <Field label="Support email (outbound)"><input className="input" type="email" value={settings.support_email || ""} onChange={(e) => setSetting("support_email", e.target.value)} placeholder="support@akshayaexim.com" /></Field>
          {settingsMsg && <Alert type="success">{settingsMsg}</Alert>}
          {settingsErr && <Alert type="error">{settingsErr}</Alert>}
          <button type="submit" className="btn-gold w-full sm:w-auto">Save mail desk settings</button>
        </form>
      )}

      {!imapConfigured && (
        <Alert type="info">IMAP is not fully configured. Enable sync and enter host, user, and password above, then click Sync.</Alert>
      )}

      {syncMsg && <Alert type={syncMsg.includes("failed") || syncMsg.includes("disabled") ? "error" : "success"}>{syncMsg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}
      {loading && <p className="text-sm text-muted-foreground">Loading messages…</p>}

      {!loading && !err && messages.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold text-foreground">No synced messages</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure IMAP above and click Sync IMAP inbox to pull emails from your support mailbox.
          </p>
        </div>
      )}

      {messages.map((m) => (
        <div key={m.id} className="card p-4">
          <button type="button" className="w-full text-left" onClick={() => setActive(active === m.id ? null : m.id)}>
            <b>{m.subject}</b>
            <div className="text-xs text-muted-foreground">{m.fromEmail} · {dateStr(m.receivedAt, true)}</div>
            {m.status && <span className="text-[10px] uppercase text-muted-foreground">{m.status}</span>}
          </button>
          {active === m.id && (
            <div className="mt-3 border-t pt-3">
              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              <textarea className="input mt-3 w-full" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" />
              <button type="button" className="btn-gold mt-2 text-sm" onClick={() => send(m.id)}>Send reply</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
