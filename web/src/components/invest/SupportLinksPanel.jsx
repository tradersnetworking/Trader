import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Field, Alert } from "../ui.jsx";

/** Super admin: WhatsApp & Telegram support links + transaction alert bot. */
export default function SupportLinksPanel() {
  const [form, setForm] = useState({
    support_whatsapp: "",
    support_telegram: "",
    support_email: "",
    telegram_bot_token: "",
    telegram_notify_enabled: "true",
    telegram_notify_channels: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [testMsg, setTestMsg] = useState("");
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
          telegram_bot_token: s.telegram_bot_token ? "••••••••" : "",
          telegram_notify_enabled: s.telegram_notify_enabled !== "false" ? "true" : "false",
          telegram_notify_channels: s.telegram_notify_channels || "",
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
      const body = {
        support_whatsapp: form.support_whatsapp,
        support_telegram: form.support_telegram,
        telegram_notify_enabled: form.telegram_notify_enabled,
        telegram_notify_channels: form.telegram_notify_channels,
      };
      if (form.telegram_bot_token && form.telegram_bot_token !== "••••••••") {
        body.telegram_bot_token = form.telegram_bot_token;
      }
      const d = await investApi("/admin/settings", { method: "PUT", body });
      const s = d.settings || {};
      setForm({
        support_whatsapp: s.support_whatsapp || "",
        support_telegram: s.support_telegram || "",
        support_email: s.support_email || form.support_email,
        telegram_bot_token: s.telegram_bot_token ? "••••••••" : "",
        telegram_notify_enabled: s.telegram_notify_enabled !== "false" ? "true" : "false",
        telegram_notify_channels: s.telegram_notify_channels || "",
      });
      setMsg("Settings saved.");
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const sendTest = async () => {
    setTestMsg("");
    setErr("");
    try {
      const d = await investApi("/admin/settings/telegram-test", { method: "POST", body: {} });
      setTestMsg(`Test sent to: ${(d.channels || []).join(", ")}`);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">WhatsApp & Telegram</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the floating gold support icon on every invest page.
        </p>
      </div>

      <form onSubmit={save} className="card space-y-4 p-6">
        <Alert type="info">
          WhatsApp: digits with country code (e.g. <strong>919876543210</strong>). Telegram support: <strong>@username</strong> or <strong>https://t.me/…</strong>
        </Alert>

        <Field label="WhatsApp number">
          <input
            className="input"
            value={form.support_whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, support_whatsapp: e.target.value }))}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
        </Field>
        <Field label="Telegram username or link (support)">
          <input
            className="input"
            value={form.support_telegram}
            onChange={(e) => setForm((f) => ({ ...f, support_telegram: e.target.value }))}
            placeholder="@AkshayaInvest or https://t.me/yourgroup"
          />
        </Field>

        {form.support_email && (
          <p className="text-xs text-muted-foreground">
            Support email for tickets: <strong>{form.support_email}</strong>
          </p>
        )}

        <hr className="border-border" />

        <div>
          <h3 className="font-bold text-foreground">Transaction alerts (Telegram bot)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Post deposits, withdrawals, and new investments to selected Telegram channels. Create a bot via{" "}
            <a href="https://t.me/BotFather" className="text-gold underline" target="_blank" rel="noreferrer">
              @BotFather
            </a>
            , add it as admin to each channel, then paste channel chat IDs (use @userinfobot or channel ID tools).
          </p>
        </div>

        <Field label="Enable transaction alerts">
          <select
            className="input"
            value={form.telegram_notify_enabled}
            onChange={(e) => setForm((f) => ({ ...f, telegram_notify_enabled: e.target.value }))}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </Field>

        <Field label="Bot token">
          <input
            className="input font-mono text-sm"
            type="password"
            value={form.telegram_bot_token}
            onChange={(e) => setForm((f) => ({ ...f, telegram_bot_token: e.target.value }))}
            placeholder="123456789:AA…"
            autoComplete="off"
          />
        </Field>

        <Field label="Channel chat IDs (one per line)">
          <textarea
            className="input min-h-[120px] font-mono text-sm"
            value={form.telegram_notify_channels}
            onChange={(e) => setForm((f) => ({ ...f, telegram_notify_channels: e.target.value }))}
            placeholder={"-1001234567890, Ops alerts\n-1009876543210, Finance"}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Format: <code>chatId</code> or <code>chatId, Label</code> per line. Supergroups/channels usually start with <code>-100</code>.
          </p>
        </Field>

        <button type="button" className="btn-outline w-full sm:w-auto" onClick={sendTest}>
          Send test message to all channels
        </button>

        {msg && <Alert type="success">{msg}</Alert>}
        {testMsg && <Alert type="success">{testMsg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}

        <button type="submit" className="btn-gold w-full sm:w-auto">
          Save all settings
        </button>
      </form>
    </div>
  );
}
