import { useState } from "react";
import { mainApi } from "../lib/api.js";
import { Modal, Field, Alert } from "./ui.jsx";

// direction: BUY (request a quote to import/purchase) | SELL (offer to supply)
export default function QuoteModal({ open, onClose, product, direction = "BUY" }) {
  const isImportReq = product?.listingType === "IMPORT";
  const [form, setForm] = useState({
    productName: product?.name || "",
    quantity: product?.minOrderQty || 1,
    unit: product?.unit || "kg",
    targetPrice: "",
    advancePct: isImportReq ? 30 : "",
    contactName: "", contactEmail: "", contactPhone: "", company: "", message: "",
  });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await mainApi("/quotes", {
        method: "POST",
        body: {
          ...form,
          direction,
          productId: product?.id || null,
          advancePct: direction === "BUY" && form.advancePct ? Number(form.advancePct) : undefined,
        },
      });
      setDone(true);
    } catch (e2) { setErr(e2.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={direction === "SELL" ? "Offer to Supply (Get a Quote)" : "Request a Quote"} wide>
      {done ? (
        <div className="text-center">
          <div className="mb-2 text-4xl">✅</div>
          <p className="font-semibold text-navy">Your {direction === "SELL" ? "supply offer" : "quote request"} has been submitted.</p>
          <p className="mt-1 text-sm text-slate-500">Our team will respond to your email shortly.</p>
          <button onClick={onClose} className="btn-primary mt-4">Close</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Product"><input className="input" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity"><input className="input" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Unit">
              <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {["kg", "MT", "litre", "box", "piece", "container"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label={direction === "SELL" ? "Offer Price (₹)" : "Target Price (₹)"}><input className="input" type="number" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your Name"><input className="input" required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
            <Field label="Company"><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><input className="input" type="email" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></Field>
          </div>
          {direction === "BUY" && isImportReq && (
            <Field label="Advance payment willing to pay now (%)">
              <select className="input" value={form.advancePct} onChange={(e) => setForm({ ...form, advancePct: e.target.value })}>
                {[20, 30, 40, 50].map((p) => <option key={p} value={p}>{p}% advance — balance after order confirmation</option>)}
              </select>
            </Field>
          )}
          <Field label="Message"><textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <button className="btn-gold w-full" disabled={loading}>{loading ? "Submitting…" : "Submit"}</button>
        </form>
      )}
    </Modal>
  );
}
