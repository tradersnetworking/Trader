import { useEffect, useState } from "react";
import { investSecurityApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { useSiteMode } from "../../lib/site.js";

/**
 * Invest portal: discourage screenshots for investor users (watermark overlay + input blocks).
 * Admins and main site are excluded.
 */
export default function ScreenshotProtection() {
  const siteMode = useSiteMode();
  const { invest } = useAuth();
  const [serverEnabled, setServerEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.08);

  const isInvestSite = siteMode === "invest";
  const isInvestorUser = invest?.role === "INVESTOR";
  const isStaff = invest?.role === "ADMIN" || invest?.role === "SUPERADMIN";
  const enabled = isInvestSite && !isStaff && (isInvestorUser || serverEnabled);

  useEffect(() => {
    if (!isInvestSite) return;
    investSecurityApi("/security")
      .then((d) => {
        setServerEnabled(d.screenshotProtection !== false && d.screenshotProtection !== "false");
        setOpacity(d.watermarkOpacity || 0.08);
      })
      .catch(() => {});
  }, [isInvestSite]);

  useEffect(() => {
    if (!enabled) return;
    const blockKey = (e) => {
      if (e.key === "PrintScreen" || (e.ctrlKey && e.shiftKey && e.key === "I") || e.key === "F12") {
        e.preventDefault();
      }
    };
    const blockContext = (e) => e.preventDefault();
    const blockCopy = (e) => {
      if (isInvestorUser) e.preventDefault();
    };
    document.documentElement.classList.add("invest-screenshot-guard");
    window.addEventListener("keydown", blockKey);
    window.addEventListener("contextmenu", blockContext);
    document.addEventListener("copy", blockCopy);
    return () => {
      document.documentElement.classList.remove("invest-screenshot-guard");
      window.removeEventListener("keydown", blockKey);
      window.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("copy", blockCopy);
    };
  }, [enabled, isInvestorUser]);

  if (!enabled) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] select-none invest-screenshot-overlay"
      style={{
        backgroundImage: `repeating-linear-gradient(-24deg, transparent, transparent 120px, rgba(0,35,102,${opacity}) 120px, rgba(0,35,102,${opacity}) 121px)`,
      }}
    />
  );
}
