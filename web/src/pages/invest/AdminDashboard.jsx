import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { Stat, Badge, Modal, Field, Alert } from "../../components/ui.jsx";

export default function InvestAdminDashboard() {
  const { invest } = useAuth();
  const isSuper = invest?.role === "SUPERADMIN";
  const [tab, setTab] = useState("overview");
  const tabs = [["overview", "Overview"], ["plans", "Investment Plans"], ["deposits", "Deposits"], ["kyc", "KYC"], ["payouts", "Payouts"], ["investors", "Investors"]];
  if (isSuper) tabs.push(["staff", "Admins"]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{isSuper ? "Super Admin" : "Admin"} • Invest Portal</h1>
          <p className="text-sm text-slate-500">invest.akshayaexim.com / .in control panel</p>
        </div>
        <Badge status={invest?.role} />
      </div>
      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold ${tab === id ? "border-b-2 border-navy text-navy" : "text-slate-400"}`}>{label}</button>)}
      </div>
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "plans" && <PlansAdmin isSuper={isSuper} />}
        {tab === "deposits" && <DepositsAdmin />}
        {tab === "kyc" && <KycAdmin />}
        {tab === "payouts" && <PayoutsAdmin />}
        {tab === "investors" && <Investors />}
        {tab === "staff" && isSuper && <StaffAdmin />}
      </div>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { investApi("/admin/stats").then((d) => setS(d.stats)).catch(() => {}); }, []);
  if (!s) return <p className="text-slate-400">Loading…</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Investors" value={s.investors} accent="blue" />
      <Stat label="Total Invested" value={inr(s.totalInvested)} accent="gold" />
      <Stat label="Active Subscriptions" value={s.activeSubs} accent="emerald" />
      <Stat label="Plans" value={s.plans} accent="violet" />
      <Stat label="Pending KYC" value={s.pendingKyc} accent="cyan" />
      <Stat label="Pending Deposits" value={s.pendingDeposits} accent="pink" />
      <Stat label="Pending Payouts" value={s.pendingPayouts} accent="gold" />
    </div>
  );
}

const PLAN_TYPES = ["STARTER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

function PlansAdmin({ isSuper }) {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { planType: "STARTER", name: "", lockInDays: 30, minInvestment: 10000, maxInvestment: 5000000, monthlyRoiPct: 10, profitSharePct: 10, settlementCycles: "MONTHLY", color: "#2e7d32", description: "", isActive: true };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");

  const load = () => investApi("/admin/plans").then((d) => setPlans(d.plans)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(blank); setErr(""); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setErr(""); setOpen(true); };
  const save = async (e) => {
    e.preventDefault(); setErr("");
    const body = { ...form, lockInDays: Number(form.lockInDays), monthlyRoiPct: Number(form.monthlyRoiPct), profitSharePct: Number(form.profitSharePct) };
    try {
      if (editing) await investApi(`/admin/plans/${editing.id}`, { method: "PUT", body });
      else await investApi("/admin/plans", { method: "POST", body });
      setOpen(false); load();
    } catch (e2) { setErr(e2.message); }
  };
  const del = async (id) => { if (confirm("Delete plan?")) { await investApi(`/admin/plans/${id}`, { method: "DELETE" }); load(); } };

  return (
    <div>
      {isSuper ? <button onClick={openNew} className="btn-primary mb-4">+ Create Plan</button> : <Alert type="info">Only Super Admin can create, edit or delete plans.</Alert>}
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <div className="px-4 py-3 text-white" style={{ background: p.color }}>
              <div className="flex justify-between"><b>{p.name}</b><span className="badge bg-white/20 text-white">{p.planType}</span></div>
            </div>
            <div className="space-y-1 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Lock-in</span><b>{p.lockInDays} days</b></div>
              <div className="flex justify-between"><span className="text-slate-400">Monthly / Annual ROI</span><b>{p.monthlyRoiPct}% / {p.annualRoiPct}%</b></div>
              <div className="flex justify-between"><span className="text-slate-400">Min / Max</span><b>{inr(p.minInvestment)} – {inr(p.maxInvestment)}</b></div>
              <div className="flex justify-between"><span className="text-slate-400">Active</span><Badge status={p.isActive ? "ACTIVE" : "REJECTED"} /></div>
              {isSuper && <div className="flex gap-2 pt-2"><button onClick={() => openEdit(p)} className="btn-outline flex-1 text-xs">Edit</button><button onClick={() => del(p.id)} className="btn-outline flex-1 text-xs text-red-500">Delete</button></div>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Plan" : "Create Investment Plan"} wide>
        <form onSubmit={save} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan Type (dropdown)"><select className="input" value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value, name: form.name || `${e.target.value} Plan` })}>{PLAN_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Plan Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lock-in Period (days, multiple of 30)"><input className="input" type="number" step="30" min="30" value={form.lockInDays} onChange={(e) => setForm({ ...form, lockInDays: e.target.value })} /></Field>
            <Field label="Profit Share % / month (= Monthly ROI)"><input className="input" type="number" step="0.1" value={form.monthlyRoiPct} onChange={(e) => setForm({ ...form, monthlyRoiPct: e.target.value, profitSharePct: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum Investment (₹)"><input className="input" type="number" value={form.minInvestment} onChange={(e) => setForm({ ...form, minInvestment: e.target.value })} /></Field>
            <Field label="Maximum Investment (₹)"><input className="input" type="number" value={form.maxInvestment} onChange={(e) => setForm({ ...form, maxInvestment: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Settlement Cycles"><select className="input" value={form.settlementCycles} onChange={(e) => setForm({ ...form, settlementCycles: e.target.value })}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="WEEKLY,MONTHLY">Weekly & Monthly</option></select></Field>
            <Field label="Card Color"><input className="input h-10" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (shown to investors)</label>
          <p className="text-xs text-slate-400">Annual ROI auto-calculated as monthly × 12 = {Number(form.monthlyRoiPct || 0) * 12}%.</p>
          <button className="btn-gold w-full">{editing ? "Update Plan" : "Create Plan"}</button>
        </form>
      </Modal>
    </div>
  );
}

function DepositsAdmin() {
  const [deposits, setDeposits] = useState([]);
  const load = () => investApi("/admin/deposits").then((d) => setDeposits(d.deposits)).catch(() => {});
  useEffect(() => { load(); }, []);
  const decide = async (id, action) => { await investApi(`/admin/deposits/${id}/${action}`, { method: "POST", body: {} }); load(); };
  return (
    <div className="overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Investor</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Ref</th><th className="p-3">Proof</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
        <tbody>
          {deposits.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="p-3">{d.investor?.name}<div className="text-xs text-slate-400">{d.investor?.email}</div></td>
              <td className="p-3 font-bold text-navy">{inr(d.amount)}</td>
              <td className="p-3">{d.method}</td>
              <td className="p-3 text-xs">{d.reference || "—"}</td>
              <td className="p-3">{d.proofImage ? <a href={d.proofImage} target="_blank" className="text-navy underline">View</a> : "—"}</td>
              <td className="p-3"><Badge status={d.status} /></td>
              <td className="p-3 text-right">{d.status === "PENDING" && <><button onClick={() => decide(d.id, "approve")} className="text-xs font-semibold text-green-600">Approve</button> <button onClick={() => decide(d.id, "reject")} className="ml-2 text-xs text-red-500">Reject</button></>}</td>
            </tr>
          ))}
          {deposits.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-slate-400">No deposits.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function KycAdmin() {
  const [items, setItems] = useState([]);
  const load = () => investApi("/admin/kyc").then((d) => setItems(d.kyc)).catch(() => {});
  useEffect(() => { load(); }, []);
  const decide = async (id, status) => { await investApi(`/admin/kyc/${id}/decision`, { method: "POST", body: { status } }); load(); };
  return (
    <div className="overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Investor</th><th className="p-3">PAN</th><th className="p-3">Docs</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
        <tbody>
          {items.map((k) => (
            <tr key={k.id} className="border-t">
              <td className="p-3">{k.fullName || k.investor?.name}<div className="text-xs text-slate-400">{k.investor?.email}</div></td>
              <td className="p-3">{k.panNumber || "—"}</td>
              <td className="p-3 space-x-2 text-xs">{k.panDocument && <a href={k.panDocument} target="_blank" className="text-navy underline">PAN</a>}{k.aadhaarDocument && <a href={k.aadhaarDocument} target="_blank" className="text-navy underline">Aadhaar</a>}{k.photo && <a href={k.photo} target="_blank" className="text-navy underline">Photo</a>}</td>
              <td className="p-3"><Badge status={k.status} /></td>
              <td className="p-3 text-right">{k.status === "PENDING" && <><button onClick={() => decide(k.id, "APPROVED")} className="text-xs font-semibold text-green-600">Approve</button> <button onClick={() => decide(k.id, "REJECTED")} className="ml-2 text-xs text-red-500">Reject</button></>}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">No KYC submissions.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function PayoutsAdmin() {
  const [payouts, setPayouts] = useState([]);
  const [gateways, setGateways] = useState([]);
  const load = () => investApi("/admin/payouts").then((d) => { setPayouts(d.payouts); setGateways(d.gateways); }).catch(() => {});
  useEffect(() => { load(); }, []);
  const release = async (id, gateway) => { await investApi(`/admin/payouts/${id}/release`, { method: "POST", body: { gateway } }); load(); };
  const reject = async (id) => { await investApi(`/admin/payouts/${id}/reject`, { method: "POST", body: {} }); load(); };
  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Release payouts via {gateways.map((g) => `${g.name}${g.configured ? "" : " (mock)"}`).join(", ")}.</p>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Investor</th><th className="p-3">Amount</th><th className="p-3">Mode</th><th className="p-3">Destination</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.investor?.name}<div className="text-xs text-slate-400">{p.investor?.email}</div></td>
                <td className="p-3 font-bold text-navy">{inr(p.amount)}</td>
                <td className="p-3">{p.mode}</td>
                <td className="p-3 text-xs">{p.destination}</td>
                <td className="p-3"><Badge status={p.status} />{p.gatewayRef && <div className="text-[10px] text-slate-400">{p.gatewayRef}</div>}</td>
                <td className="p-3 text-right">
                  {["PENDING"].includes(p.status) && (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => release(p.id, "RAZORPAYX")} className="rounded bg-navy px-2 py-1 text-xs font-semibold text-white">RazorpayX</button>
                      <button onClick={() => release(p.id, "CASHFREE")} className="rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white">Cashfree</button>
                      <button onClick={() => reject(p.id)} className="rounded px-2 py-1 text-xs text-red-500">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No payout requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Investors() {
  const [investors, setInvestors] = useState([]);
  const [credit, setCredit] = useState(null);
  const [amount, setAmount] = useState("");
  const load = () => investApi("/admin/investors").then((d) => setInvestors(d.investors)).catch(() => {});
  useEffect(() => { load(); }, []);
  const doCredit = async () => { await investApi("/admin/credit-return", { method: "POST", body: { investorId: credit.id, amount: Number(amount), note: "Return credited" } }); setCredit(null); setAmount(""); load(); };
  return (
    <div className="overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Wallet</th><th className="p-3">Invested</th><th className="p-3">KYC</th><th className="p-3"></th></tr></thead>
        <tbody>
          {investors.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="p-3 font-medium text-navy">{i.name}</td>
              <td className="p-3 text-slate-500">{i.email}</td>
              <td className="p-3">{inr(i.wallet?.available || 0)}</td>
              <td className="p-3">{inr(i.wallet?.invested || 0)}</td>
              <td className="p-3"><Badge status={i.kyc?.status || "—"} /></td>
              <td className="p-3 text-right"><button onClick={() => setCredit(i)} className="text-xs font-semibold text-gold-600">Credit Return</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={!!credit} onClose={() => setCredit(null)} title={`Credit Return • ${credit?.name}`}>
        <Field label="Amount (₹)"><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <button onClick={doCredit} className="btn-gold mt-3 w-full">Credit to Wallet</button>
      </Modal>
    </div>
  );
}

function StaffAdmin() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const save = async (e) => { e.preventDefault(); setErr(""); setMsg(""); try { await investApi("/admin/staff", { method: "POST", body: form }); setMsg(`Created ${form.email}`); setForm({ name: "", email: "", password: "", role: "ADMIN" }); } catch (e2) { setErr(e2.message); } };
  return (
    <div className="max-w-md card p-6">
      <h3 className="mb-3 font-bold text-navy">Create Admin Account</h3>
      <p className="mb-3 text-xs text-slate-400">Admins can manage deposits, KYC and release payouts. Only Super Admin manages plans & creates admins.</p>
      <form onSubmit={save} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>ADMIN</option><option>SUPERADMIN</option></select></Field>
        <button className="btn-gold w-full">Create</button>
      </form>
    </div>
  );
}
