import { useEffect, useState } from "react";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Alert } from "../ui.jsx";
import { LEDGER_TYPE_COLORS } from "../../lib/invest-dashboard-ui.js";

export default function LedgerTable({ fetchLedger, showInvestor = false, title = "Ledger" }) {
  const [type, setType] = useState("");
  const [data, setData] = useState({ ledger: [], total: 0, summary: [] });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchLedger(type ? { type } : {})
      .then(setData)
      .catch(() => setData({ ledger: [], total: 0, summary: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [type]);

  const types = ["", "DEPOSIT", "INVESTMENT", "RETURN", "PAYOUT", "REFUND", "ADJUSTMENT"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-navy dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500">{data.total} entries • complete wallet audit trail</p>
        </div>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t || "All types"}</option>)}
        </select>
      </div>

      {data.summary?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.summary.map((s) => (
            <span key={`${s.type}-${s.direction}`} className="badge bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {s.type} {s.direction}: {inr(s.volume)} ({s.count})
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Date</th>
              {showInvestor && <th className="p-3">Investor</th>}
              <th className="p-3">Type</th>
              <th className="p-3">Direction</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Balance After</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={showInvestor ? 8 : 7} className="p-8 text-center text-slate-400">Loading ledger…</td></tr>
            ) : data.ledger.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 whitespace-nowrap text-slate-400">{dateStr(e.createdAt, true)}</td>
                {showInvestor && (
                  <td className="p-3">
                    <div className="font-medium text-navy dark:text-white">{e.investor?.name}</div>
                    <div className="text-xs text-slate-400">{e.investor?.email}</div>
                  </td>
                )}
                <td className="p-3"><span className={`font-semibold ${LEDGER_TYPE_COLORS[e.type] || ""}`}>{e.type}</span></td>
                <td className="p-3">
                  <Badge status={e.direction === "CREDIT" ? "APPROVED" : "REJECTED"} />
                </td>
                <td className={`p-3 font-bold ${e.direction === "CREDIT" ? "text-emerald-600" : "text-rose-500"}`}>
                  {e.direction === "CREDIT" ? "+" : "−"}{inr(e.amount)}
                </td>
                <td className="p-3 font-medium">{inr(e.balanceAfter)}</td>
                <td className="p-3 font-mono text-xs text-slate-400">{e.reference ? e.reference.slice(-8) : "—"}</td>
                <td className="p-3 max-w-[200px] truncate text-slate-400" title={e.note}>{e.note || "—"}</td>
              </tr>
            ))}
            {!loading && data.ledger.length === 0 && (
              <tr><td colSpan={showInvestor ? 8 : 7} className="p-8 text-center text-slate-400">No ledger entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
