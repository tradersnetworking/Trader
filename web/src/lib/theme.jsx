import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);
const KEY = "aex_theme"; // 'auto' | 'light' | 'dark'

function systemDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(mode) {
  const dark = mode === "dark" || (mode === "auto" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(KEY) || "auto");

  useEffect(() => {
    apply(mode);
    localStorage.setItem(KEY, mode);
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if ((localStorage.getItem(KEY) || "auto") === "auto") apply("auto"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cycle = useCallback(() => {
    setMode((m) => (m === "auto" ? "light" : m === "light" ? "dark" : "auto"));
  }, []);

  return <ThemeContext.Provider value={{ mode, setMode, cycle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle({ className = "" }) {
  const { mode, cycle } = useTheme();
  const icon = mode === "auto" ? "🌗" : mode === "light" ? "☀️" : "🌙";
  const label = mode === "auto" ? "Auto" : mode === "light" ? "Light" : "Dark";
  return (
    <button
      onClick={cycle}
      title={`Theme: ${label} (click to change)`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 ${className}`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
