import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Field, Alert, Modal } from "../ui.jsx";

const blankLine = () => ({ description: "", qty: 1, unit: "kg", rate: 0 });

function InvoicePrintView({ invoice, seller, onClose }) {
  if (!invoice) return null;
  const items = invoice.items || [];

  const print = () => window.print();

  return (
    <Modal open onClose={onClose} title={`Invoice ${invoice.invoiceNumber}`} wide>
      <div id="invoice-print" className="space-y-4 text-sm">
        <div className="flex flex-wrap justify-between gap-4 border-b pb-4">
          <div>
            <div className="text-lg font-bold text-primary">{seller?.name || "Akshaya Exim Traders"}</div>
            <div className="text-muted-foreground">{seller?.address}</div>
            {seller?.gst && <div className="text-xs">GST: {seller.gst}</div>}
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold">{invoice.invoiceNumber}</div>
            <Badge status={invoice.status} />
            <div className="mt-1 text-muted-foreground">Date: {dateStr(invoice.issuedAt || invoice.createdAt)}</div>
            {invoice.dueDate && <div className="text-muted-foreground">Due: {dateStr(invoice.dueDate)}</div>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs font-bold uppercase text-muted-foreground">Bill to</div>
            <div className="font-semibold">{invoice.billToName}</div>
            {invoice.billToCompany && <div>{invoice.billToCompany}</div>}
            {invoice.billToGst && <div className="text-xs">GST: {invoice.billToGst}</div>}
            {invoice.billToAddress && <div className="text-xs text-muted-foreground">{invoice.billToAddress}</div>}
            <div className="text-xs">{invoice.billToEmail}</div>
          </div>
          {seller?.bank && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs">
              <div className="font-bold uppercase text-muted-foreground">Bank details</div>
              <div>{seller.bank.accountName}</div>
              <div>A/C: {seller.bank.accountNumber}</div>
              <div>IFSC: {seller.bank.ifsc}</div>
              {seller.bank.swift && <div>SWIFT: {seller.bank.swift}</div>}
            </div>
          )}
        </div>
        <div className="app-table-wrap">
        <table className="w-full border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-right">Qty</th>
              <th className="border p-2 text-right">Rate</th>
              <th className="border p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="border p-2">{it.description}</td>
                <td className="border p-2 text-right">{it.qty} {it.unit || ""}</td>
                <td className="border p-2 text-right">{inr(it.rate)}</td>
                <td className="border p-2 text-right">{inr(it.amount ?? it.qty * it.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex justify-end">
          <div className="w-48 space-y-1 text-right">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(invoice.subtotal)}</span></div>
            {invoice.taxPct > 0 && (
              <div className="flex justify-between"><span>Tax ({invoice.taxPct}%)</span><span>{inr(invoice.taxAmount)}</span></div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{inr(invoice.totalAmount)}</span></div>
          </div>
        </div>
        {invoice.notes && <p className="text-xs text-muted-foreground">Notes: {invoice.notes}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <button type="button" className="btn-gold" onClick={print}>Print / Save PDF</button>
        <button type="button" className="btn-outline" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

export default function MainInvoicesPanel({ initialViewId, onViewed }) {
  const { main } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState(null);
  const [seller, setSeller] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
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

  const load = () => mainApi("/invoices/mine").then((d) => setInvoices(d.invoices)).catch(() => {});

  useEffect(() => {
    load();
    mainApi("/invoices/seller").then((d) => setSeller(d.seller)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!main) return;
    setForm((f) => ({
      ...f,
      billToName: main.name || "",
      billToCompany: main.companyName || "",
      billToGst: main.gstNumber || "",
      billToAddress: main.billingAddress || "",
      billToEmail: main.email || "",
    }));
  }, [main]);

  useEffect(() => {
    if (!initialViewId) return;
    mainApi(`/invoices/${initialViewId}`)
      .then((d) => { setView(d.invoice); setSeller(d.seller); onViewed?.(); })
      .catch(() => onViewed?.());
  }, [initialViewId, onViewed]);

  const openCreate = () => {
    setErr("");
    setCreateOpen(true);
  };

  const updateLine = (i, key, val) => {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [key]: val };
      return { ...f, items };
    });
  };

  const create = async (e, issue = false) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const d = await mainApi("/invoices", { method: "POST", body: { ...form, status: issue ? "ISSUED" : "DRAFT" } });
      setCreateOpen(false);
      await load();
      setView(d.invoice);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (id) => {
    const d = await mainApi(`/invoices/${id}`);
    setView(d.invoice);
    setSeller(d.seller);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Create proforma or tax invoices for your trade transactions.</p>
        <button type="button" className="btn-primary" onClick={openCreate}>+ New invoice</button>
      </div>

      <div className="app-table-wrap card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Invoice #</th>
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
                <td className="p-3">{inr(inv.totalAmount)}</td>
                <td className="p-3"><Badge status={inv.status} /></td>
                <td className="p-3 text-muted-foreground">{dateStr(inv.issuedAt || inv.createdAt)}</td>
                <td className="p-3 text-right">
                  <button type="button" className="text-xs font-semibold text-primary" onClick={() => viewInvoice(inv.id)}>View / Print</button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="5" className="p-6 text-center text-muted-foreground">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create invoice" wide>
        <form className="space-y-3" onSubmit={(e) => create(e, true)}>
          {err && <Alert type="error">{err}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bill to name"><input className="input" required value={form.billToName} onChange={(e) => setForm({ ...form, billToName: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" required value={form.billToEmail} onChange={(e) => setForm({ ...form, billToEmail: e.target.value })} /></Field>
            <Field label="Company"><input className="input" value={form.billToCompany} onChange={(e) => setForm({ ...form, billToCompany: e.target.value })} /></Field>
            <Field label="GST"><input className="input" value={form.billToGst} onChange={(e) => setForm({ ...form, billToGst: e.target.value })} /></Field>
          </div>
          <Field label="Billing address"><textarea className="input" rows={2} value={form.billToAddress} onChange={(e) => setForm({ ...form, billToAddress: e.target.value })} /></Field>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase text-muted-foreground">Line items</div>
            {form.items.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input className="input col-span-5" placeholder="Description" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                <input className="input col-span-2" type="number" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(i, "qty", e.target.value)} />
                <input className="input col-span-2" placeholder="Unit" value={line.unit} onChange={(e) => updateLine(i, "unit", e.target.value)} />
                <input className="input col-span-3" type="number" placeholder="Rate ₹" value={line.rate} onChange={(e) => updateLine(i, "rate", e.target.value)} />
              </div>
            ))}
            <button type="button" className="text-xs font-semibold text-primary" onClick={() => setForm({ ...form, items: [...form.items, blankLine()] })}>+ Add line</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tax %"><input className="input" type="number" value={form.taxPct} onChange={(e) => setForm({ ...form, taxPct: e.target.value })} /></Field>
            <Field label="Due date"><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" disabled={loading} onClick={(e) => create(e, false)}>Save draft</button>
            <button type="submit" className="btn-gold" disabled={loading}>{loading ? "Creating…" : "Issue invoice"}</button>
          </div>
        </form>
      </Modal>

      {view && <InvoicePrintView invoice={view} seller={seller} onClose={() => setView(null)} />}
    </div>
  );
}

export { InvoicePrintView };
