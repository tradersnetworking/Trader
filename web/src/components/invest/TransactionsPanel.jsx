import { useEffect, useState, useCallback } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge } from "../ui.jsx";
import CalendarPeriodFilter from "./CalendarPeriodFilter.jsx";
import { buildStatsQuery, periodMetricLabel } from "../../lib/finance-period.js";
import KpiStatCard from "./InvestDashboardWidgets.jsx";
import { INVEST_STAT_GRID } from "../../lib/invest-dashboard-ui.js";
import { useInvestRefresh } from "../../lib/investRefresh.js";

export default function TransactionsPanel() {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState("requests");
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  const load = useCallback(() => {
    setLoadErr("");
    const qs = buildStatsQuery(period, customFrom, customTo);
    const typeQ = typeFilter !== "all" ? `&type=${typeFilter}` : "";
    investApi(`/wallet/history?${qs}${typeQ}`)
      .then(setData)
      .catch((e) => setLoadErr(e.message || "Could not load transactions"));
  }, [period, customFrom, customTo, typeFilter]);

  useEffect(() => { load(); }, [load]);
  useInvestRefresh(load);

  const applyCustom = () => load();
  const label = data?.periodLabel || "All time";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Deposits, withdrawals, and ROI payouts with payment reference, mode, and where funds were credited.
      </p>

      <CalendarPeriodFilter
        variant="investor"
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onPeriodChange={setPeriod}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onApplyCustom={applyCustom}
        periodLabel={label}
      />

      {loadErr && <p className="text-sm text-rose-600">{loadErr}</p>}

      <div className={`${INVEST_STAT_GRID} mb-2`}>
        <KpiStatCard tone="emerald" icon="↓" label={periodMetricLabel(label, "Deposited")} value={inr(data?.kpis?.deposited || 0)} />
        <KpiStatCard tone="rose" icon="↑" label={periodMetricLabel(label, "Withdrawn")} value={inr(data?.kpis?.withdrawn || 0)} />
        <KpiStatCard tone="amber" icon="⏳" label="Pending requests" value={(data?.kpis?.pendingDeposits || 0) + (data?.kpis?.pendingPayouts || 0)} />
        <KpiStatCard tone="indigo" icon="📒" label="Ledger entries" value={data?.kpis?.ledgerCount ?? "—"} />
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "deposit", "withdrawal"].map((t) => (
          <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${typeFilter === t ? "bg-amber-500 text-black" : "bg-slate-100 dark:bg-white/5"}`}>{t === "all" ? "All" : t + "s"}</button>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10">
        {["requests", "ledger"].map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`px-4 py-2 text-sm font-semibold capitalize ${view === v ? "border-b-2 border-amber-500 text-amber-600" : "text-slate-500"}`}>{v}</button>
        ))}
        <button type="button" onClick={load} className="ml-auto text-xs font-semibold text-amber-600">Refresh</button>
      </div>

      {view === "requests" ? (
        <div className="overflow-x-auto card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-white/5">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment mode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment ref</th>
                <th className="p-3">Credited / paid to</th>
              </tr>
            </thead>
            <tbody>
              {(data?.requests || []).map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-t dark:border-white/5">
                  <td className="p-3 whitespace-nowrap">{dateStr(r.createdAt, true)}</td>
                  <td className="p-3">{r.type}</td>
                  <td className="p-3 font-bold">{inr(r.amount)}</td>
                  <td className="p-3">{r.method || "—"}</td>
                  <td className="p-3"><Badge status={r.status} /></td>
                  <td className="p-3 font-mono text-xs">{r.paymentRef || r.reference || r.gatewayRef || "—"}</td>
                  <td className="p-3 text-xs">{r.accountDetails || r.destination || "—"}</td>
                </tr>
              ))}
              {(data?.requests || []).length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No transactions in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-white/5">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Dir</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Balance</th>
                <th className="p-3">Ref</th>
                <th className="p-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {(data?.ledger || []).map((e) => (
                <tr key={e.id} className="border-t dark:border-white/5">
                  <td className="p-3">{dateStr(e.createdAt, true)}</td>
                  <td className="p-3">{e.type}</td>
                  <td className="p-3">{e.direction}</td>
                  <td className="p-3 font-bold">{inr(e.amount)}</td>
                  <td className="p-3">{inr(e.balanceAfter)}</td>
                  <td className="p-3 font-mono text-xs">{e.reference || "—"}</td>
                  <td className="p-3 text-xs text-slate-400">{e.note || "—"}</td>
                </tr>
              ))}
              {(data?.ledger || []).length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No ledger entries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
