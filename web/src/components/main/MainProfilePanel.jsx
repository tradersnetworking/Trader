import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { Field, Alert } from "../ui.jsx";

export default function MainProfilePanel() {
  const { main, refreshMain } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    accountType: "B2B",
    companyName: "",
    gstNumber: "",
    billingAddress: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!main) return;
    setForm({
      name: main.name || "",
      phone: main.phone || "",
      accountType: main.accountType || "B2B",
      companyName: main.companyName || "",
      gstNumber: main.gstNumber || "",
      billingAddress: main.billingAddress || "",
    });
  }, [main]);

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await mainApi("/auth/profile", { method: "PUT", body: form });
      await refreshMain();
      setMsg("Profile updated. Invoice and RFQ forms will use these details.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-xl p-6">
      <h3 className="mb-1 text-lg font-bold">Company & billing profile</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Used on quotes, invoices, and trade documents. Login email and password are managed under Account Security.
      </p>
      <form onSubmit={save} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Full name">
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Account type">
          <select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
            <option value="B2B">B2B (Business)</option>
            <option value="B2C">B2C (Individual)</option>
          </select>
        </Field>
        <Field label="Company name">
          <input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </Field>
        <Field label="GST / Tax ID">
          <input className="input" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Billing address">
          <textarea className="input" rows={3} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} placeholder="Street, city, state, PIN" />
        </Field>
        <button className="btn-gold" disabled={loading}>{loading ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  );
}
