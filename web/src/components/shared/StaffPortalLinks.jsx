import { Link } from "react-router-dom";
import { investPath, investUrl, mainUrl } from "../../lib/site.js";

/** Quick links between marketplace and investment dashboards for admin / super admin. */
export default function StaffPortalLinks({ portal = "invest", className = "" }) {
  return (
    <div className={`flex flex-wrap gap-2 border-b border-border pb-4 ${className}`}>
      {portal === "invest" ? (
        <a href={mainUrl("/admin")} className="btn-outline text-sm">
          Marketplace Dashboard
        </a>
      ) : (
        <Link to="/admin" className="btn-outline text-sm">
          Marketplace Dashboard
        </Link>
      )}
      {portal === "main" ? (
        <a href={investUrl("/admin")} className="btn-gold text-sm">
          Investment Dashboard
        </a>
      ) : (
        <Link to={investPath("/admin")} className="btn-gold text-sm">
          Investment Dashboard
        </Link>
      )}
    </div>
  );
}
