import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Field, Modal, Alert } from "../ui.jsx";

export default function MainAdminOrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "PENDING", paymentStatus: "UNPAID" });

  const load = () => mainApi("/admin/orders").then((d) => setOrders(d.orders)).catch(() => {});

  useEffect(() => { load(); }, []);

  const open = (o) => {
    setEditing(o);
    setForm({ status: o.status, paymentStatus: o.paymentStatus });
  };

  const save = async (e) => {
    e.preventDefault();
    await mainApi(`/admin/orders/${editing.id}`, { method: "PUT", body: form });
    setEditing(null);
    load();
  };

  return (
    <div className="app-table-wrap card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Order #</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Payment</th>
            <th className="p-3">Status</th>
            <th className="p-3">Date</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3 font-mono">{o.orderNumber}</td>
              <td className="p-3">
                <div className="font-medium">{o.user?.name || "Guest"}</div>
                <div className="text-xs text-muted-foreground">{o.user?.email}</div>
              </td>
              <td className="p-3">{inr(o.totalAmount)}</td>
              <td className="p-3">{o.paymentGateway || "—"} / {o.paymentStatus}</td>
              <td className="p-3"><Badge status={o.status} /></td>
              <td className="p-3 text-muted-foreground">{dateStr(o.createdAt)}</td>
              <td className="p-3 text-right">
                <button type="button" className="text-xs font-semibold text-primary" onClick={() => open(o)}>Update</button>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>
          )}
        </tbody>
      </table>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Update order">
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <p className="text-sm text-muted-foreground">{editing.orderNumber} • {inr(editing.totalAmount)}</p>
            <Field label="Order status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Payment status">
              <select className="input" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                {["UNPAID", "PAID", "REFUNDED", "FAILED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <button className="btn-gold w-full">Save</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
