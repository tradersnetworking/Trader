import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { catchAdminApi } from "../../lib/adminApi.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Alert } from "../ui.jsx";
import KpiStatCard from "./InvestDashboardWidgets.jsx";

export function TodayPendingPayments({ onUpdated }) {
  const [, setSp] = useSearchParams();
  const [data, setData] = useState({ payouts: [], totalDue: 0, count: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => {
    investApi("/admin/maturity-payments/today").then((d) => { setData(d); onUpdated?.(); }).catch(() => {});
    investApi("/admin/payouts/pending-today").then((d) => setWithdrawals(d.payouts || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const decide = async (id, action) => {
    setMsg("");
    try {
      await investApi(`/admin/maturity-payments/${id}/${action}`, { method: "POST", body: {} });
      setMsg(action === "approve" ? "Marked completed — investor notified by email." : "Rejected — investor notified.");
      load();
    } catch (e) { setMsg(e.message); }
  };

  const pendingWithdrawals = withdrawals.filter((p) => p.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiStatCard tone="amber" icon="💰" label="Maturity Due Today" value={inr(data.totalDue || 0)} subValue={`${data.count || 0} payments`} />
        <KpiStatCard tone="pink" icon="💸" label="Withdrawals Today" value={String(pendingWithdrawals.length)} subValue="Pending release" />
      </div>
      {msg && <Alert type="success">{msg}</Alert>}

      {pendingWithdrawals.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">Today&apos;s withdrawal requests</h3>
            <button type="button" className="btn-outline text-xs" onClick={() => setSp({ tab: "payouts" })}>
              Open Withdrawals tab →
            </button>
          </div>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-pink-500/10 to-rose-500/5 text-left text-xs uppercase text-slate-400">
                <tr><th className="p-3">Investor</th><th className="p-3">Amount</th><th className="p-3">Mode</th><th className="p-3">Destination</th><th className="p-3">Status</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {pendingWithdrawals.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3">{p.investor?.name}<div className="text-xs text-slate-400">{p.investor?.email}</div></td>
                    <td className="p-3 font-bold text-pink-600">{inr(p.amount)}</td>
                    <td className="p-3"><Badge status={p.mode} /></td>
                    <td className="p-3 font-mono text-xs">{p.destination}</td>
                    <td className="p-3"><Badge status={p.status} /></td>
                    <td className="p-3 text-right">
                      <button type="button" className="btn-gold px-2 py-1 text-xs" onClick={() => setSp({ tab: "payouts", release: p.id })}>
                        Release payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-bold">Maturity profit payments due today</h3>
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
      </section>
    </div>
  );
}

export function UpcomingPayments() {
  const [payouts, setPayouts] = useState([]);
  useEffect(() => { investApi("/admin/maturity-payments/upcoming").then((d) => setPayouts(d.payouts)).catch(catchAdminApi("/admin/maturity-payments/upcoming")); }, []);

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
