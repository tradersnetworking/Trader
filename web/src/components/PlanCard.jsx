import { useMemo } from "react";
import { inr, dateStr } from "../lib/format.js";
import { lockInCategoryLabel, DEFAULT_LOCK_IN_MONTHS } from "../lib/plan-types.js";
import { planCalcPreview } from "../lib/plan-calc.js";
import PlanShareIcons from "./invest/PlanShareIcons.jsx";

const ICONS = { STARTER: "🌱", BRONZE: "🥉", SILVER: "🥈", GOLD: "👑", PLATINUM: "💎", DIAMOND: "💠" };
const TIER_GRADIENT = {
  STARTER: "from-emerald-600 to-emerald-800",
  BRONZE: "from-amber-700 to-amber-900",
  SILVER: "from-slate-500 to-slate-700",
  GOLD: "from-yellow-500 to-amber-700",
  PLATINUM: "from-blue-600 to-indigo-800",
  DIAMOND: "from-violet-600 to-purple-900",
};

export default function PlanCard({ plan, onSubscribe, featured, previewAmount }) {
  const isFeatured = featured ?? DEFAULT_LOCK_IN_MONTHS[plan.planType] === Math.round(plan.lockInDays / 30);
  const grad = TIER_GRADIENT[plan.planType] || "from-primary to-brand-blue";
  const amount = previewAmount ?? plan.minInvestment;
  const calc = useMemo(() => planCalcPreview(amount, plan, "MONTHLY"), [amount, plan]);
  const annualPct = plan.annualRoiPct ?? plan.monthlyRoiPct * 12;

  return (
    <article className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${isFeatured ? "ring-2 ring-gold/60" : ""}`}>
      <div className={`bg-gradient-to-br ${grad} px-4 py-4 text-white sm:px-5 sm:py-5`}>
        {isFeatured && (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black shadow-sm">
              Popular
            </span>
            <span className="inline-flex shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Recommended
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-2xl drop-shadow sm:text-3xl">{ICONS[plan.planType] || "⭐"}</span>
          <span className="shrink-0 rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
            {plan.planType}
          </span>
        </div>
        <h3 className="mt-2.5 break-words text-base font-extrabold leading-snug sm:mt-3 sm:text-lg md:text-xl">{plan.name}</h3>
        <p className="mt-1 text-xs text-white/80">{lockInCategoryLabel(plan.lockInDays)} lock-in</p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-muted/50 p-3 dark:bg-white/5">
            <div className="text-2xl font-extrabold text-foreground">{plan.monthlyRoiPct}%</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Monthly ROI</div>
          </div>
          <div className="rounded-xl bg-gold/10 p-3">
            <div className="text-2xl font-extrabold text-gold-600">{annualPct}%</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Annual ROI</div>
          </div>
        </div>

        <ul className="mt-4 flex-1 space-y-1.5 text-xs sm:text-sm">
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Min investment</span><b>{inr(plan.minInvestment)}</b></li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Max investment</span><b>{inr(plan.maxInvestment)}</b></li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Monthly return @ min</span><b className="text-emerald-600">{inr(calc.monthlyReturn)}</b></li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Annual return @ min</span><b>{inr(calc.monthlyReturn * 12)}</b></li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Expected @ lock-in</span><b className="text-emerald-600">{inr(calc.totalSimpleProfit)}</b></li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Capital return date</span><b>{dateStr(calc.maturityDate)}</b></li>
          <li className="flex justify-between gap-2 border-b border-border/60 pb-1.5"><span className="text-muted-foreground">Settlement</span><b className="text-right">{plan.settlementCycles.replace(/,/g, " · ")}</b></li>
          <li className="flex justify-between gap-2"><span className="text-muted-foreground">Compounding</span><b className="text-right text-[11px]">At maturity only</b></li>
        </ul>

        <div className="mt-5 space-y-2">
          <button type="button" onClick={() => onSubscribe(plan)} className="btn-gold w-full py-2.5 text-sm font-bold">
            Invest Now
          </button>
          <PlanShareIcons plan={plan} amount={inr(amount)} />
        </div>
      </div>
    </article>
  );
}
