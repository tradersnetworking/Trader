import { useEffect, useState } from "react";
import { investApi } from "../lib/api.js";
import { inr } from "../lib/format.js";
import { Modal, Field, Alert } from "./ui.jsx";

export default function SubscribeModal({ plan, onClose, onDone }) {
  const [amount, setAmount] = useState(plan.minInvestment);
  const [cycle, setCycle] = useState(plan.settlementCycles.split(",")[0]);
  const [calc, setCalc] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    investApi(`/public/plans/${plan.id}/calc?amount=${amount}`).then(setCalc).catch(() => {});
  }, [amount, plan.id]);

  const amountOptions = [];
  for (let a = plan.minInvestment; a <= Math.min(plan.maxInvestment, plan.minInvestment * 50); a *= 5) amountOptions.push(a);

  const subscribe = async () => {
    setErr(""); setLoading(true);
    try {
      await investApi("/subscribe", { method: "POST", body: { planId: plan.id, amount: Number(amount), settlementCycle: cycle } });
      onDone();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Subscribe • ${plan.name}`} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)` }}>
          <div className="text-sm opacity-80">{plan.planType}</div>
          <div className="text-2xl font-extrabold">{plan.name}</div>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Monthly ROI: <b>{plan.monthlyRoiPct}%</b></li>
            <li>Annual ROI: <b>{plan.annualRoiPct}%</b></li>
            <li>Profit share/month: <b>{plan.profitSharePct}%</b></li>
            <li>Lock-in: <b>{plan.lockInDays} days</b></li>
            <li>Range: <b>{inr(plan.minInvestment)} – {inr(plan.maxInvestment)}</b></li>
          </ul>
        </div>
        <div className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Investment Amount (select or type)">
            <select className="input" value={amountOptions.includes(Number(amount)) ? amount : ""} onChange={(e) => setAmount(Number(e.target.value))}>
              <option value="">Custom…</option>
              {amountOptions.map((a) => <option key={a} value={a}>{inr(a)}</option>)}
            </select>
            <input className="input mt-2" type="number" min={plan.minInvestment} max={plan.maxInvestment} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Settlement Cycle">
            <select className="input" value={cycle} onChange={(e) => setCycle(e.target.value)}>
              {plan.settlementCycles.split(",").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {calc && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span>You will get monthly</span><b className="text-lg text-navy">{inr(calc.monthlyReturn)}</b></div>
              <div className="flex justify-between text-slate-500"><span>Maturity (after lock-in, compounded)</span><b className="text-gold-600">{inr(calc.compounded.maturityValue)}</b></div>
              <p className="mt-1 text-xs text-slate-400">Compounding applies only after lock-in completes.</p>
            </div>
          )}
          <button onClick={subscribe} className="btn-gold w-full" disabled={loading}>{loading ? "Processing…" : "Confirm & Invest from Wallet"}</button>
          <p className="text-center text-xs text-slate-400">Funds are debited from your wallet balance. KYC must be approved. Add funds from your dashboard if needed.</p>
        </div>
      </div>
    </Modal>
  );
}
