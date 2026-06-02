import { useEffect, useState } from "react";

import { investApi } from "../../lib/api.js";

import { Field, Alert, PasswordInput } from "../ui.jsx";
import AdditionalDomainsPanel from "./AdditionalDomainsPanel.jsx";



export default function InvestSettingsPanel() {

  const [form, setForm] = useState({});

  const [msg, setMsg] = useState("");

  const [err, setErr] = useState("");



  useEffect(() => {

    investApi("/admin/settings").then((d) => setForm(d.settings || {})).catch(() => {});

  }, []);



  const save = async (e) => {

    e.preventDefault();

    setErr(""); setMsg("");

    try {

      const d = await investApi("/admin/settings", { method: "PUT", body: form });

      setForm(d.settings);

      setMsg("Settings saved.");

    } catch (e2) { setErr(e2.message); }

  };



  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));



  return (

    <div className="max-w-3xl space-y-6">

      <Alert type="info">Site settings — portal branding, contact, company bank fallback, referrals, and security. Configure SMTP/IMAP mailboxes under <strong>Mail Settings</strong> in the sidebar.</Alert>

      <AdditionalDomainsPanel />

      <form onSubmit={save} className="card space-y-4 p-6">

        <h3 className="font-bold text-navy dark:text-white">General</h3>

        <Field label="Site Name"><input className="input" value={form.site_name || ""} onChange={(e) => set("site_name", e.target.value)} /></Field>

        <Field label="Invest Portal URL"><input className="input" value={form.invest_portal_url || ""} onChange={(e) => set("invest_portal_url", e.target.value)} /></Field>

        <Field label="Support Email"><input className="input" type="email" value={form.support_email || ""} onChange={(e) => set("support_email", e.target.value)} /></Field>

        <h3 className="pt-2 font-bold text-navy dark:text-white">Floating support button</h3>
        <p className="text-xs text-muted-foreground">Links for the gold support icon on every invest page (tap → WhatsApp, Telegram, Support tickets).</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="WhatsApp number">
            <input className="input" value={form.support_whatsapp || ""} onChange={(e) => set("support_whatsapp", e.target.value)} placeholder="+919876543210" />
          </Field>
          <Field label="Telegram username or link">
            <input className="input" value={form.support_telegram || ""} onChange={(e) => set("support_telegram", e.target.value)} placeholder="@AkshayaInvest or https://t.me/..." />
          </Field>
        </div>

        <Field label="Mail From"><input className="input" value={form.mail_from || ""} onChange={(e) => set("mail_from", e.target.value)} /></Field>

        <Field label="Android APK URL"><input className="input" value={form.android_apk_url || ""} onChange={(e) => set("android_apk_url", e.target.value)} placeholder="/assets/apk/akshaya-invest.apk" /></Field>

        <Field label="Android App Version"><input className="input" value={form.android_app_version || ""} onChange={(e) => set("android_app_version", e.target.value)} placeholder="1.0.0" /></Field>



        <h3 className="pt-2 font-bold text-navy dark:text-white">Company Bank (fallback)</h3>

        <div className="grid grid-cols-2 gap-3">

          <Field label="Bank Name"><input className="input" value={form.company_bank_name || ""} onChange={(e) => set("company_bank_name", e.target.value)} /></Field>

          <Field label="Account Holder"><input className="input" value={form.company_account_name || ""} onChange={(e) => set("company_account_name", e.target.value)} /></Field>

          <Field label="Account Number"><input className="input" value={form.company_account_number || ""} onChange={(e) => set("company_account_number", e.target.value)} /></Field>

          <Field label="IFSC"><input className="input" value={form.company_ifsc || ""} onChange={(e) => set("company_ifsc", e.target.value)} /></Field>

          <Field label="Branch"><input className="input" value={form.company_branch || ""} onChange={(e) => set("company_branch", e.target.value)} /></Field>

          <Field label="UPI ID"><input className="input font-mono" value={form.company_upi_id || ""} onChange={(e) => set("company_upi_id", e.target.value)} /></Field>

        </div>



        <h3 className="pt-2 font-bold text-navy dark:text-white">API / Portal</h3>

        <Field label="API Base URL (optional)"><input className="input" value={form.api_base_url || ""} onChange={(e) => set("api_base_url", e.target.value)} placeholder="https://api.akshayaexim.com" /></Field>



        <h3 className="pt-2 font-bold text-navy dark:text-white">SMTP (Email)</h3>
        <Alert type="info">Per-mailbox SMTP/IMAP credentials are configured under <strong>Mail Settings</strong> (5 mailboxes per portal). Legacy fields below remain as env fallback only.</Alert>

        <div className="grid grid-cols-2 gap-3">

          <Field label="SMTP Host"><input className="input" value={form.smtp_host || ""} onChange={(e) => set("smtp_host", e.target.value)} /></Field>

          <Field label="SMTP Port"><input className="input" value={form.smtp_port || ""} onChange={(e) => set("smtp_port", e.target.value)} /></Field>

        </div>

        <Field label="SMTP User"><input className="input" value={form.smtp_user || ""} onChange={(e) => set("smtp_user", e.target.value)} /></Field>

        <Field label="SMTP Password"><PasswordInput value={form.smtp_pass || ""} onChange={(e) => set("smtp_pass", e.target.value)} placeholder="Leave blank to keep current" /></Field>



        <h3 className="pt-2 font-bold text-navy dark:text-white">Maintenance Mode</h3>

        <Field label="Maintenance enabled">
          <select className="input" value={form.maintenance_mode || "false"} onChange={(e) => set("maintenance_mode", e.target.value)}>
            <option value="false">Off — portal open</option>
            <option value="true">On — show banner on homepage</option>
          </select>
        </Field>

        <Field label="Maintenance message"><textarea className="input" rows={2} value={form.maintenance_message || ""} onChange={(e) => set("maintenance_message", e.target.value)} placeholder="Platform under maintenance. Please check back soon." /></Field>



        <h3 className="pt-2 font-bold text-navy dark:text-white">Referrals</h3>
        <p className="text-xs text-muted-foreground">For payout frequency, minimum payout, and bulk pay — use <strong>Referral Payouts → Commission & frequency</strong> in the admin sidebar.</p>

        <Field label="Level 1 commission %"><input className="input" type="number" step="0.1" value={form.referral_level_1_pct ?? form.referral_commission_pct ?? "2"} onChange={(e) => set("referral_level_1_pct", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[2, 3, 4, 5].map((n) => (
            <Field key={n} label={`Level ${n} %`}>
              <input className="input" type="number" step="0.1" min="0" value={form[`referral_level_${n}_pct`] || "0"} onChange={(e) => set(`referral_level_${n}_pct`, e.target.value)} />
            </Field>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Level 1 = direct referrals; levels 2–5 pay upline. Set 0 to disable.</p>

        <h3 className="pt-2 font-bold text-navy dark:text-white">Withdrawals</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum withdrawal (₹)"><input className="input" type="number" min={1} value={form.min_withdraw_amount || "100"} onChange={(e) => set("min_withdraw_amount", e.target.value)} /></Field>
          <Field label="Max per request (₹, 0 = no cap)"><input className="input" type="number" min={0} value={form.max_withdraw_amount || "500000"} onChange={(e) => set("max_withdraw_amount", e.target.value)} /></Field>
        </div>

        <h3 className="pt-2 font-bold text-navy dark:text-white">Early exit (before maturity)</h3>
        <Field label="Allow early exit">
          <select className="input" value={form.early_exit_enabled || "true"} onChange={(e) => set("early_exit_enabled", e.target.value)}>
            <option value="true">Enabled — investors can exit active plans early</option>
            <option value="false">Disabled — lock-in enforced until maturity</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Penalty on principal (%)"><input className="input" type="number" min={0} max={100} step="0.5" value={form.early_exit_penalty_pct || "10"} onChange={(e) => set("early_exit_penalty_pct", e.target.value)} /></Field>
          <Field label="Forfeit ROI paid on exit">
            <select className="input" value={form.early_exit_forfeit_roi ?? "true"} onChange={(e) => set("early_exit_forfeit_roi", e.target.value)}>
              <option value="true">Yes — claw back ROI already paid</option>
              <option value="false">No — keep ROI already credited</option>
            </select>
          </Field>
        </div>



        <h3 className="pt-2 font-bold text-navy dark:text-white">Security</h3>
        <Field label="Screenshot protection">
          <select className="input" value={form.screenshot_protection || "false"} onChange={(e) => set("screenshot_protection", e.target.value)}>
            <option value="false">Off</option>
            <option value="true">On (watermark + block shortcuts)</option>
          </select>
        </Field>
        <Field label="Watermark opacity (0–1)"><input className="input" type="number" step="0.01" min="0" max="1" value={form.screenshot_watermark_opacity || "0.08"} onChange={(e) => set("screenshot_watermark_opacity", e.target.value)} /></Field>



        <h3 className="pt-2 font-bold text-navy dark:text-white">Support mail desk (IMAP)</h3>
        <Field label="Enable IMAP sync"><select className="input" value={form.support_mail_enabled || "false"} onChange={(e) => set("support_mail_enabled", e.target.value)}><option value="false">Off</option><option value="true">On</option></select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="IMAP host"><input className="input" value={form.support_imap_host || ""} onChange={(e) => set("support_imap_host", e.target.value)} /></Field>
          <Field label="IMAP user"><input className="input" value={form.support_imap_user || ""} onChange={(e) => set("support_imap_user", e.target.value)} /></Field>
        </div>
        <Field label="IMAP password"><PasswordInput value={form.support_imap_pass || ""} onChange={(e) => set("support_imap_pass", e.target.value)} placeholder="Leave blank to keep" /></Field>



        {msg && <Alert type="success">{msg}</Alert>}

        {err && <Alert type="error">{err}</Alert>}

        <button className="btn-gold w-full">Save Settings</button>

      </form>

    </div>

  );

}

