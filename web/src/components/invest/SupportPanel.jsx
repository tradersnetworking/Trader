import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { Alert, Badge, Field } from "../ui.jsx";

export default function SupportPanel() {
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "GENERAL" });
  const [reply, setReply] = useState("");
  const [active, setActive] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => investApi("/tickets").then((d) => setTickets(d.tickets || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await investApi("/tickets", { method: "POST", body: form });
      setForm({ subject: "", message: "", category: "GENERAL" });
      setOpen(false);
      setMsg("Ticket submitted. Our team will respond soon.");
      load();
    } catch (e2) { setErr(e2.message); }
  };

  const sendReply = async (id) => {
    if (!reply.trim()) return;
    await investApi(`/tickets/${id}/reply`, { method: "POST", body: { message: reply } });
    setReply("");
    load();
    setActive(id);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">Support Center</h2>
          <p className="text-sm text-muted-foreground">Create a ticket and track responses from our team.</p>
        </div>
        <button type="button" className="btn-gold text-sm" onClick={() => setOpen(true)}>+ New Ticket</button>
      </div>
      {msg && <Alert type="success">{msg}</Alert>}

      {open && (
        <form onSubmit={submit} className="card space-y-3 p-5">
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Subject"><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["GENERAL", "DEPOSIT", "WITHDRAWAL", "KYC", "INVESTMENT", "TECHNICAL"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Message"><textarea className="input" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-gold flex-1">Submit</button>
          </div>
        </form>
      )}

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No support tickets yet.</p>
      ) : (
        tickets.map((t) => (
          <div key={t.id} className="card overflow-hidden">
            <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => setActive(active === t.id ? null : t.id)}>
              <div>
                <div className="font-semibold">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{t.category} · {dateStr(t.createdAt, true)}</div>
              </div>
              <Badge status={t.status === "CLOSED" ? "REJECTED" : t.status === "OPEN" ? "PENDING" : "ACTIVE"} />
            </button>
            {active === t.id && (
              <div className="border-t border-border p-4">
                <p className="text-sm text-muted-foreground">{t.message}</p>
                <div className="mt-3 space-y-2">
                  {(t.replies || []).map((r) => (
                    <div key={r.id} className={`rounded-lg p-3 text-sm ${r.authorRole === "INVESTOR" ? "bg-muted/40" : "bg-primary/5"}`}>
                      <div className="text-xs font-semibold text-muted-foreground">{r.authorName || r.authorRole} · {dateStr(r.createdAt, true)}</div>
                      <div className="mt-1">{r.message}</div>
                    </div>
                  ))}
                </div>
                {t.status !== "CLOSED" && (
                  <div className="mt-3 flex gap-2">
                    <input className="input flex-1 text-sm" placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <button type="button" className="btn-gold text-sm" onClick={() => sendReply(t.id)}>Send</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
