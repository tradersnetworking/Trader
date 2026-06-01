import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { Stat, Badge, Modal, Field, Alert } from "../../components/ui.jsx";
import PaymentGatewaysPanel from "../../components/PaymentGatewaysPanel.jsx";

export default function AdminDashboard() {
  const { main } = useAuth();
  const isSuper = main?.role === "SUPERADMIN";
  const [tab, setTab] = useState("overview");
  const tabs = [["overview", "Overview"], ["products", "Products"], ["categories", "Categories"], ["quotes", "Quotes / RFQ"], ["users", "Users"], ["gateways", "Payment Gateways"]];
  if (isSuper) tabs.push(["staff", "Staff & Roles"]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{isSuper ? "Super Admin" : "Admin"} • Marketplace</h1>
          <p className="text-sm text-slate-500">akshayaexim.com / .in control panel</p>
        </div>
        <Badge status={main?.role} />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold ${tab === id ? "border-b-2 border-navy text-navy" : "text-slate-400"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "products" && <ProductsAdmin />}
        {tab === "categories" && <CategoriesAdmin />}
        {tab === "quotes" && <QuotesAdmin />}
        {tab === "users" && <UsersAdmin isSuper={isSuper} />}
        {tab === "gateways" && <PaymentGatewaysPanel fetchGateways={() => mainApi("/admin/gateways")} />}
        {tab === "staff" && isSuper && <StaffAdmin />}
      </div>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { mainApi("/admin/stats").then((d) => setS(d.stats)).catch(() => {}); }, []);
  if (!s) return <p className="text-slate-400">Loading…</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Users" value={s.users} accent="blue" />
      <Stat label="Products" value={s.products} accent="emerald" />
      <Stat label="Quotes" value={s.quotes} accent="violet" />
      <Stat label="Open RFQs" value={s.openQuotes} accent="gold" />
      <Stat label="Orders" value={s.orders} accent="cyan" />
    </div>
  );
}

function CategoriesAdmin() {
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", parentId: "" });
  const [err, setErr] = useState("");
  const load = () => mainApi("/categories").then((d) => setCats(d.categories)).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async (e) => { e.preventDefault(); setErr(""); try { await mainApi("/categories", { method: "POST", body: form }); setOpen(false); setForm({ name: "", parentId: "" }); load(); } catch (e2) { setErr(e2.message); } };
  const del = async (id) => { if (confirm("Delete category?")) { await mainApi(`/categories/${id}`, { method: "DELETE" }); load(); } };
  return (
    <div>
      <button onClick={() => setOpen(true)} className="btn-primary mb-4">+ Add Category</button>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-navy">{c.name}</h3><button onClick={() => del(c.id)} className="text-xs text-red-500">Delete</button></div>
            <div className="mt-2 flex flex-wrap gap-1">{(c.children || []).map((s) => <span key={s.id} className="badge bg-slate-100 text-slate-600">{s.name}</span>)}</div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Category">
        <form onSubmit={save} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Parent (optional)">
            <select className="input" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">— Top level —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <button className="btn-gold w-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}

function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { name: "", listingType: "EXPORT", tradeType: "BOTH", unit: "kg", minOrderQty: 1, basePrice: 0, origin: "", categoryId: "", description: "" };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");

  const load = () => mainApi("/products?take=200").then((d) => setProducts(d.products)).catch(() => {});
  useEffect(() => { load(); mainApi("/categories").then((d) => setCats(d.categories)); }, []);
  const subcats = cats.flatMap((c) => (c.children || []).map((s) => ({ ...s, parent: c.name })));

  const openNew = () => { setEditing(null); setForm(blank); setErr(""); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, categoryId: p.categoryId || "" }); setErr(""); setOpen(true); };
  const save = async (e) => {
    e.preventDefault(); setErr("");
    try {
      if (editing) await mainApi(`/products/${editing.id}`, { method: "PUT", body: form });
      else await mainApi("/products", { method: "POST", body: form });
      setOpen(false); load();
    } catch (e2) { setErr(e2.message); }
  };
  const del = async (id) => { if (confirm("Delete product?")) { await mainApi(`/products/${id}`, { method: "DELETE" }); load(); } };

  return (
    <div>
      <button onClick={openNew} className="btn-primary mb-4">+ Add Product</button>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Price</th><th className="p-3">Min Qty</th><th className="p-3"></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium text-navy">{p.name}<div className="text-xs text-slate-400">{p.category?.name}</div></td>
                <td className="p-3"><span className={`badge ${p.listingType === "EXPORT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{p.listingType}</span></td>
                <td className="p-3">{inr(p.basePrice)}/{p.unit}</td>
                <td className="p-3">{p.minOrderQty}</td>
                <td className="p-3 text-right"><button onClick={() => openEdit(p)} className="text-xs font-semibold text-navy">Edit</button> <button onClick={() => del(p.id)} className="ml-2 text-xs text-red-500">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Product" : "Add Product"} wide>
        <form onSubmit={save} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Listing Type"><select className="input" value={form.listingType} onChange={(e) => setForm({ ...form, listingType: e.target.value })}><option value="EXPORT">Available to Export</option><option value="IMPORT">Import Requirement</option></select></Field>
            <Field label="Trade Type"><select className="input" value={form.tradeType} onChange={(e) => setForm({ ...form, tradeType: e.target.value })}><option>BOTH</option><option>B2B</option><option>B2C</option></select></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit"><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="Min Order Qty"><input className="input" type="number" value={form.minOrderQty} onChange={(e) => setForm({ ...form, minOrderQty: e.target.value })} /></Field>
            <Field label="Base Price (₹)"><input className="input" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin"><input className="input" value={form.origin || ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field>
            <Field label="Category"><select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">—</option>{subcats.map((s) => <option key={s.id} value={s.id}>{s.parent} › {s.name}</option>)}</select></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button className="btn-gold w-full">{editing ? "Update" : "Create"}</button>
        </form>
      </Modal>
    </div>
  );
}

function QuotesAdmin() {
  const [quotes, setQuotes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "RESPONDED", quotedPrice: "", adminResponse: "" });
  const load = () => mainApi("/quotes").then((d) => setQuotes(d.quotes)).catch(() => {});
  useEffect(() => { load(); }, []);
  const open = (q) => { setEditing(q); setForm({ status: q.status, quotedPrice: q.quotedPrice || "", adminResponse: q.adminResponse || "" }); };
  const save = async (e) => { e.preventDefault(); await mainApi(`/quotes/${editing.id}`, { method: "PUT", body: form }); setEditing(null); load(); };
  return (
    <div className="overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Product</th><th className="p-3">Dir</th><th className="p-3">Qty</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="border-t">
              <td className="p-3 font-medium text-navy">{q.productName}</td>
              <td className="p-3">{q.direction === "SELL" ? "Supply" : "Buy"}</td>
              <td className="p-3">{q.quantity} {q.unit}</td>
              <td className="p-3 text-xs">{q.contactName}<div className="text-slate-400">{q.contactEmail}</div></td>
              <td className="p-3"><Badge status={q.status} /></td>
              <td className="p-3 text-right"><button onClick={() => open(q)} className="text-xs font-semibold text-navy">Respond</button></td>
            </tr>
          ))}
          {quotes.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No quotes.</td></tr>}
        </tbody>
      </table>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Respond to Quote">
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <p className="text-sm text-slate-500">{editing.productName} • {editing.quantity} {editing.unit} • {editing.contactEmail}</p>
            {editing.message && <p className="rounded bg-slate-50 p-2 text-sm">{editing.message}</p>}
            <Field label="Status"><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["PENDING", "RESPONDED", "ACCEPTED", "REJECTED", "CLOSED"].map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Quoted Price (₹)"><input className="input" type="number" value={form.quotedPrice} onChange={(e) => setForm({ ...form, quotedPrice: e.target.value })} /></Field>
            <Field label="Response"><textarea className="input" rows={3} value={form.adminResponse} onChange={(e) => setForm({ ...form, adminResponse: e.target.value })} /></Field>
            <button className="btn-gold w-full">Save</button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function UsersAdmin({ isSuper }) {
  const [users, setUsers] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", accountType: "B2B", companyName: "" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const load = () => mainApi("/admin/users").then((d) => setUsers(d.users)).catch(() => {});
  useEffect(() => { load(); }, []);
  const update = async (id, body) => { await mainApi(`/admin/users/${id}`, { method: "PUT", body }); load(); };
  const createUser = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    try {
      await mainApi("/admin/users", { method: "POST", body: form });
      setMsg(`Created user ${form.email}`);
      setForm({ name: "", email: "", password: "", accountType: "B2B", companyName: "" });
      setCreateOpen(false);
      load();
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">Admins can create buyer/seller accounts. Staff and Admin roles are managed by Super Admin only.</p>
        <button onClick={() => { setCreateOpen(true); setErr(""); setMsg(""); }} className="btn-primary">+ Create User</button>
      </div>
      {msg && <div className="mb-3"><Alert type="success">{msg}</Alert></div>}
      <div className="overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Type</th><th className="p-3">Role</th><th className="p-3">Active</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3 font-medium text-navy">{u.name}</td>
              <td className="p-3 text-slate-500">{u.email}</td>
              <td className="p-3">{u.accountType}</td>
              <td className="p-3">{isSuper ? (
                <select className="rounded border px-1 text-xs" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>{["USER", "STAFF", "ADMIN", "SUPERADMIN"].map((r) => <option key={r}>{r}</option>)}</select>
              ) : <Badge status={u.role} />}</td>
              <td className="p-3">{isSuper ? <input type="checkbox" checked={u.isActive} onChange={(e) => update(u.id, { isActive: e.target.checked })} /> : (u.isActive ? "Yes" : "No")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User Account">
        <form onSubmit={createUser} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Password"><input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Account Type"><select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}><option value="B2B">B2B</option><option value="B2C">B2C</option></select></Field>
          <Field label="Company Name (optional)"><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          <p className="text-xs text-slate-400">Creates a USER account. Admins cannot create Staff, Admin or Super Admin accounts.</p>
          <button className="btn-gold w-full">Create User</button>
        </form>
      </Modal>
    </div>
  );
}

function StaffAdmin() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const save = async (e) => { e.preventDefault(); setErr(""); setMsg(""); try { await mainApi("/admin/staff", { method: "POST", body: form }); setMsg(`Created ${form.email}`); setForm({ name: "", email: "", password: "", role: "STAFF" }); } catch (e2) { setErr(e2.message); } };
  return (
    <div className="max-w-md card p-6">
      <h3 className="mb-3 font-bold text-navy">Create Staff / Admin Account</h3>
      <p className="mb-3 text-xs text-slate-400">Super Admin only. Cannot create Super Admin accounts from here.</p>
      <form onSubmit={save} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select></Field>
        <button className="btn-gold w-full">Create</button>
      </form>
    </div>
  );
}
