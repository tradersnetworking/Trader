import { ADMIN_PERIOD_OPTIONS, INVESTOR_PERIOD_OPTIONS } from "../../lib/finance-period.js";

export default function CalendarPeriodFilter({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  periodLabel,
  variant = "admin",
  compact = false,
}) {
  const options = variant === "investor" ? INVESTOR_PERIOD_OPTIONS : ADMIN_PERIOD_OPTIONS;

  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "gap-1" : ""}`}>
        <span className="text-base text-amber-600 dark:text-amber-400" aria-hidden>📅</span>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPeriodChange(opt.value)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              period === opt.value
                ? "border-gold bg-gold text-navy-900 shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-navy-900"
                : "border-border bg-muted/70 text-foreground hover:border-gold/40 dark:border-white/15 dark:bg-white/8 dark:text-slate-200 dark:hover:border-amber-500/35 dark:hover:bg-white/12"
            } ${compact ? "px-2 py-0.5 text-[10px]" : ""}`}
          >
            {opt.label}
          </button>
        ))}
        {periodLabel && (
          <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">· {periodLabel}</span>
        )}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label !mb-0.5 !text-[10px]">From</label>
            <input
              type="date"
              className="input h-8 w-36 text-xs dark:[color-scheme:dark]"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
            />
          </div>
          <div>
            <label className="label !mb-0.5 !text-[10px]">To</label>
            <input
              type="date"
              className="input h-8 w-36 text-xs dark:[color-scheme:dark]"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
            />
          </div>
          {onApplyCustom && (
            <button type="button" onClick={onApplyCustom} className="btn-gold h-8 px-3 text-xs">Apply</button>
          )}
        </div>
      )}
    </div>
  );
}
