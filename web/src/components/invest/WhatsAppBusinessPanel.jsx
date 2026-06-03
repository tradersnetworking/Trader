import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Field, Alert } from "../ui.jsx";

/**
 * Meta WhatsApp Business API — invest portal transactional messaging.
 * Super admin: edit + test. Admin: view-only (masked token).
 */
export default function WhatsAppBusinessPanel({ readOnly = false }) {
  const [form, setForm] = useState({
    whatsapp_api_enabled: "false",
    whatsapp_api_phone_number_id: "",
    whatsapp_api_business_account_id: "",
    whatsapp_api_access_token: "",
    whatsapp_api_version: "v21.0",
    whatsapp_otp_enabled: "true",
    whatsapp_transactional_enabled: "true",
    whatsapp_otp_template_name: "authentication",
    whatsapp_otp_template_language: "en",
    whatsapp_tx_template_name: "invest_update",
    whatsapp_tx_template_language: "en",
    configured: false,
  });
  const [testPhone, setTestPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    investApi("/admin/whatsapp-business")
      .then((d) => {
        const s = d.settings || {};
        setForm({
          whatsapp_api_enabled: s.whatsapp_api_enabled === "true" ? "true" : "false",
          whatsapp_api_phone_number_id: s.whatsapp_api_phone_number_id || "",
          whatsapp_api_business_account_id: s.whatsapp_api_business_account_id || "",
          whatsapp_api_access_token: s.whatsapp_api_access_token ? "••••••••" : "",
          whatsapp_api_version: s.whatsapp_api_version || "v21.0",
          whatsapp_otp_enabled: s.whatsapp_otp_enabled !== "false" ? "true" : "false",
          whatsapp_transactional_enabled: s.whatsapp_transactional_enabled !== "false" ? "true" : "false",
          whatsapp_otp_template_name: s.whatsapp_otp_template_name || "authentication",
          whatsapp_otp_template_language: s.whatsapp_otp_template_language || "en",
          whatsapp_tx_template_name: s.whatsapp_tx_template_name || "invest_update",
          whatsapp_tx_template_language: s.whatsapp_tx_template_language || "en",
          configured: !!s.configured,
        });
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    setErr("");
    setMsg("");
    try {
      const body = { ...form };
      delete body.configured;
      if (body.whatsapp_api_access_token === "••••••••") delete body.whatsapp_api_access_token;
      const d = await investApi("/admin/whatsapp-business", { method: "PUT", body: { settings: body } });
      const s = d.settings || {};
      setForm((f) => ({
        ...f,
        ...s,
        whatsapp_api_access_token: s.whatsapp_api_access_token ? "••••••••" : "",
        configured: !!s.configured,
      }));
      setMsg("WhatsApp Business API settings saved.");
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const sendTest = async () => {
    if (readOnly) return;
    setTestMsg("");
    setErr("");
    try {
      const d = await investApi("/admin/whatsapp-business/test", {
        method: "POST",
        body: { testPhone },
      });
      setTestMsg(`Test sent to ${d.to} using template "${d.templateName}".`);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const disabled = readOnly;

  return (
    <div className="space-y-6 max-w-2xl">
      {readOnly && (
        <Alert type="info">
          View-only: only Super Admin can change WhatsApp Business API credentials. Floating chat links are configured under
          WhatsApp, Telegram &amp; Alerts.
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Sends OTPs, deposit/payout receipts, and investment updates to investors on the invest portal using their KYC WhatsApp
        number. Requires approved Meta templates (<code className="text-xs">authentication</code> for OTP,{" "}
        <code className="text-xs">invest_update</code> for transactional — names configurable below).
      </p>
      {form.configured ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">API configured and enabled.</p>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-400">Not fully configured — enable API and set Phone Number ID + Access Token.</p>
      )}
      {err && <Alert type="error">{err}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <form onSubmit={save} className="space-y-4">
        <Field label="Enable WhatsApp Business API">
          <select
            className="input"
            disabled={disabled}
            value={form.whatsapp_api_enabled}
            onChange={(e) => set("whatsapp_api_enabled", e.target.value)}
          >
            <option value="false">Off</option>
            <option value="true">On</option>
          </select>
        </Field>
        <Field label="Phone Number ID (Meta Cloud API)">
          <input
            className="input"
            disabled={disabled}
            value={form.whatsapp_api_phone_number_id}
            onChange={(e) => set("whatsapp_api_phone_number_id", e.target.value)}
            placeholder="From Meta Developer Console"
          />
        </Field>
        <Field label="WhatsApp Business Account ID (optional)">
          <input
            className="input"
            disabled={disabled}
            value={form.whatsapp_api_business_account_id}
            onChange={(e) => set("whatsapp_api_business_account_id", e.target.value)}
          />
        </Field>
        <Field label="Permanent Access Token">
          <input
            className="input font-mono text-sm"
            disabled={disabled}
            type={readOnly ? "password" : "password"}
            value={form.whatsapp_api_access_token}
            onChange={(e) => set("whatsapp_api_access_token", e.target.value)}
            placeholder={readOnly ? "Hidden" : "Paste token from Meta"}
            readOnly={readOnly}
          />
        </Field>
        <Field label="Graph API version">
          <input
            className="input"
            disabled={disabled}
            value={form.whatsapp_api_version}
            onChange={(e) => set("whatsapp_api_version", e.target.value)}
          />
        </Field>

        <h3 className="font-semibold text-sm pt-2">Message types</h3>
        <Field label="Send login & withdrawal OTPs via WhatsApp">
          <select
            className="input"
            disabled={disabled}
            value={form.whatsapp_otp_enabled}
            onChange={(e) => set("whatsapp_otp_enabled", e.target.value)}
          >
            <option value="true">Yes</option>
            <option value="false">No (email only)</option>
          </select>
        </Field>
        <Field label="Send transactional updates (deposits, payouts, investments)">
          <select
            className="input"
            disabled={disabled}
            value={form.whatsapp_transactional_enabled}
            onChange={(e) => set("whatsapp_transactional_enabled", e.target.value)}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>

        <h3 className="font-semibold text-sm pt-2">Approved templates (Meta)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="OTP template name">
            <input
              className="input"
              disabled={disabled}
              value={form.whatsapp_otp_template_name}
              onChange={(e) => set("whatsapp_otp_template_name", e.target.value)}
            />
          </Field>
          <Field label="OTP template language">
            <input
              className="input"
              disabled={disabled}
              value={form.whatsapp_otp_template_language}
              onChange={(e) => set("whatsapp_otp_template_language", e.target.value)}
            />
          </Field>
          <Field label="Transactional template name">
            <input
              className="input"
              disabled={disabled}
              value={form.whatsapp_tx_template_name}
              onChange={(e) => set("whatsapp_tx_template_name", e.target.value)}
            />
          </Field>
          <Field label="Transactional template language">
            <input
              className="input"
              disabled={disabled}
              value={form.whatsapp_tx_template_language}
              onChange={(e) => set("whatsapp_tx_template_language", e.target.value)}
            />
          </Field>
        </div>

        {!readOnly && (
          <button type="submit" className="btn btn-primary">
            Save WhatsApp API settings
          </button>
        )}
      </form>

      {!readOnly && (
        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="font-semibold text-sm">Send test message</h3>
          <Field label="Test phone (with country code, e.g. 919876543210)">
            <input className="input" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </Field>
          <button type="button" className="btn btn-secondary" onClick={sendTest}>
            Send test via transactional template
          </button>
          {testMsg && <p className="text-sm text-emerald-700 dark:text-emerald-400">{testMsg}</p>}
        </div>
      )}
    </div>
  );
}
