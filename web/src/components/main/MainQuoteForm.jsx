import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { Field, Alert } from "../ui.jsx";

const UNITS = ["kg", "MT", "litre", "box", "piece", "container"];

export default function MainQuoteForm({ user, direction = "BUY", onSuccess }) {
  const [form, setForm] = useState({
    productName: "",
    quantity: 1,
    unit: "kg",
    targetPrice: "",
    contactName: user?.name || "",
    contactEmail: user?.email || "",
    contactPhone: user?.phone || "",
    company: user?.companyName || "",
    message: "",
  });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      contactName: f.contactName || user.name || "",
      contactEmail: f.contactEmail || user.email || "",
      contactPhone: f.contactPhone || user.phone || "",
      company: f.company || user.companyName || "",
    }));
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await mainApi("/quotes", { method: "POST", body: { ...form, direction } });
      setDone(true);
      onSuccess?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mb-2 text-4xl">✅</div>
        <p className="font-semibold">
          Your {direction === "SELL" ? "supply offer" : "quote request"} has been submitted.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Our trade desk will respond to your email shortly.</p>
        <button type="button" className="btn-primary mt-4" onClick={() => { setDone(false); setForm((f) => ({ ...f, productName: "", message: "" })); }}>
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl p-6">
      <h3 className="mb-1 text-lg font-bold">
        {direction === "SELL" ? "Offer to Supply (Export)" : "Request a Quote (Import / Buy)"}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {direction === "SELL"
          ? "List products you can supply. We match buyers and handle export logistics."
          : "Tell us what you need to import or purchase. We respond with pricing and Incoterms."}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Product / Commodity">
          <input className="input" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Basmati Rice, Cotton Yarn" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Quantity">
            <input className="input" type="number" required min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field label="Unit">
            <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label={direction === "SELL" ? "Offer Price (₹)" : "Target Price (₹)"}>
            <input className="input" type="number" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} placeholder="Optional" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Your Name">
            <input className="input" required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="Company">
            <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Email">
            <input className="input" type="email" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </Field>
        </div>
        <Field label="Message / Specifications">
          <textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Grade, packaging, destination port, Incoterms…" />
        </Field>
        <button className="btn-gold w-full sm:w-auto" disabled={loading}>
          {loading ? "Submitting…" : "Submit RFQ"}
        </button>
      </form>
    </div>
  );
}
