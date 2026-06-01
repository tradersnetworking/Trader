import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";

/** Super admin: default outbound email for user communication (main + invest). */
export default function MainCommunicationPanel() {
  const [form, setForm] = useState({ default_communication_email: "", mail_from: "", support_email: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    mainApi("/admin/settings").then((d) => setForm({
      default_communication_email: d.settings?.default_communication_email || "",
      mail_from: d.settings?.mail_from || "",
      support_email: d.settings?.support_email || "",
    })).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      const d = await mainApi("/admin/settings", { method: "PUT", body: form });
      setForm({
        default_communication_email: d.settings?.default_communication_email || "",
        mail_from: d.settings?.mail_from || "",
        support_email: d.settings?.support_email || "",
      });
      setMsg("Communication settings saved. Used for outbound emails on main and invest portals.");
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <form onSubmit={save} className="card max-w-xl space-y-4 p-5">
      <div>
        <h3 className="font-bold">Default communication email</h3>
        <p className="text-sm text-muted-foreground">Super Admin sets the default From address for emails to users and investors on both domains.</p>
      </div>
      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}
      <Field label="Default communication email">
        <input className="input" type="email" placeholder="support@akshayaexim.com" value={form.default_communication_email} onChange={(e) => setForm({ ...form, default_communication_email: e.target.value })} />
        <p className="mt-1 text-xs text-muted-foreground">Primary sender for support, nurture, and system emails.</p>
      </Field>
      <Field label="SMTP From header (optional)">
        <input className="input" placeholder="Akshaya Exim &lt;support@akshayaexim.com&gt;" value={form.mail_from} onChange={(e) => setForm({ ...form, mail_from: e.target.value })} />
      </Field>
      <Field label="Support reply-to / inbox">
        <input className="input" type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
      </Field>
      <button className="btn-gold">Save communication settings</button>
    </form>
  );
}
