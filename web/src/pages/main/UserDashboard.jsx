import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { Stat, Badge, Copyable } from "../../components/ui.jsx";

export default function UserDashboard() {
  const { main } = useAuth();
  const [tab, setTab] = useState("quotes");
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bank, setBank] = useState(null);

  useEffect(() => {
    mainApi("/quotes/mine").then((d) => setQuotes(d.quotes)).catch(() => {});
    mainApi("/orders/mine").then((d) => setOrders(d.orders)).catch(() => {});
    mainApi("/bank-details").then(setBank).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-navy">Welcome, {main?.name}</h1>
      <p className="text-sm text-slate-500">{main?.accountType} account • {main?.email}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="My Quotes" value={quotes.length} />
        <Stat label="My Orders" value={orders.length} accent="gold" />
        <Stat label="Account Type" value={main?.accountType} />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {["quotes", "orders", "payment"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-navy text-navy" : "text-slate-400"}`}>{t === "payment" ? "Pay / Bank Details" : t}</button>
        ))}
      </div>

      {tab === "quotes" && (
        <div className="mt-4 overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr><th className="p-3">Product</th><th className="p-3">Direction</th><th className="p-3">Qty</th><th className="p-3">Quoted</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t">
                  <td className="p-3 font-medium text-navy">{q.productName}</td>
                  <td className="p-3">{q.direction === "SELL" ? "Supply" : "Buy"}</td>
                  <td className="p-3">{q.quantity} {q.unit}</td>
                  <td className="p-3">{q.quotedPrice ? inr(q.quotedPrice) : "—"}</td>
                  <td className="p-3"><Badge status={q.status} /></td>
                  <td className="p-3 text-slate-400">{dateStr(q.createdAt)}</td>
                </tr>
              ))}
              {quotes.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No quotes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-4 overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr><th className="p-3">Order #</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-mono text-navy">{o.orderNumber}</td>
                  <td className="p-3">{inr(o.totalAmount)}</td>
                  <td className="p-3">{o.paymentGateway || "—"}</td>
                  <td className="p-3"><Badge status={o.status} /></td>
                  <td className="p-3 text-slate-400">{dateStr(o.createdAt)}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payment" && bank && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy">Bank Transfer (IMPS / NEFT / RTGS)</h3>
            <div className="space-y-2">
              <Copyable label="Bank Name" value={bank.bank.name} />
              <Copyable label="Account Name" value={bank.bank.accountName} />
              <Copyable label="Account Number" value={bank.bank.accountNumber} />
              <Copyable label="IFSC Code" value={bank.bank.ifsc} />
              <Copyable label="MICR Code" value={bank.bank.micr} />
              <Copyable label="SWIFT Code" value={bank.bank.swift} />
              <Copyable label="Branch" value={bank.bank.branch} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy">UPI</h3>
            <Copyable label="UPI ID" value={bank.upi.vpa} />
            <p className="mt-3 text-sm text-slate-500">Supported gateways: Razorpay, EximPe, Juspay, Cashfree, PayU, UPI. Cards: Visa, Mastercard, RuPay. E-wallets: Paytm, PhonePe, GPay, Amazon Pay.</p>
          </div>
        </div>
      )}
    </div>
  );
}
