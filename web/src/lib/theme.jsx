import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSiteMode } from "./site.js";
import { sessionGet, sessionSet } from "./browserStorage.js";

const ThemeContext = createContext(null);

function themeKey(site) {
  return site === "invest" ? "aex_theme_invest" : "aex_theme_main";
}

function systemDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function apply(mode) {
  const dark = mode === "dark" || (mode === "auto" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

function SunIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function AutoIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function ThemeProvider({ children }) {
  const site = useSiteMode();
  const key = themeKey(site);
  const [mode, setMode] = useState(() => sessionGet(key) || "auto");

  useEffect(() => {
    const stored = sessionGet(key) || "auto";
    setMode(stored);
  }, [key]);

  useEffect(() => {
    apply(mode);
    sessionSet(key, mode);
  }, [mode, key]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((sessionGet(key) || "auto") === "auto") apply("auto");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [key]);

  const cycle = useCallback(() => {
    setMode((m) => (m === "auto" ? "light" : m === "light" ? "dark" : "auto"));
  }, []);

  return <ThemeContext.Provider value={{ mode, setMode, cycle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () =>
  useContext(ThemeContext) || { mode: "auto", setMode: () => {}, cycle: () => {} };

export function ThemeToggle({ className = "", compact = false }) {
  const { mode, cycle } = useTheme();
  const label = mode === "auto" ? "Auto" : mode === "light" ? "Light" : "Dark";
  const Icon = mode === "auto" ? AutoIcon : mode === "light" ? SunIcon : MoonIcon;
  const btnSize = compact ? "h-7 w-7 min-w-[1.75rem] p-0" : "h-9 w-9 min-w-[2.25rem] px-2";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${label}`}
      aria-label={`Theme: ${label}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground transition hover:border-primary/30 hover:bg-primary/10 dark:bg-white/5 dark:hover:bg-primary/15 ${btnSize} ${className}`}
    >
      <Icon className={iconSize} />
      {!compact && <span className="hidden sm:inline text-xs font-semibold ml-1">{label}</span>}
    </button>
  );
}
