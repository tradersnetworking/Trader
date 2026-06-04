/** On/off toggles for showing payment modes to investors (deposit / withdraw). */

function ToggleRow({ label, sublabel, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm ${disabled ? "opacity-60" : ""}`}>
      <span>
        <span className="font-medium text-foreground">{label}</span>
        {sublabel && <span className="mt-0.5 block text-xs text-muted-foreground">{sublabel}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[1.35rem]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

export function VisibilityPairToggles({
  modeId,
  visibility,
  onChange,
  disabled,
  depositLabel = "Show for deposits",
  withdrawLabel = "Show for withdrawals",
  showDeposit = true,
  showWithdraw = true,
}) {
  const v = visibility?.[modeId] || visibility?.[String(modeId).toLowerCase()] || { deposit: true, withdraw: true };
  const set = (patch) => onChange(modeId, { ...v, ...patch });
  if (!showDeposit && !showWithdraw) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {showDeposit && (
        <ToggleRow label={depositLabel} checked={v.deposit !== false} onChange={(on) => set({ deposit: on })} disabled={disabled} />
      )}
      {showWithdraw && (
        <ToggleRow label={withdrawLabel} checked={v.withdraw !== false} onChange={(on) => set({ withdraw: on })} disabled={disabled} />
      )}
    </div>
  );
}

export default ToggleRow;
