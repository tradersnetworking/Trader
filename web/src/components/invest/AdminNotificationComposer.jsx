import { useEffect, useMemo, useState } from "react";
import { investApi } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { Alert, Field } from "../ui.jsx";

const CHANNEL_OPTIONS = [
  { id: "app", label: "In-app notification" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
];

const EMPTY_CONTENT = {
  appTitle: "",
  appBody: "",
  appType: "INFO",
  appLink: "",
  emailSubject: "",
  emailText: "",
  whatsappMessage: "",
};

function templateToForm(t) {
  if (!t) return { ...EMPTY_CONTENT };
  return {
    appTitle: t.app?.title || "",
    appBody: t.app?.body || "",
    appType: t.app?.type || "INFO",
    appLink: t.app?.link || "",
    emailSubject: t.email?.subject || "",
    emailText: t.email?.text || "",
    whatsappMessage: t.whatsapp?.message || "",
  };
}

/**
 * Multi-channel notification composer — templates, channel picker, multi-user select.
 */
export default function AdminNotificationComposer({
  title = "Send notification",
  subtitle = "Choose channels, pick a template, select investors, and send.",
  broadcastAll = false,
  onSent,
}) {
  const [templates, setTemplates] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [templateId, setTemplateId] = useState("general");
  const [channels, setChannels] = useState(["app"]);
  const [content, setContent] = useState({ ...EMPTY_CONTENT });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || templates[0],
    [templates, templateId]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [tpl, inv] = await Promise.all([
        investApi("/admin/notifications/templates"),
        investApi("/admin/investors"),
      ]);
      const list = tpl.templates || [];
      setTemplates(list);
      setInvestors((inv.investors || []).filter((i) => i.role === "INVESTOR" && i.isActive !== false));
      const initial = list.find((t) => t.id === "general") || list[0];
      if (initial) {
        setTemplateId(initial.id);
        setContent(templateToForm(initial));
      }
    } catch (e) {
      setErr(e.message || "Could not load notification settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onTemplateChange = (id) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    setContent(templateToForm(t));
  };

  const toggleChannel = (id) => {
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleInvestor = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === investors.length) setSelected(new Set());
    else setSelected(new Set(investors.map((i) => i.id)));
  };

  const setField = (key, value) => setContent((c) => ({ ...c, [key]: value }));

  const channelPayload = {
    app: channels.includes("app"),
    email: channels.includes("email"),
    whatsapp: channels.includes("whatsapp"),
  };

  const send = async () => {
    if (!channels.length) {
      setErr("Select at least one delivery channel.");
      return;
    }
    if (!broadcastAll && !selected.size) {
      setErr("Select at least one investor, or use Broadcast to reach all.");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const body = {
        templateId,
        channels: channelPayload,
        title: content.appTitle,
        body: content.appBody,
        type: content.appType,
        link: content.appLink || undefined,
        emailSubject: content.emailSubject,
        emailText: content.emailText,
        emailHtml: content.emailText.split("\n").map((l) => `<p>${l || "&nbsp;"}</p>`).join(""),
        whatsappMessage: content.whatsappMessage,
        investorIds: broadcastAll ? undefined : [...selected],
      };
      const path = broadcastAll ? "/admin/notifications/broadcast" : "/admin/notifications/send";
      const r = await investApi(path, { method: "POST", body });
      const parts = [];
      if (r.app) parts.push(`In-app: ${r.app.sent}/${r.app.total ?? r.total}`);
      if (r.email) parts.push(`Email: ${r.email.sent}/${r.email.total ?? r.total}`);
      if (r.whatsapp) {
        parts.push(
          `WhatsApp: ${r.whatsapp.sent}/${r.whatsapp.total ?? r.total}${r.whatsapp.skipped ? ` (${r.whatsapp.skipped} skipped)` : ""}`
        );
      }
      if (r.count && !parts.length) parts.push(`Sent to ${r.count} investors`);
      setMsg(parts.join(" · ") || "Notification sent.");
      if (!broadcastAll) setSelected(new Set());
      onSent?.();
    } catch (e) {
      setErr(e.message || "Send failed.");
    } finally {
      setBusy(false);
    }
  };

  const showApp = channels.includes("app");
  const showEmail = channels.includes("email");
  const showWhatsApp = channels.includes("whatsapp");
  const isCustom = templateId === "custom";

  return (
    <div className="page-stack min-h-0 min-w-0">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <div className="card space-y-4 p-5">
        <Field label="Message template">
          <select className="input" value={templateId} onChange={(e) => onTemplateChange(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {activeTemplate?.description && (
            <p className="mt-1 text-xs text-muted-foreground">{activeTemplate.description}</p>
          )}
        </Field>

        <Field label="Delivery channels (select one or more)">
          <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/20 p-3">
            {CHANNEL_OPTIONS.map((ch) => (
              <label key={ch.id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.includes(ch.id)}
                  onChange={() => toggleChannel(ch.id)}
                />
                {ch.label}
              </label>
            ))}
          </div>
        </Field>

        {showApp && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">In-app content</p>
            <Field label="Title">
              <input
                className="input"
                value={content.appTitle}
                onChange={(e) => setField("appTitle", e.target.value)}
                readOnly={!isCustom}
                disabled={!isCustom}
              />
            </Field>
            <Field label="Message">
              <textarea
                className="input"
                rows={3}
                value={content.appBody}
                onChange={(e) => setField("appBody", e.target.value)}
                readOnly={!isCustom}
                disabled={!isCustom}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <select
                  className="input"
                  value={content.appType}
                  onChange={(e) => setField("appType", e.target.value)}
                  disabled={!isCustom}
                >
                  {["INFO", "SUCCESS", "WARNING"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dashboard tab link (optional)">
                <input
                  className="input"
                  placeholder="kyc, deposit, invest, money"
                  value={content.appLink}
                  onChange={(e) => setField("appLink", e.target.value)}
                  disabled={!isCustom}
                />
              </Field>
            </div>
          </div>
        )}

        {showEmail && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email content</p>
            <Field label="Subject">
              <input
                className="input"
                value={content.emailSubject}
                onChange={(e) => setField("emailSubject", e.target.value)}
                readOnly={!isCustom}
                disabled={!isCustom}
              />
            </Field>
            <Field label="Body (use {'{name}'} for investor name)">
              <textarea
                className="input"
                rows={5}
                value={content.emailText}
                onChange={(e) => setField("emailText", e.target.value)}
                readOnly={!isCustom}
                disabled={!isCustom}
              />
            </Field>
          </div>
        )}

        {showWhatsApp && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">WhatsApp content</p>
            <Field label="Message (use {'{name}'} — sent via your WhatsApp Business template)">
              <textarea
                className="input"
                rows={4}
                value={content.whatsappMessage}
                onChange={(e) => setField("whatsappMessage", e.target.value)}
                readOnly={!isCustom}
                disabled={!isCustom}
              />
            </Field>
          </div>
        )}

        {templateId !== "custom" && (
          <p className="text-xs text-muted-foreground">
            Template content is fixed. Choose <strong>Custom message</strong> to edit text manually.
          </p>
        )}

        <button
          type="button"
          className="btn-gold disabled:opacity-50"
          disabled={busy || loading || (!broadcastAll && !selected.size && !investors.length)}
          onClick={send}
        >
          {busy
            ? "Sending…"
            : broadcastAll
              ? `Send to all ${investors.length} investors`
              : selected.size
                ? `Send to ${selected.size} selected`
                : "Select investors below"}
        </button>
      </div>

      {!broadcastAll && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">{investors.length}</strong> investors
              {selected.size > 0 && (
                <>
                  {" "}
                  · <strong className="text-foreground">{selected.size}</strong> selected
                </>
              )}
            </span>
            <button type="button" className="btn-outline ml-auto text-xs" disabled={loading} onClick={load}>
              Refresh
            </button>
          </div>

          <div className="card min-h-0 min-w-0 overflow-hidden p-0">
            <div className="app-table-scroll-y">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.size === investors.length && investors.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">KYC</th>
                  <th className="p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  investors.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggleInvestor(i.id)} />
                      </td>
                      <td className="p-3 font-medium">{i.name || i.email}</td>
                      <td className="p-3 text-muted-foreground">{i.email}</td>
                      <td className="p-3 text-xs text-muted-foreground">{i.phone || i.kyc?.phone || "—"}</td>
                      <td className="p-3 text-xs">{i.kyc?.status || "Not submitted"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{dateStr(i.createdAt)}</td>
                    </tr>
                  ))}
                {!loading && !investors.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No active investors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
