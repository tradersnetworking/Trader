import { ThemeToggle } from "../../lib/theme.jsx";
import LanguageSelector from "./LanguageSelector.jsx";

/** Kuber-style split auth shell — language + theme top-right, form centered on mobile. */
export default function AuthPageLayout({ children, brandPanel, className = "" }) {
  return (
    <div className={`relative flex min-h-[100dvh] flex-col overflow-x-clip bg-background md:flex-row ${className}`}>
      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-1.5 sm:right-4">
        <LanguageSelector compact />
        <ThemeToggle compact className="touch-target h-10 w-10 border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm sm:h-9 sm:w-9" />
      </div>
      {brandPanel}
      <div className="flex w-full min-w-0 flex-1 items-center justify-center p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(3.75rem,env(safe-area-inset-top))] sm:p-6 md:p-10 lg:p-12">
        <div className="w-full min-w-0 max-w-md lg:max-w-lg">{children}</div>
      </div>
    </div>
  );
}
