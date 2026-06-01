import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Alert } from "../ui.jsx";
import KpiStatCard from "./InvestDashboardWidgets.jsx";

export function TodayPendingPayments({ onUpdated }) {
  const [data, setData] = useState({ payouts: [], totalDue: 0, count: 0 });
  const [msg, setMsg] = useState("");
  const load = () => investApi("/admin/maturity-payments/today").then((d) => { setData(d); onUpdated?.(); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const decide = async (id, action) => {
    setMsg("");
    try {
      await investApi(`/admin/maturity-payments/${id}/${action}`, { method: "POST", body: {} });
      setMsg(action === "approve" ? "Marked completed — investor notified by email." : "Rejected — investor notified.");
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiStatCard tone="amber" icon="💰" label="Due Today" value={inr(data.totalDue || 0)} subValue={`${data.count || 0} payments`} />
      </div>
      {msg && <Alert type="success">{msg}</Alert>}
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 text-left text-xs uppercase text-slate-400">
            <tr><th className="p-3">Investor</th><th className="p-3">Plan</th><th className="p-3">Profit</th><th className="p-3">Choice</th><th className="p-3">Due</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {(data.payouts || []).map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3">{p.investor?.name}<div className="text-xs text-slate-400">{p.investor?.email}</div></td>
                <td className="p-3">{p.subscription?.plan?.name || "—"}</td>
                <td className="p-3 font-bold text-amber-600">{inr(p.profitAmount)}</td>
                <td className="p-3"><Badge status={p.investorChoice || "WALLET"} /></td>
                <td className="p-3">{dateStr(p.dueDate)}</td>
                <td className="p-3"><Badge status={p.status} /></td>
                <td className="p-3 text-right whitespace-nowrap">
                  {p.status === "PENDING" && (
                    <>
                      <button onClick={() => decide(p.id, "approve")} className="mr-2 text-xs font-bold text-emerald-600">Approve</button>
                      <button onClick={() => decide(p.id, "reject")} className="text-xs text-rose-500">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {(data.payouts || []).length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400">No maturity profit payments due today.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UpcomingPayments() {
  const [payouts, setPayouts] = useState([]);
  useEffect(() => { investApi("/admin/maturity-payments/upcoming").then((d) => setPayouts(d.payouts)).catch(() => {}); }, []);

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">Investment profits maturing from tomorrow through the next 6 months.</p>
      <div className="max-h-[70vh] overflow-y-auto card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-violet-500/10 text-left text-xs uppercase text-slate-400">
            <tr><th className="p-3">Date</th><th className="p-3">Investor</th><th className="p-3">Plan</th><th className="p-3">Principal</th><th className="p-3">Est. Profit</th><th className="p-3">Choice</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-medium">{dateStr(p.dueDate)}</td>
                <td className="p-3">{p.investor?.name}</td>
                <td className="p-3">{p.subscription?.plan?.name || "—"}</td>
                <td className="p-3">{inr(p.principal || p.subscription?.amount)}</td>
                <td className="p-3 font-bold text-violet-600">{inr(p.profitAmount)}</td>
                <td className="p-3">{p.investorChoice || "—"}</td>
                <td className="p-3"><Badge status={p.status} /></td>
              </tr>
            ))}
            {payouts.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400">No upcoming maturities in the next 6 months.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
