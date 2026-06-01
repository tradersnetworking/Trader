import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { investBrowseBase } from "../../lib/portalConfig.js";

/** Main-domain payment return — redirects to invest portal (subdomain or additional domain). Payments never complete on invest/additional hosts. */
export default function PaymentReturnPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const portal = sp.get("portal") || "invest";
    const kind = sp.get("kind") || "deposit";
    const status = sp.get("status") || "success";
    const depositId = sp.get("depositId");
    const orderId = sp.get("orderId");
    const tradePaymentId = sp.get("tradePaymentId");

    const qs = new URLSearchParams({ status, kind });
    if (depositId) qs.set("depositId", depositId);
    if (orderId) qs.set("orderId", orderId);
    if (tradePaymentId) qs.set("tradePaymentId", tradePaymentId);

    if (portal === "invest") {
      const base = investBrowseBase().replace(/\/$/, "");
      const query = qs.toString();
      if (kind === "deposit") {
        window.location.replace(`${base}/dashboard?tab=money&moneyTab=deposit&${query}`);
        return;
      }
      window.location.replace(`${base}/dashboard?${query}`);
      return;
    }

    if (kind === "order" || orderId) {
      navigate(`/dashboard?tab=orders&${qs.toString()}`, { replace: true });
      return;
    }
    if (kind === "trade" || tradePaymentId) {
      navigate(`/admin?tab=trade-payments&${qs.toString()}`, { replace: true });
      return;
    }
    navigate(`/dashboard?${qs.toString()}`, { replace: true });
  }, [sp, navigate]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <p className="text-lg font-semibold">Processing payment…</p>
      <p className="mt-2 text-sm text-muted-foreground">Redirecting you securely. Please wait.</p>
    </div>
  );
}
