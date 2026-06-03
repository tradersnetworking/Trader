import { useState } from "react";
import { Link } from "react-router-dom";
import { investPath } from "../../lib/site.js";
import { openStaffPortal, showCrossPortalSwitch } from "../../lib/staffPortal.js";

/** Quick links between marketplace and investment dashboards (disabled for end-user isolation). */
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
    <div className={`flex flex-wrap gap-2 border-b border-border pb-4 ${className}`}>
      {portal === "main" ? (
        <Link to="/admin" className="btn-outline text-sm">
          Marketplace Dashboard
        </Link>
      ) : (
        <button
          type="button"
          className="btn-outline text-sm"
          disabled={!!busy}
          onClick={() => go("main", "/admin", "market")}
        >
          {busy === "market" ? "Opening…" : "Marketplace Dashboard"}
        </button>
      )}
      {portal === "invest" ? (
        <Link to={investPath("/admin")} className="btn-gold text-sm">
          Investment Dashboard
        </Link>
      ) : (
        <button
          type="button"
          className="btn-gold text-sm"
          disabled={!!busy}
          onClick={() => go("invest", "/admin", "invest")}
        >
          {busy === "invest" ? "Opening…" : "Investment Dashboard"}
        </button>
      )}
    </div>
  );
}
