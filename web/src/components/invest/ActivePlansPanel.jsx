import { inr, dateStr, daysLeft } from "../../lib/format.js";
import { Badge } from "../ui.jsx";
import PlanShareIcons from "./PlanShareIcons.jsx";

export default function ActivePlansPanel({ subscriptions = [], loading, onNavigate, onOpenDetail }) {
  const active = subscriptions.filter((s) => s.status === "ACTIVE");

  if (loading) {
    return (
      <div className="card p-5">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-navy dark:text-white">My Active Plans</h3>
          <p className="text-xs text-muted-foreground">{active.length} active investment{active.length !== 1 ? "s" : ""}</p>
        </div>
        <button type="button" className="text-xs font-semibold text-gold-600" onClick={() => onNavigate?.("investments")}>
          View all →
        </button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No active investments yet.</p>
          <button type="button" className="btn-gold mt-3 text-sm" onClick={() => onNavigate?.("plans")}>
            Browse plans
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.slice(0, 4).map((s) => {
            const profit = s.projection?.totalReturn || s.monthlyReturn * 12 || 0;
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDetail?.(s.id)}
                onKeyDown={(e) => e.key === "Enter" && onOpenDetail?.(s.id)}
                className="w-full cursor-pointer rounded-xl border border-border bg-muted/20 p-4 text-left transition hover:ring-2 hover:ring-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-semibold text-foreground">{s.plan?.name || "Investment"}</h4>
                      <Badge status="ACTIVE" />
                    </div>
                    <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{inr(s.amount)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {s.monthlyRoiPct}% profit share / month · {Math.round((s.lockInDays || s.plan?.lockInDays || 0) / 30)}-month lock-in
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <PlanShareIcons plan={s.plan} amount={inr(s.amount)} className="justify-end" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Monthly</span>
                    <div className="font-semibold">{inr(s.monthlyReturn || 0)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Maturity</span>
                    <div className="font-semibold">{dateStr(s.maturityDate)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days left</span>
                    <div className="font-semibold">{daysLeft(s.maturityDate)}d</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Est. profit</span>
                    <div className="font-semibold text-emerald-600">{inr(profit)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
