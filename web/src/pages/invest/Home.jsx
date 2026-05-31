import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr } from "../../lib/format.js";
import PlanCard from "../../components/PlanCard.jsx";
import SubscribeModal from "../../components/SubscribeModal.jsx";

export default function InvestHome() {
  const { invest } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);

  useEffect(() => { investApi("/public/plans").then((d) => setPlans(d.plans)).catch(() => {}); }, []);

  const onSubscribe = (plan) => {
    if (!invest) return nav("/invest/login");
    setSub(plan);
  };

  // group by plan type for the "types of plans" layout
  return (
    <div>
      <section className="hero-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <img src="/assets/logo.png" className="mx-auto mb-4 h-20 w-20 rounded-full bg-black/30 p-1" alt="logo" />
          <h1 className="text-4xl font-extrabold md:text-5xl">Smart Investment • <span className="gold-text">Secure Future</span> • Grow Your Wealth</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">Invest in Akshaya Exim Traders and earn consistent monthly returns. Flexible lock-in periods, transparent profit sharing, weekly or monthly settlements, and 100% capital secured.</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="#plans" className="btn-gold">View Plans</a>
            <a href="#calculator" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">Returns Calculator</a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[["10%–20%", "Monthly ROI"], ["120%–240%", "Annual ROI"], ["6", "Plan Tiers"], ["100%", "Capital Secured"]].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/5 p-4"><div className="text-2xl font-extrabold gold-text">{v}</div><div className="text-xs text-slate-300">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-4 py-14">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-navy">Investment Plans</h2>
          <p className="text-slate-500">Choose your plan • Invest • Earn • Repeat</p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => <PlanCard key={p.id} plan={p} onSubscribe={onSubscribe} />)}
        </div>
      </section>

      <Calculator plans={plans} />

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="hero-gradient rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-extrabold">Invest Wisely. Earn Consistently. Build Wealth.</h3>
          <p className="mt-1 text-slate-300">Deposit via UPI, IMPS, NEFT, RTGS, cards, e-wallets & crypto. Withdraw directly to your bank/UPI.</p>
          <Link to={invest ? "/invest/dashboard" : "/invest/register"} className="btn-gold mt-4">{invest ? "Go to Dashboard" : "Start Investing"}</Link>
        </div>
      </section>

      {sub && <SubscribeModal plan={sub} onClose={() => setSub(null)} onDone={() => { setSub(null); nav("/invest/dashboard"); }} />}
    </div>
  );
}

function Calculator({ plans }) {
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState(100000);
  const [result, setResult] = useState(null);

  useEffect(() => { if (plans.length && !planId) setPlanId(plans[0].id); }, [plans]);
  useEffect(() => {
    if (!planId) return;
    investApi(`/public/plans/${planId}/calc?amount=${amount}`).then(setResult).catch(() => {});
  }, [planId, amount]);

  const plan = plans.find((p) => p.id === planId);

  return (
    <section id="calculator" className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="text-center"><h2 className="text-3xl font-extrabold text-navy">Monthly Return Calculator</h2><p className="text-slate-500">See exactly how much you earn each month</p></div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card space-y-4 p-6">
            <div><label className="label">Select Plan</label>
              <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} • {p.monthlyRoiPct}%/mo</option>)}
              </select>
            </div>
            <div><label className="label">Investment Amount</label>
              <select className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
                {[100000, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 5000000].map((a) => <option key={a} value={a}>{inr(a)}</option>)}
              </select>
              <input className="input mt-2" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Or enter amount" />
            </div>
            {plan && <p className="text-xs text-slate-400">Min {inr(plan.minInvestment)} • Max {inr(plan.maxInvestment)} • Lock-in {plan.lockInDays} days</p>}
          </div>
          <div className="card p-6">
            {result ? (
              <div className="space-y-3">
                <Row label="Monthly Return" value={inr(result.monthlyReturn)} big />
                <Row label="Monthly ROI" value={`${result.monthlyRoiPct}%`} />
                <Row label="Annual ROI" value={`${result.annualRoiPct}%`} />
                <hr />
                <Row label={`Simple total (${result.simple.months} mo)`} value={inr(result.simple.totalReturn)} />
                <Row label="Maturity (simple)" value={inr(result.simple.maturityValue)} />
                <Row label="Maturity (compounded)*" value={inr(result.compounded.maturityValue)} accent />
                <p className="text-xs text-slate-400">*{result.note}</p>
              </div>
            ) : <p className="text-slate-400">Select a plan…</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, big, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-bold ${big ? "text-2xl text-navy" : accent ? "text-gold-600" : "text-navy"}`}>{value}</span>
    </div>
  );
}
