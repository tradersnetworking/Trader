import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert, Badge, Field, Modal } from "../ui.jsx";

export function PromoCodesAdmin() {
  const [promos, setPromos] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", bonusPct: 5, bonusFlat: 0, minAmount: 1000, appliesTo: "DEPOSIT", maxUses: 100 });
  const load = () => investApi("/admin/promo-codes").then((d) => setPromos(d.promos || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await investApi("/admin/promo-codes", { method: "POST", body: form });
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>+ Create Promo Code</button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex justify-between"><b className="font-mono">{p.code}</b><Badge status={p.isActive ? "ACTIVE" : "REJECTED"} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{p.description || p.appliesTo}</p>
            <p className="mt-2 text-sm">+{p.bonusPct}% / {inr(p.bonusFlat)} flat · used {p.usedCount}{p.maxUses ? `/${p.maxUses}` : ""}</p>
            <button type="button" className="btn-outline mt-2 w-full text-xs" onClick={() => investApi(`/admin/promo-codes/${p.id}`, { method: "PATCH", body: { isActive: !p.isActive } }).then(load)}>
              {p.isActive ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Promo Code">
        <form onSubmit={save} className="space-y-3">
          <Field label="Code"><input className="input font-mono uppercase" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bonus %"><input className="input" type="number" value={form.bonusPct} onChange={(e) => setForm({ ...form, bonusPct: e.target.value })} /></Field>
            <Field label="Flat bonus ₹"><input className="input" type="number" value={form.bonusFlat} onChange={(e) => setForm({ ...form, bonusFlat: e.target.value })} /></Field>
          </div>
          <Field label="Applies to">
            <select className="input" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
              <option value="DEPOSIT">Deposit</option>
              <option value="INVESTMENT">Investment</option>
            </select>
          </Field>
          <button className="btn-gold w-full">Create</button>
        </form>
      </Modal>
    </div>
  );
}

export function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { investApi("/admin/audit-logs").then((d) => setLogs(d.logs || [])).catch(() => {}); }, []);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="p-3">Time</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t"><td className="p-3 text-xs">{dateStr(l.createdAt, true)}</td><td className="p-3">{l.actorName || "—"}</td><td className="p-3">{l.action}</td><td className="p-3 text-xs">{l.entity} {l.entityId?.slice(0, 8)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PartnersCmsPanel() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({ name: "", logoUrl: "", website: "", sortOrder: 0 });
  const load = () => investApi("/admin/partners").then((d) => setPartners(d.partners || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    await investApi("/admin/partners", { method: "POST", body: form });
    setForm({ name: "", logoUrl: "", website: "", sortOrder: 0 });
    load();
  };
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Partner name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Logo URL"><input className="input" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} /></Field>
        <Field label="Website"><input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <button className="btn-gold sm:col-span-2">Add Partner</button>
      </form>
      <div className="flex flex-wrap gap-3">
        {partners.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 p-3">
            {p.logoUrl && <img src={p.logoUrl} alt="" className="h-8 w-8 object-contain" />}
            <div><div className="font-semibold">{p.name}</div>{p.website && <a href={p.website} className="text-xs text-primary" target="_blank" rel="noreferrer">{p.website}</a>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BroadcastNotificationsPanel() {
  const [form, setForm] = useState({ title: "", body: "" });
  const [msg, setMsg] = useState("");
  const send = async (e) => {
    e.preventDefault();
    const r = await investApi("/admin/notifications/broadcast", { method: "POST", body: form });
    setMsg(`Sent to ${r.count} investors.`);
  };
  return (
    <form onSubmit={send} className="card max-w-lg space-y-3 p-5">
      <h3 className="font-bold">Broadcast Notification</h3>
      {msg && <Alert type="success">{msg}</Alert>}
      <Field label="Title"><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Message"><textarea className="input" rows={3} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
      <button className="btn-gold">Send to all investors</button>
    </form>
  );
}

export function SupportTicketsAdmin() {
  const [tickets, setTickets] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [reply, setReply] = useState("");
  const load = () => investApi("/admin/tickets").then((d) => setTickets(d.tickets || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const send = async (id) => {
    await investApi(`/admin/tickets/${id}/reply`, { method: "POST", body: { message: reply } });
    setReply("");
    load();
  };
  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <div key={t.id} className="card p-4">
          <button type="button" className="flex w-full justify-between text-left" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
            <div><b>{t.subject}</b><div className="text-xs text-muted-foreground">{t.investor?.name} · {t.investor?.email}</div></div>
            <Badge status={t.status === "CLOSED" ? "REJECTED" : "PENDING"} />
          </button>
          {expanded === t.id && (
            <div className="mt-3 border-t pt-3">
              <p className="text-sm">{t.message}</p>
              {(t.replies || []).map((r) => <div key={r.id} className="mt-2 rounded bg-muted/30 p-2 text-sm"><b>{r.authorName}</b>: {r.message}</div>)}
              {t.status !== "CLOSED" && (
                <div className="mt-3 flex gap-2">
                  <input className="input flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Admin reply" />
                  <button type="button" className="btn-gold text-sm" onClick={() => send(t.id)}>Reply</button>
                  <button type="button" className="btn-outline text-sm" onClick={() => investApi(`/admin/tickets/${t.id}/close`, { method: "POST" }).then(load)}>Close</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReferralEarningsAdmin() {
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const load = () => {
    investApi("/admin/referral-earnings").then((d) => setItems(d.earnings || [])).catch(() => {});
    investApi("/admin/referral-analytics").then(setAnalytics).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      {analytics && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4 text-center"><div className="text-xl font-bold">{analytics.clicks}</div><div className="text-xs text-muted-foreground">Link / QR clicks</div></div>
          <div className="card p-4 text-center"><div className="text-xl font-bold">{analytics.registrations}</div><div className="text-xs text-muted-foreground">Registrations</div></div>
          <div className="card p-4 text-center"><div className="text-xl font-bold">{analytics.conversionRate}%</div><div className="text-xs text-muted-foreground">Conversion rate</div></div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="p-3">Referrer</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.referrer?.name}</td>
                <td className="p-3 font-bold">{inr(e.amount)}</td>
                <td className="p-3"><Badge status={e.status} /></td>
                <td className="p-3">{e.status === "PENDING" && <button type="button" className="text-xs text-emerald-600" onClick={() => investApi(`/admin/referral-earnings/${e.id}/pay`, { method: "POST" }).then(load)}>Pay</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
