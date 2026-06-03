/**
 * Wraps profile / KYC / security / support when dashboard is KYC-gated.
 * Provides a clear close control to return to the review overview.
 */
export default function KycRestrictedPanel({ title, subtitle, onClose, children }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-md">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn icon-btn-md shrink-0 border border-border bg-muted/50 hover:bg-muted"
          aria-label="Close and return"
          title="Close"
        >
          <span className="text-lg leading-none" aria-hidden>
            ×
          </span>
        </button>
      </div>
      {children}
    </div>
  );
}
