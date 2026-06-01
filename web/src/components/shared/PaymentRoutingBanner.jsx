import { useEffect, useState } from "react";
import { Alert } from "../ui.jsx";

/** Reminds admins to register webhooks on main domain (not invest subdomain). */
export default function PaymentRoutingBanner() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    fetch("/api/main/payments/routing-info").then((r) => r.json()).then(setInfo).catch(() => {});
  }, []);
  if (!info) return null;
  return (
    <Alert type="info">
      <strong>Payment routing via main domain:</strong> Deposits, payouts, and trade payments use{" "}
      <code className="text-xs">{info.paymentOrigin}</code> for return URLs and webhooks — not the invest subdomain.
      Register Razorpay webhook at <span className="break-all font-mono text-xs">{info.webhooks?.razorpay}</span>
    </Alert>
  );
}
