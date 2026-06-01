import { useEffect, useMemo, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Modal, Field, Alert } from "../ui.jsx";

export default function UsersManagementPanel() {
  const [investors, setInvestors] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("INVESTOR");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [credit, setCredit] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");

  const load = () => investApi("/admin/investors").then((d) => setInvestors(d.investors || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return investors.filter((i) => {
      if (roleFilter && i.role !== roleFilter) return false;
      if (!q) return true;
      return i.name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q);
    });
  }, [investors, search, roleFilter]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const d = await investApi(`/admin/investors/${id}`);
      setDetail(d.investor);
    } catch (e) {
      setErr(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleActive = async (inv) => {
    await investApi(`/admin/investors/${inv.id}`, { method: "PATCH", body: { isActive: !inv.isActive } });
    load();
    if (detail?.id === inv.id) openDetail(inv.id);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await investApi("/admin/users", { method: "POST", body: form });
      setMsg(`Created investor ${form.email}`);
      setForm({ name: "", email: "", password: "" });
      setCreateOpen(false);
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const doCredit = async () => {
    await investApi("/admin/credit-return", { method: "POST", body: { investorId: credit.id, amount: Number(creditAmount), note: "Return credited" } });
    setCredit(null);
    setCreditAmount("");
    load();
    if (detail?.id === credit.id) openDetail(credit.id);
  };

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Users & Investors</h2>
          <p className="text-sm text-muted-foreground">Search, view details, and manage investor accounts.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setCreateOpen(true); setErr(""); setMsg(""); }}>+ Create Investor</button>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="INVESTOR">Investors</option>
          <option value="ADMIN">Admins</option>
          <option value="SUPERADMIN">Super Admins</option>
        </select>
        <button type="button" className="btn-outline text-xs" onClick={load}>Refresh</button>
      </div>

      <div className="app-table-wrap card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Wallet</th>
              <th className="p-3">Invested</th>
              <th className="p-3">KYC</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3 font-medium">{i.name}</td>
                <td className="p-3 text-muted-foreground">{i.email}</td>
                <td className="p-3"><Badge status={i.role} /></td>
                <td className="p-3">{inr(i.wallet?.available || 0)}</td>
                <td className="p-3">{inr(i.wallet?.invested || 0)}</td>
                <td className="p-3"><Badge status={i.kyc?.status || "PENDING"} /></td>
                <td className="p-3">{i.isActive ? "Active" : "Suspended"}</td>
                <td className="p-3 text-right space-x-2">
                  <button type="button" className="text-xs font-semibold text-primary" onClick={() => openDetail(i.id)}>View</button>
                  {i.role === "INVESTOR" && (
                    <>
                      <button type="button" className="text-xs font-semibold text-amber-600" onClick={() => setCredit(i)}>Credit</button>
                      <button type="button" className="text-xs font-semibold text-muted-foreground" onClick={() => toggleActive(i)}>{i.isActive ? "Suspend" : "Activate"}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail || detailLoading} onClose={() => setDetail(null)} title={detail ? `${detail.name} • ${detail.email}` : "Loading…"} wide>
        {detailLoading && !detail && <p className="text-sm text-muted-foreground">Loading…</p>}
        {detail && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <Stat label="Available" value={inr(detail.wallet?.available || 0)} />
              <Stat label="Invested" value={inr(detail.wallet?.invested || 0)} />
              <Stat label="Earnings" value={inr(detail.wallet?.earnings || 0)} />
              <Stat label="Referrals" value={detail._count?.referrals ?? 0} />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Recent Investments</h4>
              {(detail.subscriptions || []).slice(0, 5).map((s) => (
                <div key={s.id} className="flex justify-between border-b border-border py-2 text-sm">
                  <span>{s.plan?.name}</span>
                  <span>{inr(s.amount)} • <Badge status={s.status} /></span>
                </div>
              ))}
              {!detail.subscriptions?.length && <p className="text-sm text-muted-foreground">No investments.</p>}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Recent Deposits</h4>
              {(detail.deposits || []).slice(0, 5).map((d) => (
                <div key={d.id} className="flex justify-between border-b border-border py-2 text-sm">
                  <span>{d.method}</span>
                  <span>{inr(d.amount)} • {d.status}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Joined {dateStr(detail.createdAt)} • KYC {detail.kyc?.status || "PENDING"}</p>
          </div>
        )}
      </Modal>

      <Modal open={!!credit} onClose={() => setCredit(null)} title={`Credit Return • ${credit?.name}`}>
        <Field label="Amount (₹)"><input className="input" type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} /></Field>
        <button type="button" onClick={doCredit} className="btn-gold mt-3 w-full">Credit to Wallet</button>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Investor Account">
        <form onSubmit={createUser} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Password"><input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <button className="btn-gold w-full">Create Investor</button>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
