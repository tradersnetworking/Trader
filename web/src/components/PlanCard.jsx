import { inr } from "../lib/format.js";

const ICONS = {
  STARTER: "🌱", BRONZE: "🥉", SILVER: "🥈", GOLD: "👑", PLATINUM: "💎", DIAMOND: "💠",
};

export default function PlanCard({ plan, onSubscribe }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)` }}>
        <div className="flex items-center justify-between">
          <span className="text-2xl">{ICONS[plan.planType] || "⭐"}</span>
          <span className="badge bg-white/20 text-white">{plan.planType}</span>
        </div>
        <h3 className="mt-2 text-xl font-extrabold">{plan.name}</h3>
        <p className="text-xs text-white/80">Lock-in {plan.lockInDays} days ({Math.round(plan.lockInDays / 30)} months)</p>
      </div>
      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-2xl font-extrabold text-navy">{plan.monthlyRoiPct}%</div>
            <div className="text-[11px] uppercase text-slate-400">Monthly ROI</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-2xl font-extrabold text-gold-600">{plan.annualRoiPct}%</div>
            <div className="text-[11px] uppercase text-slate-400">Annual ROI</div>
          </div>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-600">
          <li className="flex justify-between"><span>Min Investment</span><b className="text-navy">{inr(plan.minInvestment)}</b></li>
          <li className="flex justify-between"><span>Max Investment</span><b className="text-navy">{inr(plan.maxInvestment)}</b></li>
          <li className="flex justify-between"><span>Profit Share / month</span><b className="text-navy">{plan.profitSharePct}%</b></li>
          <li className="flex justify-between"><span>Settlement</span><b className="text-navy">{plan.settlementCycles.replace(",", " / ")}</b></li>
        </ul>
        <button onClick={() => onSubscribe(plan)} className="btn-gold w-full">Subscribe</button>
      </div>
    </div>
  );
}
