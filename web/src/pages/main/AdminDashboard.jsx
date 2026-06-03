import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { Stat, Badge, Modal, Field, Alert, PasswordInput } from "../../components/ui.jsx";
import PaymentGatewaysPanel from "../../components/PaymentGatewaysPanel.jsx";
import MainDashboardShell from "../../components/main/MainDashboardShell.jsx";
import MainAdminOrdersPanel from "../../components/main/MainAdminOrdersPanel.jsx";
import MainAdminInvoicesPanel from "../../components/main/MainAdminInvoicesPanel.jsx";
import { DashboardTabFallback } from "../../components/invest/DashboardTabFallback.jsx";
import { getMainAdminNav, mainNavLabel, MAIN_ADMIN_MOBILE_PRIMARY } from "../../lib/main-nav.js";
import AccountSecurityPanel from "../../components/shared/AccountSecurityPanel.jsx";
import DataPortabilityPanel from "../../components/shared/DataPortabilityPanel.jsx";
import MainSiteSettingsPanel from "../../components/main/MainSiteSettingsPanel.jsx";
import MainCommunicationPanel from "../../components/main/MainCommunicationPanel.jsx";
import MainTradeKycAdminPanel from "../../components/main/MainTradeKycAdminPanel.jsx";
import KycDocumentViewer from "../../components/shared/KycDocumentViewer.jsx";
import MainTradePaymentsPanel from "../../components/main/MainTradePaymentsPanel.jsx";

export default function AdminDashboard() {
  const { main, logoutMain } = useAuth();
  const isSuper = main?.role === "SUPERADMIN";
  const canViewMail = isSuper || main?.role === "ADMIN";
  const navItems = useMemo(() => getMainAdminNav(isSuper, main?.role), [isSuper, main?.role]);
  const tabIds = useMemo(() => navItems.filter((n) => n.id).map((n) => n.id), [navItems]);

  const [sp, setSp] = useSearchParams();
  const tab = tabIds.includes(sp.get("tab")) ? sp.get("tab") : "overview";
  const setTab = (id) => setSp({ tab: id });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <MainDashboardShell
      user={main}
      mode="admin"
      navItems={navItems}
      activeTab={tab}
      onTabChange={setTab}
      pageTitle={mainNavLabel(navItems, tab)}
      pageSubtitle={`${isSuper ? "Super Admin" : main?.role === "STAFF" ? "Staff" : "Admin"} • akshayaexim.com`}
      mobilePrimaryIds={MAIN_ADMIN_MOBILE_PRIMARY}
      onLogout={logoutMain}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      {tab === "overview" && <Overview isSuper={isSuper} key={refreshKey} />}
      {tab === "products" && <ProductsAdmin key={refreshKey} />}
      {tab === "categories" && <CategoriesAdmin key={refreshKey} />}
      {tab === "quotes" && <QuotesAdmin key={refreshKey} />}
      {tab === "orders" && <MainAdminOrdersPanel key={refreshKey} />}
      {tab === "invoices" && <MainAdminInvoicesPanel key={refreshKey} />}
      {tab === "users" && <UsersAdmin isSuper={isSuper} key={refreshKey} />}
      {tab === "gateways" && (
        <PaymentGatewaysPanel
          key={refreshKey}
          fetchGateways={() => mainApi("/admin/gateways")}
          editable={isSuper}
          loadSettings={isSuper ? () => mainApi("/admin/settings") : undefined}
          saveSettings={isSuper ? (body) => mainApi("/admin/settings", { method: "PUT", body }) : undefined}
        />
      )}
      {tab === "staff" && isSuper && <StaffAdmin key={refreshKey} />}
      {tab === "site-settings" && isSuper && <MainSiteSettingsPanel key={refreshKey} />}
      {tab === "communication" && canViewMail && <MainCommunicationPanel readOnly={!isSuper} key={refreshKey} />}
      {tab === "trade-kyc" && <MainTradeKycAdminPanel key={refreshKey} />}
      {tab === "trade-payments" && isSuper && <MainTradePaymentsPanel key={refreshKey} />}
      {tab === "backup" && (
        <DataPortabilityPanel portal="main" canImport={isSuper} key={refreshKey} />
      )}
      {tab === "account" && <AccountSecurityPanel portal="main" key={refreshKey} />}
      {!tabIds.includes(tab) && (
        <DashboardTabFallback title="Section unavailable" onGoOverview={() => setTab("overview")} />
      )}
    </MainDashboardShell>
  );
}

function Overview({ isSuper }) {
  const [s, setS] = useState(null);
  const [site, setSite] = useState(null);
  useEffect(() => {
    mainApi("/admin/stats").then((d) => setS(d.stats)).catch(() => {});
    if (isSuper) mainApi("/admin/site-stats").then(setSite).catch(() => {});
  }, [isSuper]);
  if (!s) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="page-stack">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Users" value={s.users} accent="blue" />
        <Stat label="Products" value={s.products} accent="emerald" />
        <Stat label="Quotes" value={s.quotes} accent="violet" />
        <Stat label="Open RFQs" value={s.openQuotes} accent="gold" />
        <Stat label="Orders" value={s.orders} accent="cyan" />
        <Stat label="Invoices" value={s.invoices ?? 0} accent="indigo" />
      </div>

      {isSuper && site && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="New users (30d)" value={site.marketplace?.newUsers30d ?? 0} accent="blue" />
            <Stat label="New RFQs (30d)" value={site.marketplace?.newQuotes30d ?? 0} accent="cyan" />
            <Stat label="Google login" value={site.integrations?.googleLogin?.configured && site.integrations?.googleLogin?.enabled ? "On" : "Off"} accent={site.integrations?.googleLogin?.enabled ? "emerald" : "gold"} />
            <Stat label="GA4 tracking" value={site.integrations?.ga4?.configured ? "Active" : "Not set"} accent={site.integrations?.ga4?.configured ? "emerald" : "gold"} />
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold">Integration status</h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <IntegrationRow label="Search Console verification" ok={site.integrations?.searchConsole?.configured} />
              <IntegrationRow label="Bing Webmaster verification" ok={site.integrations?.bing?.configured} />
              <IntegrationRow label="Sitemap submitted" ok={Boolean(site.integrations?.lastSitemapPing)} detail={site.integrations?.lastSitemapPing ? new Date(site.integrations.lastSitemapPing).toLocaleString() : "Use Site & SEO tab to submit"} />
              <IntegrationRow label="Search indexing allowed" ok={site.integrations?.robotsAllowIndex !== false} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Configure Google login, SEO, analytics and search engines under <strong>Site & SEO</strong> in the sidebar.
            </p>
          </div>

          {site.recentUsers?.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="border-b border-border p-3 text-sm font-bold">Recent sign-ups</h3>
              <table className="w-full text-sm">
                <tbody>
                  {site.recentUsers.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3"><Badge status={u.role} /></td>
                      <td className="p-3 text-xs text-muted-foreground">{dateStr(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IntegrationRow({ label, ok, detail }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
      <span>{label}</span>
      <span className={`text-xs font-semibold ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
        {detail || (ok ? "✓ Connected" : "Setup needed")}
      </span>
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
            <div className="flex items-center justify-between"><h3 className="font-bold">{c.name}</h3><button onClick={() => del(c.id)} className="text-xs text-red-500">Delete</button></div>
            <div className="mt-2 flex flex-wrap gap-1">{(c.children || []).map((s) => <span key={s.id} className="badge bg-muted text-muted-foreground">{s.name}</span>)}</div>
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
  const backfillPrices = async () => {
    if (!confirm("Refresh indicative prices for the full catalog?")) return;
    try {
      const res = await mainApi("/products/backfill-prices", {
        method: "POST",
        body: { refreshAll: true },
      });
      alert(res.message || "Prices updated");
      load();
    } catch (e2) {
      alert(e2.message);
    }
  };

  const syncImages = async (mode = "marketplace") => {
    const msg =
      mode === "marketplace"
        ? "Run one IndiaMART/TradeIndia sync batch now? (requires Google CSE keys on server)"
        : "Apply curated category images to all products?";
    if (!confirm(msg)) return;
    try {
      const res = await mainApi("/products/sync-images", { method: "POST", body: { mode } });
      alert(res.message || "Images synced");
      load();
    } catch (e2) {
      alert(e2.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={openNew} className="btn-primary">+ Add Product</button>
        <button type="button" onClick={backfillPrices} className="btn-outline">
          Refresh catalog prices
        </button>
        <button type="button" onClick={() => syncImages("marketplace")} className="btn-outline">
          Sync from IndiaMART / TradeIndia
        </button>
        <button type="button" onClick={() => syncImages("curate")} className="btn-outline">
          Apply category images
        </button>
      </div>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Price</th><th className="p-3">Min Qty</th><th className="p-3"></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}<div className="text-xs text-muted-foreground">{p.category?.name}</div></td>
                <td className="p-3"><span className={`badge ${p.listingType === "EXPORT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{p.listingType}</span></td>
                <td className="p-3">{inr(p.basePrice)}/{p.unit}</td>
                <td className="p-3">{p.minOrderQty}</td>
                <td className="p-3 text-right"><button onClick={() => openEdit(p)} className="text-xs font-semibold text-primary">Edit</button> <button onClick={() => del(p.id)} className="ml-2 text-xs text-red-500">Delete</button></td>
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
            <Field label="Base Price (₹)"><input className="input" type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="Leave 0 for auto indicative price" /></Field>
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
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Product</th><th className="p-3">Dir</th><th className="p-3">Qty</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="border-t">
              <td className="p-3 font-medium">{q.productName}</td>
              <td className="p-3">{q.direction === "SELL" ? "Supply" : "Buy"}</td>
              <td className="p-3">{q.quantity} {q.unit}</td>
              <td className="p-3 text-xs">{q.contactName}<div className="text-muted-foreground">{q.contactEmail}</div></td>
              <td className="p-3"><Badge status={q.status} /></td>
              <td className="p-3 text-right"><button onClick={() => open(q)} className="text-xs font-semibold text-primary">Respond</button></td>
            </tr>
          ))}
          {quotes.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No quotes.</td></tr>}
        </tbody>
      </table>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Respond to Quote">
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <p className="text-sm text-muted-foreground">{editing.productName} • {editing.quantity} {editing.unit} • {editing.contactEmail}</p>
            {editing.message && <p className="rounded bg-muted/50 p-2 text-sm">{editing.message}</p>}
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
      <KycDocumentViewer
        open={Boolean(viewKyc)}
        kyc={viewKyc}
        onClose={() => setViewKyc(null)}
        scope="main"
        title={viewKyc ? `Trade KYC — ${viewKyc.fullName || viewKyc.user?.name || "User"}` : ""}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Manage buyer/seller accounts. Super Admin can change roles.</p>
        <button onClick={() => { setCreateOpen(true); setErr(""); setMsg(""); }} className="btn-primary">+ Create User</button>
      </div>
      {msg && <div className="mb-3"><Alert type="success">{msg}</Alert></div>}
      <div className="overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Type</th><th className="p-3">Role</th><th className="p-3">Active</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3 font-medium">{u.name}</td>
              <td className="p-3 text-muted-foreground">{u.email}</td>
              <td className="p-3">{u.accountType}</td>
              <td className="p-3">{isSuper ? (
                <select className="input min-w-[8rem] py-1 text-xs" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>{["USER", "STAFF", "ADMIN", "SUPERADMIN"].map((r) => <option key={r} value={r}>{r}</option>)}</select>
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
          <Field label="Password"><PasswordInput required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Account Type"><select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}><option value="B2B">B2B</option><option value="B2C">B2C</option></select></Field>
          <Field label="Company Name (optional)"><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
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
      <h3 className="mb-3 font-bold">Create Staff / Admin Account</h3>
      <p className="mb-3 text-xs text-muted-foreground">Super Admin only. Cannot create Super Admin accounts from here.</p>
      <form onSubmit={save} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><PasswordInput required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></Field>
        <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select></Field>
        <button className="btn-gold w-full">Create</button>
      </form>
    </div>
  );
}
