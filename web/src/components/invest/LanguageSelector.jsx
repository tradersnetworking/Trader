import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/context.jsx";
import { investSecurityApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";

export default function LanguageSelector({ compact, variant = "default" }) {
  const { locale, setLocale, locales } = useI18n();
  const { invest } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = locales.find((l) => l.code === locale) || locales[0];
  const onDark = variant === "onDark";
  const code = (current?.code || locale || "en").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onChange = (next) => {
    setLocale(next);
    setOpen(false);
    if (invest) investSecurityApi("/locale", { method: "PUT", body: { locale: next } }).catch(() => {});
  };

  const chipClass = onDark ? "lang-chip lang-chip-dark" : "lang-chip lang-chip-light";

  return (
    <div ref={wrapRef} className="lang-chip-wrap shrink-0">
      <button
        type="button"
        className={chipClass}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current?.native || code}`}
        title={current?.native || code}
      >
        <span className="lang-chip-code">{code}</span>
        <svg className="lang-chip-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="lang-chip-menu" role="listbox" aria-label="Select language">
          {locales.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`lang-chip-option ${active ? "lang-chip-option-active" : ""}`}
                  onClick={() => onChange(l.code)}
                >
                  <span className="lang-chip-option-code">{l.code.toUpperCase()}</span>
                  {!compact && <span className="lang-chip-option-native">{l.native}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
