import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert, Field } from "../ui.jsx";
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

export function RbacPanel() {
  const [matrix, setMatrix] = useState(null);
  const load = () => investApi("/admin/rbac").then(setMatrix).catch(() => {});
  useEffect(() => { load(); }, []);
  const toggle = async (role, permission, granted) => {
    await investApi("/admin/rbac", { method: "PUT", body: { role, permission, granted: !granted } });
    load();
  };
  if (!matrix) return <p className="text-sm text-muted-foreground">Loading permissions…</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase"><th className="p-3">Permission</th><th className="p-3">Admin</th><th className="p-3">Super Admin</th></tr></thead>
        <tbody>
          {matrix.permissions.map((p) => (
            <tr key={p.key} className="border-t">
              <td className="p-3">{p.label}</td>
              {["ADMIN", "SUPERADMIN"].map((role) => {
                const g = matrix.view[p.key]?.roles[role];
                return (
                  <td key={role} className="p-3">
                    {role === "SUPERADMIN" ? "✓ All" : (
                      <button type="button" className={`text-xs font-semibold ${g ? "text-emerald-600" : "text-muted-foreground"}`} onClick={() => toggle(role, p.key, g)}>
                        {g ? "Granted" : "Denied"}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SupportMailPanel() {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [active, setActive] = useState(null);
  const load = () => investApi("/admin/support-mail").then((d) => setMessages(d.messages || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const sync = async () => { await investApi("/admin/support-mail/sync", { method: "POST" }); load(); };
  const send = async (id) => {
    await investApi(`/admin/support-mail/${id}/reply`, { method: "POST", body: { body: reply } });
    setReply("");
    load();
  };
  return (
    <div className="space-y-4">
      <button type="button" className="btn-outline text-sm" onClick={sync}>Sync IMAP inbox</button>
      {messages.map((m) => (
        <div key={m.id} className="card p-4">
          <button type="button" className="w-full text-left" onClick={() => setActive(active === m.id ? null : m.id)}>
            <b>{m.subject}</b><div className="text-xs text-muted-foreground">{m.fromEmail} · {dateStr(m.receivedAt, true)}</div>
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
