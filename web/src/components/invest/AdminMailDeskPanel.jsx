import { useEffect, useState } from "react";
import { investApi, investApiForm } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { Alert, Badge, Field } from "../ui.jsx";

/** Mail desk: IMAP inbox, compose/reply with attachments. */
export default function AdminMailDeskPanel() {
  const [tab, setTab] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });
  const [files, setFiles] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    return investApi("/admin/support-mail")
      .then((d) => setMessages(d.messages || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    investApi("/admin/settings").then((d) => setSettings(d.settings || {})).catch(() => {});
  }, []);

  const sync = async () => {
    setSyncing(true);
    setMsg("");
    try {
      const r = await investApi("/admin/support-mail/sync", { method: "POST" });
      setMsg(r.skipped ? "IMAP sync disabled — configure support mailbox in Mail Settings." : `Synced ${r.synced || 0} message(s).`);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const sendReply = async (id) => {
    if (!reply.trim()) return;
    setErr("");
    const fd = new FormData();
    fd.append("body", reply.replace(/\n/g, "<br>"));
    replyFiles.forEach((f) => fd.append("attachments", f));
    try {
      await investApiForm(`/admin/support-mail/${id}/reply`, fd);
      setReply("");
      setReplyFiles([]);
      setMsg(replyFiles.length ? `Reply sent with ${replyFiles.length} attachment(s).` : "Reply sent.");
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const sendCompose = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const fd = new FormData();
    fd.append("to", compose.to);
    fd.append("subject", compose.subject);
    fd.append("body", compose.body.replace(/\n/g, "<br>"));
    files.forEach((f) => fd.append("attachments", f));
    try {
      await investApiForm("/admin/support-mail/compose", fd);
      setMsg(`Email sent to ${compose.to}`);
      setCompose({ to: "", subject: "", body: "" });
      setFiles([]);
      setTab("inbox");
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const fromLabel = settings.default_communication_email || settings.mail_from || settings.support_email || "Configure in Communication → Mail Settings";

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Support Mail Desk</h3>
          <p className="text-sm text-muted-foreground">View synced support inbox emails and reply with attachments (same as compose).</p>
          <p className="mt-1 text-xs text-muted-foreground">Sending as: <strong>{fromLabel}</strong></p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline text-sm" disabled={syncing} onClick={sync}>{syncing ? "Syncing…" : "Sync IMAP"}</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {["inbox", "compose"].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${tab === t ? "bg-primary/15 text-accent-tone" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      {tab === "compose" && (
        <form onSubmit={sendCompose} className="card max-w-2xl space-y-3 p-5">
          <Field label="To"><input className="input" type="email" required value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} /></Field>
          <Field label="Subject"><input className="input" required value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} /></Field>
          <Field label="Message"><textarea className="input" rows={8} required value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} /></Field>
          <Field label="Attachments (images, PDF — max 5)">
            <input type="file" className="input py-1.5" multiple accept="image/*,.pdf" onChange={(e) => setFiles([...e.target.files])} />
          </Field>
          <button className="btn-gold">Send email</button>
        </form>
      )}

      {tab === "inbox" && (
        <>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && messages.length === 0 && (
            <div className="card p-8 text-center text-muted-foreground">No messages. Sync IMAP or send from Compose.</div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="card p-4">
              <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setActive(active === m.id ? null : m.id)}>
                <div>
                  <div className="font-semibold">{m.subject}</div>
                  <div className="text-xs text-muted-foreground">{m.fromEmail} · {dateStr(m.receivedAt, true)}</div>
                </div>
                <Badge status={m.status || "OPEN"} />
              </button>
              {active === m.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">{m.body?.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")}</div>
                  {m.category !== "OUTBOUND" && (
                    <>
                      <textarea className="input mt-3 w-full" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type reply…" />
                      <div className="mt-2">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Attachments (optional, max 5)</p>
                        <input type="file" className="input py-1.5" multiple accept="image/*,.pdf" onChange={(e) => setReplyFiles([...e.target.files])} />
                      </div>
                      <button type="button" className="btn-gold mt-2 text-sm" onClick={() => sendReply(m.id)}>Send reply</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
