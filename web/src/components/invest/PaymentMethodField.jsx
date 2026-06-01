const TONE = {
  upi: {
    label: "text-sky-700 dark:text-sky-400",
    select: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-100",
  },
  bank: {
    label: "text-blue-700 dark:text-blue-400",
    select: "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-100",
  },
  gateway: {
    label: "text-violet-700 dark:text-violet-400",
    select: "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:border-violet-500/35 dark:bg-violet-500/10 dark:text-violet-100",
  },
  amount: {
    label: "text-emerald-700 dark:text-emerald-400",
    select: "",
  },
  proof: {
    label: "text-amber-700 dark:text-amber-400",
    select: "",
  },
  step: {
    label: "text-primary dark:text-amber-400",
    select: "",
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
        className={`input h-11 w-full font-medium ${t.select}`}
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
        className={`input h-10 w-full font-medium ${t.select}`}
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
