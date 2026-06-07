import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Alert, Badge, Field, Modal } from "../ui.jsx";
import { ReferralAdminPanel } from "./ReferralAdminPanel.jsx";
import AdminNotificationComposer from "./AdminNotificationComposer.jsx";

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
  return (
    <AdminNotificationComposer
      broadcastAll
      title="Broadcast to all investors"
      subtitle="Send the same message to every active investor via in-app, email and/or WhatsApp."
    />
  );
}

export function SupportTicketsAdmin() {
  const [tickets, setTickets] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    setErr("");
    const q = statusFilter ? `?status=${statusFilter}` : "";
    return investApi(`/admin/tickets${q}`)
      .then((d) => setTickets(d.tickets || []))
      .catch((e) => {
        setErr(e.message || "Could not load tickets");
        setTickets([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const send = async (id) => {
    if (!reply.trim()) return;
    await investApi(`/admin/tickets/${id}/reply`, { method: "POST", body: { message: reply } });
    setReply("");
    load();
  };

  const openCount = tickets.filter((t) => ["OPEN", "IN_PROGRESS"].includes(t.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-foreground">Support Tickets</h3>
          <p className="text-sm text-muted-foreground">Investor tickets from the Support tab in their dashboard.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {["OPEN", "IN_PROGRESS", "CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="btn-outline text-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{tickets.length}</div><div className="text-xs text-muted-foreground">Total shown</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-amber-600">{openCount}</div><div className="text-xs text-muted-foreground">Open / in progress</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{tickets.filter((t) => t.status === "CLOSED").length}</div><div className="text-xs text-muted-foreground">Closed</div></div>
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {loading && <p className="text-sm text-muted-foreground">Loading tickets…</p>}

      {!loading && !err && tickets.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold text-foreground">No support tickets yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            When investors submit tickets from their dashboard Support tab, they will appear here for you to reply and close.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="card p-4">
            <button type="button" className="flex w-full justify-between gap-3 text-left" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
              <div className="min-w-0">
                <b>{t.subject}</b>
                <div className="text-xs text-muted-foreground">{t.investor?.name} · {t.investor?.email}</div>
                <div className="text-[10px] text-muted-foreground">{dateStr(t.createdAt)}</div>
              </div>
              <Badge status={t.status === "CLOSED" ? "REJECTED" : t.status === "IN_PROGRESS" ? "PENDING" : "OPEN"} />
            </button>
            {expanded === t.id && (
              <div className="mt-3 border-t pt-3">
                <p className="text-sm whitespace-pre-wrap">{t.message}</p>
                {(t.replies || []).map((r) => (
                  <div key={r.id} className="mt-2 rounded bg-muted/30 p-2 text-sm"><b>{r.authorName}</b> ({r.authorRole}): {r.message}</div>
                ))}
                {t.status !== "CLOSED" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input className="input min-w-[12rem] flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Admin reply" />
                    <button type="button" className="btn-gold text-sm" onClick={() => send(t.id)}>Reply</button>
                    <button type="button" className="btn-outline text-sm" onClick={() => investApi(`/admin/tickets/${t.id}/close`, { method: "POST" }).then(load)}>Close</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReferralEarningsAdmin() {
  return <ReferralAdminPanel />;
}
