import { useState } from "react";



export function UserAvatar({ user, size = 36, className = "" }) {

  const px = typeof size === "number" ? `${size}px` : size;

  const initial = (user?.name || "U").charAt(0).toUpperCase();

  const src = user?.profilePicture;



  if (src) {

    return (

      <img

        src={src}

        alt={user?.name || "Profile"}

        className={`shrink-0 rounded-full object-cover ring-2 ring-primary/30 ${className}`}

        style={{ width: px, height: px }}

        draggable={false}

      />

    );

  }



  return (

    <span

      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-brand-blue text-sm font-bold text-white ring-2 ring-primary/20 dark:from-sidebar-accent dark:to-muted ${className}`}

      style={{ width: px, height: px, fontSize: typeof size === "number" ? Math.max(11, size * 0.38) : undefined }}

    >

      {initial}

    </span>

  );

}



export function Logo({ className = "h-10 w-auto max-w-[10rem]", variant = "header" }) {
  const useMark = variant === "mark";
  const src = useMark ? "/assets/logo-mark.png" : "/assets/logo.png";
  const sizeClass = variant === "full" ? className : `${className} max-w-[10rem] sm:max-w-[11rem]`;

  return (
    <span className={`brand-logo-wrap shrink-0 ${useMark ? "h-9 w-9 sm:h-10 sm:w-10" : ""}`}>
      <img
        src={src}
        alt="Akshaya Exim Traders"
        className={`brand-logo ${sizeClass}`}
        draggable={false}
        width={useMark ? 40 : 160}
        height={useMark ? 40 : 40}
      />
    </span>
  );
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

    <div className="surface-inset flex min-w-0 items-start justify-between gap-2 px-3 py-2 sm:items-center">

      <div className="min-w-0 flex-1">

        {label && <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>}

        <div className="break-all font-mono text-sm text-foreground">{value}</div>

      </div>

      <button type="button" onClick={copy} className="btn-primary shrink-0 px-2.5 py-1 text-xs">

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

      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}

    </div>

  );

}



const ACCENTS = {

  navy: "from-brand-blue to-navy",

  gold: "from-gold-400 to-gold",

  blue: "from-brand-blue to-blue-600",

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

      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>

      <div className={`mt-1 break-words text-2xl font-extrabold ${accent === "gold" ? "text-accent-tone" : "text-foreground"}`}>{value}</div>

    </div>

  );

}



export function Modal({ open, onClose, title, children, wide }) {

  if (!open) return null;

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>

      <div className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>

        <div className="mb-4 flex items-center justify-between">

          <h3 className="text-lg font-bold text-foreground">{title}</h3>

          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>

        </div>

        {children}

      </div>

    </div>

  );

}



export function Alert({ type = "info", children }) {

  if (!children) return null;

  const styles = {

    error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",

    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",

    info: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300",

  };

  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles[type]}`}>{children}</div>;

}



export function Badge({ status }) {

  const map = {

    PENDING: "bg-primary/15 text-amber-800 dark:text-amber-300",

    APPROVED: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",

    ACTIVE: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",

    SUCCESS: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",

    REJECTED: "bg-red-500/15 text-red-800 dark:text-red-300",

    FAILED: "bg-red-500/15 text-red-800 dark:text-red-300",

    PROCESSING: "bg-blue-500/15 text-blue-800 dark:text-blue-300",

    MATURED: "bg-violet-500/15 text-violet-800 dark:text-violet-300",

    PENDING_SIGNATURE: "bg-primary/15 text-amber-800 dark:text-amber-300",

    SIGNED: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",

    REVOKED: "bg-red-500/15 text-red-800 dark:text-red-300",

    PURGED: "bg-muted text-muted-foreground",

    "NOT SUBMITTED": "bg-muted text-muted-foreground",

  };

  return <span className={`badge ${map[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;

}

