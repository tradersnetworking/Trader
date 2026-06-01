import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Alert, Badge, Field } from "../ui.jsx";

const FREQUENCIES = [
  { id: "MANUAL", label: "Manual — admin pays from this tab" },
  { id: "ON_INVEST", label: "On investment — pay when referred user invests" },
  { id: "WEEKLY", label: "Weekly batch — auto-pay pending above minimum" },
  { id: "MONTHLY", label: "Monthly batch — auto-pay pending above minimum" },
];

export function ReferralAdminPanel() {
  const [subTab, setSubTab] = useState("payouts");
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [levels, setLevels] = useState([2, 1, 0.5, 0, 0]);
  const [frequency, setFrequency] = useState("MANUAL");
  const [minPayout, setMinPayout] = useState(100);
  const [autoPayout, setAutoPayout] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingAll, setPayingAll] = useState(false);

  const loadPayouts = () => {
    investApi("/admin/referral-earnings").then((d) => setItems(d.earnings || [])).catch(() => {});
    investApi("/admin/referral-analytics").then(setAnalytics).catch(() => {});
  };

  const loadSettings = () => {
    investApi("/admin/referral-settings")
      .then((s) => {
        setSettings(s);
        setLevels((s.levelCommissions || []).map((l) => l.pct));
        setFrequency(s.payoutFrequency || "MANUAL");
        setMinPayout(s.minPayout ?? 100);
        setAutoPayout(!!s.autoPayout);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPayouts();
    loadSettings();
  }, []);

  const saveSettings = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const body = {
        levelCommissions: levels.map((pct, i) => ({ level: i + 1, pct: Number(pct) || 0 })),
        payoutFrequency: frequency,
        minPayout: Number(minPayout) || 0,
        autoPayout,
      };
      const s = await investApi("/admin/referral-settings", { method: "PUT", body });
      setSettings(s);
      setMsg("Referral commission settings saved.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const payAll = async () => {
    if (!window.confirm("Pay all pending referral earnings above the minimum threshold?")) return;
    setPayingAll(true);
    try {
      const r = await investApi("/admin/referral-earnings/pay-all", { method: "POST" });
      setMsg(`Paid ${r.paid} earning(s). ${r.skipped} below minimum or already paid.`);
      loadPayouts();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setPayingAll(false);
    }
  };

  const pendingCount = items.filter((e) => e.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {[
          { id: "payouts", label: "Payouts" },
          { id: "settings", label: "Commission & frequency" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === t.id ? "bg-primary/15 text-accent-tone" : "text-muted-foreground hover:bg-muted/50"}`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      {subTab === "settings" && (
        <form onSubmit={saveSettings} className="card max-w-2xl space-y-4 p-5">
          <div>
            <h3 className="font-bold">Commission levels</h3>
            <p className="text-sm text-muted-foreground">
              Set percentage earned on each upline level when a referred investor subscribes to a plan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {levels.map((pct, i) => (
              <Field key={i} label={`Level ${i + 1} commission (%)`}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={pct}
                  onChange={(e) => {
                    const next = [...levels];
                    next[i] = e.target.value;
                    setLevels(next);
                  }}
                />
              </Field>
            ))}
          </div>

          <Field label="Payout frequency">
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Minimum payout amount (₹)">
              <input
                className="input"
                type="number"
                min={0}
                value={minPayout}
                onChange={(e) => setMinPayout(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={autoPayout} onChange={(e) => setAutoPayout(e.target.checked)} />
              Enable automatic payout for selected frequency
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Manual: use the Payouts tab. On investment: credits wallet when auto-payout is on and amount ≥ minimum.
            Weekly/Monthly: background job pays pending earnings above minimum.
          </p>

          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? "Saving…" : "Save referral settings"}
          </button>
        </form>
      )}

      {subTab === "payouts" && (
        <>
          {analytics && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card p-4 text-center"><div className="text-xl font-bold">{analytics.clicks}</div><div className="text-xs text-muted-foreground">Link / QR clicks</div></div>
              <div className="card p-4 text-center"><div className="text-xl font-bold">{analytics.registrations}</div><div className="text-xs text-muted-foreground">Registrations</div></div>
              <div className="card p-4 text-center"><div className="text-xl font-bold">{analytics.conversionRate}%</div><div className="text-xs text-muted-foreground">Conversion rate</div></div>
            </div>
          )}

          {settings && (
            <div className="card p-4 text-sm text-muted-foreground">
              Active: {FREQUENCIES.find((f) => f.id === settings.payoutFrequency)?.label || settings.payoutFrequency}
              {" · "}Min payout: {inr(settings.minPayout)}
              {" · "}Levels: {(settings.levelCommissions || []).filter((l) => l.pct > 0).map((l) => `L${l.level} ${l.pct}%`).join(", ") || "none set"}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold text-sm" disabled={payingAll || pendingCount === 0} onClick={payAll}>
              {payingAll ? "Processing…" : `Pay all pending (${pendingCount})`}
            </button>
            <button type="button" className="btn-outline text-sm" onClick={() => { loadPayouts(); loadSettings(); }}>
              Refresh
            </button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Referrer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Note</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No referral earnings yet.</td></tr>
                ) : items.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3">
                      <div>{e.referrer?.name}</div>
                      <div className="text-xs text-muted-foreground">{e.referrer?.email}</div>
                    </td>
                    <td className="p-3 font-bold">{inr(e.amount)}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[12rem] truncate">{e.note}</td>
                    <td className="p-3"><Badge status={e.status} /></td>
                    <td className="p-3">
                      {e.status === "PENDING" && (
                        <button
                          type="button"
                          className="text-xs text-emerald-600"
                          onClick={() => investApi(`/admin/referral-earnings/${e.id}/pay`, { method: "POST" }).then(loadPayouts)}
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** @deprecated use ReferralAdminPanel */
export function ReferralEarningsAdmin() {
  return <ReferralAdminPanel />;
}
