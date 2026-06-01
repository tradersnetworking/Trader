import { useEffect, useMemo, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr, daysLeft } from "../../lib/format.js";
import { Badge } from "../ui.jsx";
import { INVEST_STAT_GRID } from "../../lib/invest-dashboard-ui.js";
import KpiStatCard from "./InvestDashboardWidgets.jsx";

export default function PlatformInvestmentsPanel() {
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    const qs = status ? `?status=${status}` : "";
    investApi(`/admin/subscriptions${qs}`).then((d) => {
      setSubs(d.subscriptions || []);
      setStats(d.stats || null);
    }).catch(() => {});
  };
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) =>
      s.investor?.name?.toLowerCase().includes(q) ||
      s.investor?.email?.toLowerCase().includes(q) ||
      s.plan?.name?.toLowerCase().includes(q)
    );
  }, [subs, search]);

  return (
    <div className="page-stack">
      <div>
        <h2 className="text-lg font-bold text-foreground">Platform Investments</h2>
        <p className="text-sm text-muted-foreground">All investor subscriptions across the 42-plan catalog.</p>
      </div>

      <div className={INVEST_STAT_GRID}>
        <KpiStatCard tone="blue" icon="📊" label="Showing" value={filtered.length} />
        <KpiStatCard tone="emerald" icon="✅" label="Active" value={stats?.active ?? "—"} />
        <KpiStatCard tone="amber" icon="💰" label="Total Invested" value={inr(stats?.totalAmount || 0)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search investor or plan…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="MATURED">Matured</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button type="button" className="btn-outline text-xs" onClick={load}>Refresh</button>
      </div>

      <div className="app-table-wrap card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Investor</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Amount</th>
              <th className="p-3">ROI/mo</th>
              <th className="p-3">Started</th>
              <th className="p-3">Maturity</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium">{s.investor?.name}</div>
                  <div className="text-xs text-muted-foreground">{s.investor?.email}</div>
                </td>
                <td className="p-3">{s.plan?.name}</td>
                <td className="p-3 font-semibold">{inr(s.amount)}</td>
                <td className="p-3">{s.monthlyRoiPct}%</td>
                <td className="p-3">{dateStr(s.startDate)}</td>
                <td className="p-3">{dateStr(s.maturityDate)} ({daysLeft(s.maturityDate)}d)</td>
                <td className="p-3"><Badge status={s.status} /></td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">No investments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
