import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
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

export default function MainSiteSettingsPanel() {
  const [form, setForm] = useState({});
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    mainApi("/admin/site-settings").then((d) => setForm(d.settings || {})).catch(() => {});
    mainApi("/admin/site-stats").then((d) => setStats(d)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const payload = { ...form };
      for (const f of FIELDS) {
        if (f.type === "checkbox" && f.key) {
          payload[f.key] = form[f.key] === true || form[f.key] === "true" ? "true" : "false";
        }
      }
      const d = await mainApi("/admin/site-settings", { method: "PUT", body: payload });
      setForm(d.settings);
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
