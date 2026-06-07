import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { Alert } from "../ui.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Copyable } from "../ui.jsx";
import UpiQrDisplay from "../shared/UpiQrDisplay.jsx";
import { handleGatewayCheckout } from "../../lib/onlineCheckout.js";

export default function MainPaymentPanel() {
  const [bank, setBank] = useState(null);

  useEffect(() => {
    mainApi("/bank-details").then(setBank).catch(() => {});
  }, []);

  if (!bank) return <p className="text-muted-foreground">Loading payment details…</p>;

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <div className="card min-w-0 overflow-hidden p-5">
        <h3 className="mb-3 font-bold">Bank Transfer (IMPS / NEFT / RTGS)</h3>
        <div className="min-w-0 space-y-2">
          <Copyable label="Bank Name" value={bank.bank.name} />
          <Copyable label="Account Name" value={bank.bank.accountName} />
          <Copyable label="Account Number" value={bank.bank.accountNumber} />
          <Copyable label="IFSC Code" value={bank.bank.ifsc} />
          <Copyable label="MICR Code" value={bank.bank.micr} />
          <Copyable label="SWIFT Code" value={bank.bank.swift} />
          <Copyable label="Branch" value={bank.bank.branch} />
        </div>
      </div>
      <div className="card min-w-0 overflow-hidden p-5">
        <h3 className="mb-3 font-bold">UPI & online gateways</h3>
        <Copyable label="UPI ID" value={bank.upi.vpa} />
        {bank.upi?.vpa && (
          <UpiQrDisplay vpa={bank.upi.vpa} payeeName={bank.upi.payeeName || bank.bank?.accountName} className="mt-4" />
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          Supported gateways: Razorpay, EximPe, Juspay, Cashfree, PayU, UPI. Cards: Visa, Mastercard, RuPay.
        </p>
      </div>
    </div>
  );
}

export function MainMyQuotesPanel() {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    mainApi("/quotes/mine").then((d) => setQuotes(d.quotes)).catch(() => {});
  }, []);

  return (
    <div className="app-table-wrap card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Product</th>
            <th className="p-3">Direction</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Quoted</th>
            <th className="p-3">Status</th>
            <th className="p-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="border-t">
              <td className="p-3 font-medium">{q.productName}</td>
              <td className="p-3">{q.direction === "SELL" ? "Supply" : "Buy"}</td>
              <td className="p-3">{q.quantity} {q.unit}</td>
              <td className="p-3">{q.quotedPrice ? inr(q.quotedPrice) : "—"}</td>
              <td className="p-3"><Badge status={q.status} /></td>
              <td className="p-3 text-muted-foreground">{dateStr(q.createdAt)}</td>
            </tr>
          ))}
          {quotes.length === 0 && (
            <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No quotes yet. Use Request Quote or Supply Offer from the sidebar.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MainMyOrdersPanel({ onGenerateInvoice }) {
  const [sp, setSp] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(null);
  const paymentBanner = sp.get("status") === "success" ? "Payment completed successfully." : sp.get("status") === "failed" ? "Payment was not completed. You can pay from this list." : null;

  const load = () => mainApi("/orders/mine").then((d) => setOrders(d.orders)).catch(() => {});

  useEffect(() => { load(); }, []);

  const dismissBanner = () => {
    const next = new URLSearchParams(sp);
    next.delete("status");
    next.delete("orderId");
    next.delete("kind");
    setSp(next, { replace: true });
  };

  const genInvoice = async (orderId) => {
    setBusy(orderId);
    try {
      const d = await mainApi(`/invoices/from-order/${orderId}`, { method: "POST", body: {} });
      await load();
      onGenerateInvoice?.(d.invoice);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const payOrder = async (orderId) => {
    setBusy(orderId);
    try {
      const d = await mainApi(`/orders/${orderId}/pay`, { method: "POST", body: { gateway: "razorpay" } });
      const due = Math.max(0, (d.order?.totalAmount || 0) - (d.order?.paidAmount || 0));
      if (d.payment) await handleGatewayCheckout(d.payment, { amount: due, id: d.order?.id });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {paymentBanner && (
        <Alert type={sp.get("status") === "success" ? "success" : "info"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{paymentBanner}</span>
            <button type="button" className="text-xs font-semibold underline" onClick={dismissBanner}>
              Dismiss
            </button>
          </div>
        </Alert>
      )}
      <div className="app-table-wrap card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Order #</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Payment</th>
            <th className="p-3">Order</th>
            <th className="p-3">Date</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3 font-mono">{o.orderNumber}</td>
              <td className="p-3">
                {inr(o.totalAmount)}
                {(o.paidAmount || 0) > 0 && o.paymentStatus !== "PAID" && (
                  <div className="text-xs text-muted-foreground">Paid {inr(o.paidAmount)} · Due {inr(o.totalAmount - o.paidAmount)}</div>
                )}
              </td>
              <td className="p-3">
                <Badge status={o.paymentStatus || "UNPAID"} />
                <div className="text-xs text-muted-foreground">{o.paymentGateway || "—"}</div>
              </td>
              <td className="p-3"><Badge status={o.status} /></td>
              <td className="p-3 text-muted-foreground">{dateStr(o.createdAt)}</td>
              <td className="p-3 text-right whitespace-nowrap">
                {o.paymentStatus !== "PAID" && (
                  <button type="button" className="mr-2 text-xs font-semibold text-emerald-600" disabled={busy === o.id} onClick={() => payOrder(o.id)}>
                    {busy === o.id ? "…" : o.paymentStatus === "PARTIAL" ? "Pay balance" : "Proceed to payment"}
                  </button>
                )}
                <button type="button" className="text-xs font-semibold text-primary" disabled={busy === o.id} onClick={() => genInvoice(o.id)}>
                  {busy === o.id ? "…" : "Generate invoice"}
                </button>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
