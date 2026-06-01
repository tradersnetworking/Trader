import { useEffect, useState } from "react";
import { investSecurityApi } from "../../lib/api.js";

export default function ScreenshotProtection() {
  const [enabled, setEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.08);

  useEffect(() => {
    investSecurityApi("/security").then((d) => {
      setEnabled(!!d.screenshotProtection);
      setOpacity(d.watermarkOpacity || 0.08);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const block = (e) => {
      if (e.key === "PrintScreen" || (e.ctrlKey && e.shiftKey && e.key === "I") || e.key === "F12") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] select-none"
      style={{
        backgroundImage: `repeating-linear-gradient(-24deg, transparent, transparent 120px, rgba(0,35,102,${opacity}) 120px, rgba(0,35,102,${opacity}) 121px)`,
      }}
    />
  );
}
