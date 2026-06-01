import { useState } from "react";
import { investApi } from "../../lib/api.js";
import { Field, Alert } from "../ui.jsx";

export default function AdminStaffPanel() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await investApi("/admin/staff", { method: "POST", body: form });
      setMsg(`Created ${form.email}`);
      setForm({ name: "", email: "", password: "", role: "ADMIN" });
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div className="max-w-md card p-6">
      <h3 className="mb-3 font-bold text-navy">Create Admin Account</h3>
      <p className="mb-3 text-xs text-slate-400">Super Admin only. Creates portal ADMIN accounts for managing deposits, KYC and payouts.</p>
      <form onSubmit={save} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <button className="btn-gold w-full">Create Admin</button>
      </form>
    </div>
  );
}
