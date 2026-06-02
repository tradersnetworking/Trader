import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { MAIN_CONTACT_PAGE_DEFAULT, MAIN_SUPPORT_PHONE } from "../../lib/mainContact.js";
import { Field, Alert } from "../ui.jsx";

const FIELDS = [
  { section: "Google Sign-In (main domain)" },
  { key: "main_google_login_enabled", label: "Enable Google login", type: "checkbox" },
  { key: "main_google_client_id", label: "Google OAuth Client ID", hint: "From Google Cloud Console → APIs & Credentials → OAuth 2.0 Client ID (Web). Add authorized origins for your domain." },
  { section: "SEO — Meta & Social" },
  { key: "main_site_name", label: "Site name" },
  { key: "main_seo_title", label: "Default page title" },
  { key: "main_seo_description", label: "Meta description", type: "textarea" },
  { key: "main_seo_keywords", label: "Meta keywords (comma-separated)", type: "textarea" },
  { key: "main_seo_canonical_url", label: "Canonical site URL", hint: "e.g. https://akshayaexim.com" },
  { key: "main_seo_og_image", label: "Open Graph image path", hint: "e.g. /assets/logo.png" },
  { key: "main_json_ld_description", label: "Structured data description", type: "textarea" },
  { section: "Analytics" },
  { key: "main_ga4_measurement_id", label: "Google Analytics 4 Measurement ID", hint: "e.g. G-XXXXXXXXXX" },
  { key: "main_gtm_container_id", label: "Google Tag Manager container ID (optional)", hint: "e.g. GTM-XXXXXXX" },
  { section: "Search engine verification & indexing" },
  { key: "main_google_site_verification", label: "Google Search Console verification code", hint: "Content value from meta tag (not full tag)" },
  { key: "main_bing_site_verification", label: "Bing Webmaster verification code" },
  { key: "main_robots_allow_index", label: "Allow search engines to index site", type: "checkbox" },
  { key: "main_sitemap_auto_ping", label: "Ping Google & Bing when saving settings", type: "checkbox" },
];

const DEFAULT_CONTACT = MAIN_CONTACT_PAGE_DEFAULT;

export default function MainSiteSettingsPanel() {
  const [form, setForm] = useState({});
  const [contact, setContact] = useState(DEFAULT_CONTACT);
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    mainApi("/admin/site-settings").then((d) => {
      setForm(d.settings || {});
      if (d.contactPage) setContact(d.contactPage);
    }).catch(() => {});
    mainApi("/admin/site-stats").then((d) => setStats(d)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const payload = { ...form, main_contact_page: contact };
      for (const f of FIELDS) {
        if (f.type === "checkbox" && f.key) {
          payload[f.key] = form[f.key] === true || form[f.key] === "true" ? "true" : "false";
        }
      }
      const d = await mainApi("/admin/site-settings", { method: "PUT", body: payload });
      setForm(d.settings);
      if (d.contactPage) setContact(d.contactPage);
      setMsg(d.ping ? `Saved. Sitemap pinged — ${d.ping.results?.filter((r) => r.ok).length || 0} search engine(s) notified.` : "Site settings saved.");
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const pingNow = async () => {
    setBusy(true);
    setErr("");
    try {
      const d = await mainApi("/admin/site-settings/ping-sitemap", { method: "POST" });
      setMsg(`Sitemap submitted: ${d.ping?.sitemapUrl}`);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const updateDesk = (id, key, value) => {
    setContact((prev) => ({
      ...prev,
      desks: prev.desks.map((d) => (d.id === id ? { ...d, [key]: value } : d)),
    }));
  };

  const boolVal = (key) => form[key] === true || form[key] === "true";

  return (
    <div className="page-stack max-w-3xl">
      {stats?.integrations && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard label="Google login" ok={stats.integrations.googleLogin.enabled && stats.integrations.googleLogin.configured} detail={stats.integrations.googleLogin.configured ? "Configured" : "Add Client ID"} />
          <StatusCard label="GA4 Analytics" ok={stats.integrations.ga4.configured} detail={stats.integrations.ga4.id || "Not set"} />
          <StatusCard label="Search Console" ok={stats.integrations.searchConsole.configured} detail={stats.integrations.searchConsole.configured ? "Verified tag set" : "Add verification code"} />
          <StatusCard label="Sitemap" ok={Boolean(stats.integrations.lastSitemapPing)} detail={stats.integrations.lastSitemapPing ? `Last ping ${new Date(stats.integrations.lastSitemapPing).toLocaleDateString()}` : "Not pinged yet"} />
        </div>
      )}

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <form onSubmit={save} className="card space-y-4 p-5">
        <div>
          <h3 className="font-bold">Site, SEO & Analytics</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure Google login, SEO meta tags, analytics tracking, and search engine submission for the main marketplace domain.
          </p>
        </div>

        {FIELDS.map((f, i) =>
          f.section ? (
            <h4 key={`s-${i}`} className="border-t border-border pt-4 text-sm font-bold text-heading">{f.section}</h4>
          ) : (
            <Field key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <textarea className="input" rows={2} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={boolVal(f.key)} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked ? "true" : "false" })} />
                  Enable
                </label>
              ) : (
                <input className="input" value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
              {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
            </Field>
          )
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button>
          <button type="button" disabled={busy} onClick={pingNow} className="btn-outline disabled:opacity-50">Submit sitemap to search engines</button>
        </div>

        {stats?.integrations && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <p><strong>Sitemap:</strong> <a href={stats.integrations.sitemapUrl} target="_blank" rel="noreferrer" className="text-primary underline">{stats.integrations.sitemapUrl}</a></p>
            <p className="mt-1"><strong>Robots:</strong> <a href={stats.integrations.robotsUrl} target="_blank" rel="noreferrer" className="text-primary underline">{stats.integrations.robotsUrl}</a></p>
            <p className="mt-2">After saving verification codes, confirm ownership in <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-primary underline">Google Search Console</a> and <a href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer" className="text-primary underline">Bing Webmaster Tools</a>.</p>
          </div>
        )}
      </form>

      <form onSubmit={save} className="card space-y-4 p-5">
        <div>
          <h3 className="font-bold">Contact Us page</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Content shown on the public <strong>/contact</strong> page — trade desk emails, phones and office details.
          </p>
        </div>

        <Field label="Intro paragraph">
          <textarea
            className="input"
            rows={2}
            value={contact.intro || ""}
            onChange={(e) => setContact({ ...contact, intro: e.target.value })}
          />
        </Field>

        <h4 className="border-t border-border pt-4 text-sm font-bold text-heading">Support desk</h4>
        <p className="text-xs text-muted-foreground">
          All buyer, support and contact enquiries use one line: <strong>{MAIN_SUPPORT_PHONE}</strong>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(contact.desks || DEFAULT_CONTACT.desks).map((desk) => (
            <div key={desk.id} className="rounded-lg border border-border p-4 space-y-3">
              <Field label="Desk name">
                <input className="input" value={desk.title || ""} onChange={(e) => updateDesk(desk.id, "title", e.target.value)} />
              </Field>
              <Field label="Email">
                <input className="input font-mono text-sm" type="email" value={desk.email || ""} onChange={(e) => updateDesk(desk.id, "email", e.target.value)} />
              </Field>
              <Field label="Phone (fixed)">
                <input className="input bg-muted/50" readOnly value={MAIN_SUPPORT_PHONE} />
              </Field>
            </div>
          ))}
        </div>

        <Field label="Telegram support link (optional)" hint="Used by the floating support menu — @username or https://t.me/…">
          <input
            className="input font-mono text-sm"
            value={form.main_support_telegram || ""}
            onChange={(e) => setForm({ ...form, main_support_telegram: e.target.value })}
            placeholder="@akshayaexim or https://t.me/akshayaexim"
          />
        </Field>

        <h4 className="border-t border-border pt-4 text-sm font-bold text-heading">Office</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Office / company name">
            <input className="input" value={contact.office?.name || ""} onChange={(e) => setContact({ ...contact, office: { ...contact.office, name: e.target.value } })} />
          </Field>
          <Field label="Business hours">
            <input className="input" value={contact.office?.hours || ""} onChange={(e) => setContact({ ...contact, office: { ...contact.office, hours: e.target.value } })} />
          </Field>
        </div>
        <Field label="Address">
          <textarea
            className="input"
            rows={2}
            value={contact.office?.address || ""}
            onChange={(e) => setContact({ ...contact, office: { ...contact.office, address: e.target.value } })}
          />
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">{busy ? "Saving…" : "Save contact page"}</button>
          <button type="button" disabled={busy} onClick={() => setContact(JSON.parse(JSON.stringify(DEFAULT_CONTACT)))} className="btn-outline disabled:opacity-50">
            Reset to defaults
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusCard({ label, ok, detail }) {
  return (
    <div className={`card p-3 ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-bold ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{ok ? "Active" : "Setup needed"}</div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
