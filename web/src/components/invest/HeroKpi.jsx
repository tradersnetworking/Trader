import { KPI_TONES } from "../../lib/invest-dashboard-ui.js";

const HERO_KPI_TONES = {
  amber: KPI_TONES.amber.value,
  emerald: KPI_TONES.emerald.value,
  blue: KPI_TONES.blue.value,
  violet: KPI_TONES.violet.value,
  cyan: KPI_TONES.cyan.value,
  rose: KPI_TONES.rose.value,
};

/** Top-of-dashboard hero KPI strip (4 boxes) — theme-aware for light & dark */
export function HeroKpi({ icon, label, value, sub, loading, tone = "amber", accent, onClick, action }) {
  const valueClass = accent || HERO_KPI_TONES[tone] || HERO_KPI_TONES.amber;
  return (
    <div
      className={`rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm dark:border-white/12 dark:bg-card/90 ${
        onClick ? "cursor-pointer transition hover:border-amber-500/35 hover:shadow-md" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon && <span aria-hidden>{icon}</span>}
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className={`text-xl font-extrabold sm:text-2xl ${valueClass}`}>{value}</p>
          {action}
        </div>
      )}
      {sub && !loading && <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{sub}</p>}
    </div>
  );
}
