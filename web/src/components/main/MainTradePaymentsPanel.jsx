import { useEffect, useState } from "react";
import { mainApi, mainApiForm } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert, Badge, Field } from "../ui.jsx";
import PhoneInput from "../shared/PhoneInput.jsx";
import DepositProofViewer from "../shared/DepositProofViewer.jsx";
import { handleGatewayCheckout } from "../../lib/onlineCheckout.js";

/** Super admin: collect from purchasers & pay suppliers — all gateways via main domain */
export default function MainTradePaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [routing, setRouting] = useState(null);
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState({
    direction: "COLLECT", amount: "", method: "RAZORPAY", partyName: "", partyEmail: "",
    partyPhone: "", partyPhoneCountryCode: "+91", reference: "", remarks: "",
  });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [review, setReview] = useState(null);

  const load = () => mainApi("/admin/trade-payments").then((d) => setPayments(d.payments || [])).catch(() => {});
  useEffect(() => {
    load();
    mainApi("/payments/routing-info").then(setRouting).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const isManual = ["UPI", "IMPS", "NEFT", "RTGS", "BANK"].includes(form.method);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("proofImage", file);
    try {
      const d = await mainApiForm("/admin/trade-payments", fd);
      if (d.payment && !isManual && form.direction === "COLLECT") {
        await handleGatewayCheckout(d.payment, { amount: form.amount, id: d.tradePayment?.id });
      }
      setMsg(isManual ? "Manual payment recorded — approve after verifying proof." : "Payment initiated via main-domain gateway.");
      setTab("list");
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const setStatus = async (id, status) => {
    await mainApi(`/admin/trade-payments/${id}/status`, { method: "POST", body: { status } });
    setReview(null);
    load();
  };

  const proofDeposit = review ? {
    ...review,
    proofImage: review.proofImage,
    investor: { name: review.partyName, email: review.partyEmail },
    method: review.method,
    amount: review.amount,
    reference: review.reference,
    paymentAccount: null,
  } : null;

  return (
    <div className="page-stack">
      <DepositProofViewer
        open={Boolean(review)}
        deposit={proofDeposit}
        onClose={() => setReview(null)}
        onApprove={(id) => setStatus(id, "PAID")}
        onReject={(id) => setStatus(id, "REJECTED")}
      />

      <div>
        <h3 className="font-bold">Trade payments</h3>
        <p className="text-sm text-muted-foreground">Collect from product purchasers and disburse to suppliers. All gateway URLs use the main domain (akshayaexim.com) — not the invest subdomain.</p>
      </div>

      {routing && (
        <div className="card space-y-1 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Gateway webhook URLs (register on main domain)</p>
          <p>Razorpay: {routing.webhooks?.razorpay}</p>
          <p>PhonePe: {routing.webhooks?.phonepe}</p>
        </div>
      )}

      <div className="flex gap-2">
        {["list", "create"].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm capitalize ${tab === t ? "bg-primary/15 text-accent-tone" : "text-muted-foreground"}`}>{t === "create" ? "+ New payment" : "All payments"}</button>
        ))}
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      {tab === "create" && (
        <form onSubmit={submit} className="card max-w-xl space-y-3 p-5">
          <Field label="Direction">
            <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="COLLECT">Collect from purchaser</option>
              <option value="DISBURSE">Pay supplier</option>
            </select>
          </Field>
          <Field label="Amount (₹)"><input className="input" type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Method">
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="RAZORPAY">Razorpay (online)</option>
              <option value="CASHFREE">Cashfree</option>
              <option value="UPI">UPI (manual + proof)</option>
              <option value="NEFT">NEFT (manual + proof)</option>
              <option value="IMPS">IMPS (manual + proof)</option>
            </select>
          </Field>
          <Field label="Party name"><input className="input" required value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} /></Field>
          <Field label="Party email"><input className="input" type="email" value={form.partyEmail} onChange={(e) => setForm({ ...form, partyEmail: e.target.value })} /></Field>
          <Field label="Party phone">
            <PhoneInput
              countryCode={form.partyPhoneCountryCode}
              phone={form.partyPhone}
              onCountryCodeChange={(v) => setForm({ ...form, partyPhoneCountryCode: v })}
              onPhoneChange={(v) => setForm({ ...form, partyPhone: v })}
            />
          </Field>
          <Field label="Reference / UTR"><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          {["UPI", "IMPS", "NEFT", "RTGS", "BANK"].includes(form.method) && (
            <Field label="Payment proof (required)">
              <input type="file" accept="image/*,.pdf" required className="input py-1.5" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Field>
          )}
          <Field label="Remarks"><input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          <button className="btn-gold">Create payment</button>
        </form>
      )}

      {tab === "list" && (
        <div className="app-table-wrap card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Date</th><th className="p-3">Direction</th><th className="p-3">Party</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 text-xs">{dateStr(p.createdAt, true)}</td>
                  <td className="p-3"><Badge status={p.direction} /></td>
                  <td className="p-3">{p.partyName}<div className="text-xs text-muted-foreground">{p.partyEmail}</div></td>
                  <td className="p-3 font-bold">{inr(p.amount)}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3"><Badge status={p.status} /></td>
                  <td className="p-3 text-right">
                    {p.proofImage && p.status === "PENDING" && (
                      <button type="button" className="text-xs text-primary underline" onClick={() => setReview(p)}>Review</button>
                    )}
                    {p.status === "PENDING" && !p.proofImage && p.direction === "DISBURSE" && (
                      <button type="button" className="text-xs text-emerald-600" onClick={() => setStatus(p.id, "PAID")}>Mark paid</button>
                    )}
                  </td>
                </tr>
              ))}
              {!payments.length && <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">No trade payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
