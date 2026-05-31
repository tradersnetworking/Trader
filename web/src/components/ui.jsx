import { useState } from "react";

export function Logo({ className = "h-10", variant = "header" }) {
  // Logo has black bg + blue/gold — show on white/gold ring so it's visible on navy headers.
  const wrap = variant === "header"
    ? "inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-md ring-2 ring-gold/50"
    : variant === "footer"
      ? "inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow ring-1 ring-gold/30"
      : "";
  const img = <img src="/assets/logo.png" alt="Akshaya Exim Traders" className={className} />;
  return wrap ? <div className={wrap}>{img}</div> : img;
}

export function Copyable({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        {label && <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>}
        <div className="truncate font-mono text-sm text-navy">{value}</div>
      </div>
      <button onClick={copy} className="shrink-0 rounded-md bg-navy px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy-800">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const ACCENTS = {
  navy: "from-blue-500 to-indigo-600",
  gold: "from-amber-400 to-yellow-600",
  blue: "from-sky-400 to-blue-600",
  emerald: "from-emerald-400 to-teal-600",
  violet: "from-violet-400 to-purple-600",
  cyan: "from-cyan-400 to-sky-600",
  pink: "from-pink-400 to-rose-600",
};

export function Stat({ label, value, accent = "navy" }) {
  const grad = ACCENTS[accent] || ACCENTS.navy;
  return (
    <div className="card overflow-hidden p-5">
      <div className={`-mx-5 -mt-5 mb-3 h-1.5 bg-gradient-to-r ${grad}`} />
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 break-words text-2xl font-extrabold ${accent === "gold" ? "text-gold-600" : "text-navy"}`}>{value}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alert({ type = "info", children }) {
  if (!children) return null;
  const styles = {
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-green-50 text-green-700 border-green-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles[type]}`}>{children}</div>;
}

export function Badge({ status }) {
  const map = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    ACTIVE: "bg-green-100 text-green-700",
    SUCCESS: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    FAILED: "bg-red-100 text-red-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    MATURED: "bg-violet-100 text-violet-700",
  };
  return <span className={`badge ${map[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>;
}
