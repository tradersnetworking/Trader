import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Field, Modal, Alert } from "../ui.jsx";
import { InvoicePrintView } from "./MainInvoicesPanel.jsx";

const blankLine = () => ({ description: "", qty: 1, unit: "kg", rate: 0 });

export default function MainAdminInvoicesPanel() {
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState(null);
  const [seller, setSeller] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    billToName: "",
    billToCompany: "",
    billToGst: "",
    billToAddress: "",
    billToEmail: "",
    taxPct: 0,
    notes: "",
    dueDate: "",
    items: [blankLine()],
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => mainApi("/admin/invoices").then((d) => setInvoices(d.invoices)).catch(() => {});

  useEffect(() => {
    load();
    mainApi("/admin/users").then((d) => setUsers(d.users.filter((u) => u.role === "USER"))).catch(() => {});
    mainApi("/invoices/seller").then((d) => setSeller(d.seller)).catch(() => {});
  }, []);

  const onUserPick = (userId) => {
    const u = users.find((x) => x.id === userId);
    setForm((f) => ({
      ...f,
      userId,
      billToName: u?.name || "",
      billToCompany: u?.companyName || "",
      billToGst: u?.gstNumber || "",
      billToAddress: u?.billingAddress || "",
      billToEmail: u?.email || "",
    }));
  };

  const updateLine = (i, key, val) => {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [key]: val };
      return { ...f, items };
    });
  };

  const create = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await mainApi("/admin/invoices", { method: "POST", body: { ...form, status: "ISSUED" } });
      setCreateOpen(false);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    await mainApi(`/admin/invoices/${id}`, { method: "PUT", body: { status } });
    load();
  };

  const viewInvoice = async (id) => {
    const d = await mainApi(`/invoices/${id}`);
    setView(d.invoice);
    setSeller(d.seller);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Issue and manage customer invoices.</p>
        <button type="button" className="btn-primary" onClick={() => { setErr(""); setCreateOpen(true); }}>+ Generate invoice</button>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 font-mono">{inv.invoiceNumber}</td>
                <td className="p-3">
                  <div className="font-medium">{inv.user?.name || inv.billToName}</div>
                  <div className="text-xs text-muted-foreground">{inv.billToEmail}</div>
                </td>
                <td className="p-3">{inr(inv.totalAmount)}</td>
                <td className="p-3">
                  <select className="rounded border px-1 text-xs" value={inv.status} onChange={(e) => updateStatus(inv.id, e.target.value)}>
                    {["DRAFT", "ISSUED", "PAID", "CANCELLED"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-muted-foreground">{dateStr(inv.issuedAt || inv.createdAt)}</td>
                <td className="p-3 text-right">
                  <button type="button" className="text-xs font-semibold text-primary" onClick={() => viewInvoice(inv.id)}>View</button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Generate invoice for customer" wide>
        <form className="space-y-3" onSubmit={create}>
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Customer account">
            <select className="input" required value={form.userId} onChange={(e) => onUserPick(e.target.value)}>
              <option value="">— Select user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bill to name"><input className="input" required value={form.billToName} onChange={(e) => setForm({ ...form, billToName: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" required value={form.billToEmail} onChange={(e) => setForm({ ...form, billToEmail: e.target.value })} /></Field>
          </div>
          <div className="space-y-2">
            {form.items.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input className="input col-span-5" placeholder="Description" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                <input className="input col-span-2" type="number" value={line.qty} onChange={(e) => updateLine(i, "qty", e.target.value)} />
                <input className="input col-span-2" value={line.unit} onChange={(e) => updateLine(i, "unit", e.target.value)} />
                <input className="input col-span-3" type="number" value={line.rate} onChange={(e) => updateLine(i, "rate", e.target.value)} />
              </div>
            ))}
            <button type="button" className="text-xs font-semibold text-primary" onClick={() => setForm({ ...form, items: [...form.items, blankLine()] })}>+ Add line</button>
          </div>
          <Field label="Tax %"><input className="input" type="number" value={form.taxPct} onChange={(e) => setForm({ ...form, taxPct: e.target.value })} /></Field>
          <button className="btn-gold w-full" disabled={loading}>{loading ? "Creating…" : "Issue invoice"}</button>
        </form>
      </Modal>

      {view && <InvoicePrintView invoice={view} seller={seller} onClose={() => setView(null)} />}
    </div>
  );
}
