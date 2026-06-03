import { useState, useEffect } from "react";
import { createPortal } from "react-dom";



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



export function Logo({ className, variant = "full", brand = "main" }) {
  const useMark = variant === "mark";
  const pack = brand === "invest" ? "invest" : "main";
  const src = useMark
    ? pack === "invest"
      ? "/assets/logo-invest-mark.png"
      : "/assets/logo-main-mark.png"
    : pack === "invest"
      ? "/assets/logo-invest.png"
      : "/assets/logo-main.png";
  const alt = pack === "invest" ? "AKSHYA INVESTMENTS" : "AKASHYA EXIM TRADERS";
  const defaultClass = useMark
    ? "h-9 w-9 sm:h-10 sm:w-10"
    : pack === "invest"
      ? "h-14 w-auto max-w-[10rem] object-contain sm:h-16 sm:max-w-[11rem]"
      : "h-14 w-auto max-w-[9rem] sm:h-16 sm:max-w-[10rem]";
  const sizeClass = className || defaultClass;

  return (
    <span className={`brand-logo-wrap shrink-0 ${useMark ? "inline-flex" : "inline-flex items-center"}`}>
      <img
        src={src}
        alt={alt}
        className={`brand-logo object-contain ${sizeClass}`}
        draggable={false}
        width={useMark ? 40 : pack === "invest" ? 160 : 180}
        height={useMark ? 40 : pack === "invest" ? 120 : 72}
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

function EyeIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

/** Password field with show/hide toggle — use instead of type="password" inputs. */
export function PasswordInput({ className = "", wrapperClassName = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`input w-full pr-11 ${className}`.trim()}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon className="h-[1.125rem] w-[1.125rem]" /> : <EyeIcon className="h-[1.125rem] w-[1.125rem]" />}
      </button>
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
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`card w-full ${wide ? "max-w-4xl" : "max-w-md"} max-h-[92vh] overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-lg leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
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

    SUPERADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
    ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    STAFF: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
    USER: "bg-muted text-muted-foreground",
    INVESTOR: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",

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

