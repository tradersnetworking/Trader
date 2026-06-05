import { useState } from "react";
import { Link } from "react-router-dom";
import { investPath } from "../../lib/site.js";
import { openStaffPortal, showCrossPortalSwitch } from "../../lib/staffPortal.js";

/** Quick links between marketplace and investment dashboards (staff only — render from gated parents). */
export default function StaffPortalLinks({ portal = "invest", className = "" }) {
  const [busy, setBusy] = useState(null);

  if (!showCrossPortalSwitch()) return null;

  const go = async (toPortal, next, label) => {
    setBusy(label);
    try {
      await openStaffPortal({ fromPortal: portal, toPortal, next });
    } catch (e) {
      alert(e.message || "Could not open dashboard");
      setBusy(null);
    }
  };

  return (
    <div className={`space-y-2 border-b border-border pb-4 ${className}`}>
      <p className="text-xs font-semibold text-muted-foreground">Switch dashboard</p>
      <div className="flex flex-wrap gap-2">
        {portal === "main" ? (
          <Link to="/admin" className="btn-outline text-sm">
            Market Dashboard
          </Link>
        ) : (
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={!!busy}
            onClick={() => go("main", "/admin", "market")}
          >
            {busy === "market" ? "Opening…" : "Market Dashboard"}
          </button>
        )}
        {portal === "invest" ? (
          <Link to={investPath("/admin")} className="btn-gold text-sm">
            Invest Dashboard
          </Link>
        ) : (
          <button
            type="button"
            className="btn-gold text-sm"
            disabled={!!busy}
            onClick={() => go("invest", "/admin", "invest")}
          >
            {busy === "invest" ? "Opening…" : "Invest Dashboard"}
          </button>
        )}
      </div>
    </div>
  );
}
