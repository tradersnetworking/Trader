import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { investPath } from "../../lib/site.js";

/** Referral landing: /ref/:code → store code and open register wizard */
export default function ReferralLandingPage() {
  const { code } = useParams();

  useEffect(() => {
    if (code) {
      localStorage.setItem("invest_ref", code.trim().toUpperCase());
      fetch("/api/invest/public/referral/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, event: "CLICK" }),
      }).catch(() => {});
    }
  }, [code]);

  const ref = encodeURIComponent((code || "").trim().toUpperCase());
  return <Navigate to={investPath(`/register?ref=${ref}`)} replace />;
}
