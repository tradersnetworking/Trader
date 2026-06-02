import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Field, Alert } from "../ui.jsx";

/** Super admin: WhatsApp & Telegram links for the floating support button on the invest portal. */
export default function SupportLinksPanel() {
  const [form, setForm] = useState({ support_whatsapp: "", support_telegram: "", support_email: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    investApi("/admin/settings")
      .then((d) => {
        const s = d.settings || {};
        setForm({
          support_whatsapp: s.support_whatsapp || "",
          support_telegram: s.support_telegram || "",
          support_email: s.support_email || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const d = await investApi("/admin/settings", {
        method: "PUT",
        body: {
          support_whatsapp: form.support_whatsapp,
          support_telegram: form.support_telegram,
        },
      });
      const s = d.settings || {};
      setForm({
        support_whatsapp: s.support_whatsapp || "",
        support_telegram: s.support_telegram || "",
        support_email: s.support_email || form.support_email,
      });
      setMsg("WhatsApp and Telegram links saved. They appear on the gold support button for all visitors.");
    } catch (e2) {
      setErr(e2.message);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">WhatsApp & Telegram</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the floating gold support icon on every invest page. When users tap it, they see WhatsApp, Telegram, and Support tickets.
        </p>
      </div>

      <Alert type="info">
        Use digits only for WhatsApp (with country code), e.g. <strong>919876543210</strong>. For Telegram use <strong>@username</strong> or a full <strong>https://t.me/…</strong> link.
      </Alert>

      <form onSubmit={save} className="card space-y-4 p-6">
        <Field label="WhatsApp number">
          <input
            className="input"
            value={form.support_whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, support_whatsapp: e.target.value }))}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
        </Field>
        <Field label="Telegram username or link">
          <input
            className="input"
            value={form.support_telegram}
            onChange={(e) => setForm((f) => ({ ...f, support_telegram: e.target.value }))}
            placeholder="@AkshayaInvest or https://t.me/yourgroup"
          />
        </Field>

        {form.support_email && (
          <p className="text-xs text-muted-foreground">
            Support email for tickets: <strong>{form.support_email}</strong> — change under Site Settings if needed.
          </p>
        )}

        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}

        <button type="submit" className="btn-gold w-full sm:w-auto">
          Save WhatsApp & Telegram
        </button>
      </form>
    </div>
  );
}
