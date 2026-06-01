const FINANCE_SELECT =
  "finance-select border-border bg-card text-foreground dark:border-border dark:bg-card dark:text-foreground";

const TONE = {
  upi: {
    label: "text-sky-700 dark:text-sky-400",
    select: `${FINANCE_SELECT} border-sky-500/50`,
  },
  bank: {
    label: "text-blue-700 dark:text-blue-400",
    select: `${FINANCE_SELECT} border-blue-500/50`,
  },
  gateway: {
    label: "text-violet-700 dark:text-violet-400",
    select: `${FINANCE_SELECT} border-violet-500/50`,
  },
  amount: {
    label: "text-emerald-700 dark:text-emerald-400",
    select: FINANCE_SELECT,
  },
  proof: {
    label: "text-amber-700 dark:text-amber-400",
    select: FINANCE_SELECT,
  },
  step: {
    label: "text-primary dark:text-amber-400",
    select: FINANCE_SELECT,
  },
};

export function FinanceFieldLabel({ tone = "step", children, className = "" }) {
  const t = TONE[tone] || TONE.step;
  return <label className={`text-xs font-semibold tracking-wide ${t.label} ${className}`}>{children}</label>;
}

export function MethodCategorySelect({ label, value, onChange, options, tone = "step" }) {
  const t = TONE[tone] || TONE.step;
  return (
    <div className="space-y-1.5">
      <FinanceFieldLabel tone={tone}>{label}</FinanceFieldLabel>
      <select
        className={`input h-11 w-full font-medium ${t.select} ${!value ? "text-muted-foreground" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.icon ? `${o.icon} ` : ""}{o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MethodSelect({ label, value, onChange, options = [], optionGroups, placeholder, tone = "upi", disabled }) {
  const t = TONE[tone] || TONE.upi;
  return (
    <div className="space-y-1.5">
      <FinanceFieldLabel tone={tone}>{label}</FinanceFieldLabel>
      <select
        className={`input h-10 w-full font-medium ${t.select} ${!value ? "text-muted-foreground" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {placeholder && !value && <option value="">{placeholder}</option>}
        {optionGroups?.length
          ? optionGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))
          : options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
      </select>
    </div>
  );
}

export function StepBanner({ tone = "emerald", title, description }) {
  const styles = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    sky: "border-sky-500/20 bg-sky-500/5",
  };
  const text = {
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    sky: "text-sky-700 dark:text-sky-300",
  };
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${styles[tone] || styles.emerald}`}>
      <p className={`text-sm font-semibold ${text[tone] || text.emerald}`}>{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
