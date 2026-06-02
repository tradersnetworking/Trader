import { useEffect, useState } from "react";
import {
  canShowPwaInstallPrompt,
  dismissPwaInstallPrompt,
  isIosSafari,
  triggerPwaInstall,
  subscribePwaInstallReady,
} from "../../lib/pwa.js";
import { BRAND_INVEST } from "../../lib/brand.js";

/** Bottom install bar — invest portal only, all visitors (logged in or not). */
export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [aboveNav, setAboveNav] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIos(isIosSafari());
      setVisible(canShowPwaInstallPrompt());
      setAboveNav(!!document.querySelector(".invest-mobile-nav"));
    };
    sync();
    const t = window.setTimeout(sync, 400);
    const unsub = subscribePwaInstallReady(sync);
    return () => {
      window.clearTimeout(t);
      unsub();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-[60] border-t border-border bg-card/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md md:left-auto md:right-4 md:max-w-sm md:rounded-xl md:border ${
        aboveNav ? "bottom-14 md:bottom-4" : "bottom-0 md:bottom-4"
      }`}
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-brand-blue text-lg text-white">
          📱
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Install {BRAND_INVEST}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {ios
              ? "Tap Share, then Add to Home Screen for quick access."
              : "Add to your home screen for a faster app-like experience."}
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {!ios && (
          <button type="button" className="btn-gold flex-1 py-2 text-xs" onClick={() => triggerPwaInstall()}>
            Install app
          </button>
        )}
        <button
          type="button"
          className={`btn-outline py-2 text-xs ${ios ? "flex-1" : ""}`}
          onClick={() => {
            dismissPwaInstallPrompt();
            setVisible(false);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
