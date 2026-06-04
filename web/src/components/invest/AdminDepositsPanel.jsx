import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge } from "../ui.jsx";
import { providerLabel } from "../../lib/payment-providers.js";
import DepositProofViewer from "../shared/DepositProofViewer.jsx";

function accountShort(acct) {
  if (!acct) return "—";
  if (acct.type === "upi") return acct.upiId;
  return `${acct.bankName} · ${acct.accountNumber?.slice(-4) ? `****${acct.accountNumber.slice(-4)}` : acct.accountNumber}`;
}

export default function AdminDepositsPanel({ onUpdated }) {
  const [deposits, setDeposits] = useState([]);
  const [filter, setFilter] = useState("");
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    investApi("/admin/deposits")
      .then((d) => {
        setDeposits(d.deposits);
        onUpdated?.(d.deposits);
      })
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const filtered = filter ? deposits.filter((d) => d.status === filter) : deposits;
  const pendingCount = deposits.filter((d) => d.status === "PENDING").length;

  const decide = async (id, action) => {
    setBusy(true);
    try {
      await investApi(`/admin/deposits/${id}/${action}`, { method: "POST", body: {} });
      setReview(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const methodLabel = (d) => {
    if (!d.method) return "—";
    const m = String(d.method).toUpperCase();
    if (["RAZORPAY", "CASHFREE", "PAYU", "EASEBUZZ", "JUSPAY", "EXIMPE", "LITEPAY", "STRIPE", "PAYGLOCAL", "XFLOWPAY", "PINLABS", "HDFC", "AXIS", "ICICI", "YESBANK", "PHONEPE", "PAYPAL"].includes(m)) {
      return providerLabel(m.toLowerCase()) || m;
    }
    return m;
  };

  const isManual = (d) => ["UPI", "IMPS", "NEFT", "RTGS", "BANK"].includes(String(d.method).toUpperCase());

  return (
    <div className="space-y-4">
      <DepositProofViewer
        open={Boolean(review)}
        deposit={review}
        busy={busy}
        onClose={() => setReview(null)}
        onApprove={(id) => decide(id, "approve")}
        onReject={(id) => {
          const reason = window.prompt("Rejection reason (optional):") || "";
          investApi(`/admin/deposits/${id}/reject`, { method: "POST", body: { remarks: reason } }).then(() => {
            setReview(null);
            load();
          });
        }}
      />

      <p className="text-sm text-muted-foreground">
        Manual UPI and bank deposits require proof — review screenshot/PDF before approving. Online gateway deposits auto-credit when payment succeeds.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {[["", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([v, l]) => (
          <button
            key={l}
            type="button"
            onClick={() => setFilter(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === v ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}
          >
            {l}{v === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      <div className="app-table-wrap card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Investor</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Company account</th>
              <th className="p-3">Ref</th>
              <th className="p-3">Proof</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="p-3">
                  {d.investor?.name}
                  <div className="text-xs text-muted-foreground">{d.investor?.email}</div>
                  <div className="text-[10px] text-muted-foreground">{dateStr(d.createdAt, true)}</div>
                </td>
                <td className="p-3 font-bold text-heading">{inr(d.amount)}</td>
                <td className="p-3">{methodLabel(d)}</td>
                <td className="p-3 text-xs">{accountShort(d.paymentAccount)}</td>
                <td className="p-3 text-xs font-mono">{d.reference || "—"}</td>
                <td className="p-3">
                  {d.proofImage ? (
                    <button type="button" className="text-xs font-semibold text-accent-tone underline" onClick={() => setReview(d)}>
                      View proof
                    </button>
                  ) : isManual(d) ? (
                    <span className="text-xs text-rose-500">Missing</span>
                  ) : "—"}
                </td>
                <td className="p-3"><Badge status={d.status} /></td>
                <td className="p-3 text-right whitespace-nowrap">
                  {d.proofImage && (
                    <button type="button" onClick={() => setReview(d)} className="btn-outline mr-2 px-2 py-1 text-xs">
                      View
                    </button>
                  )}
                  {d.status === "PENDING" && (
                    <>
                      <button onClick={() => decide(d.id, "approve")} className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400" disabled={isManual(d) && !d.proofImage}>
                        Approve
                      </button>
                      <button onClick={() => decide(d.id, "reject")} className="ml-2 text-xs text-red-500">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="8" className="p-6 text-center text-muted-foreground">No deposits.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
