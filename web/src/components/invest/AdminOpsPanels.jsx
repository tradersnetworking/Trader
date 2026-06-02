import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Field, Alert } from "../ui.jsx";
import { PartnersCmsPanel } from "./AdminExtrasPanels.jsx";
import DataPortabilityPanel from "../shared/DataPortabilityPanel.jsx";

/* -------- Wallet Operations -------- */
export function WalletOperationsPanel() {
  const [investors, setInvestors] = useState([]);
  const [form, setForm] = useState({
    investorId: "",
    amount: "",
    direction: "CREDIT",
    bucket: "available",
    note: "Manual adjustment by admin",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    investApi("/admin/investors").then((d) => setInvestors((d.investors || []).filter((i) => i.role === "INVESTOR"))).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await investApi("/admin/wallet/adjust", { method: "POST", body: { ...form, amount: Number(form.amount) } });
      setMsg("Wallet adjusted successfully.");
      setForm((f) => ({ ...f, amount: "", note: "" }));
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div className="page-stack max-w-xl">
      <h2 className="text-lg font-bold">Wallet Operations</h2>
      <p className="text-sm text-muted-foreground">
        Manually credit or debit an investor wallet (available, invested, or earnings). Each change is recorded in the ledger as a manual admin adjustment.
      </p>
      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}
      <form onSubmit={submit} className="card space-y-3 p-5">
        <Field label="Investor">
          <select className="input" required value={form.investorId} onChange={(e) => setForm({ ...form, investorId: e.target.value })}>
            <option value="">Select investor…</option>
            {investors.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.email}) — {inr(i.wallet?.available || 0)} avail</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Direction">
            <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="CREDIT">Credit (+)</option>
              <option value="DEBIT">Debit (−)</option>
            </select>
          </Field>
          <Field label="Bucket">
            <select className="input" value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })}>
              <option value="available">Available</option>
              <option value="invested">Invested</option>
              <option value="earnings">Earnings</option>
            </select>
          </Field>
        </div>
        <Field label="Amount (₹)"><input className="input" type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="Note"><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason for adjustment" /></Field>
        <button className="btn-gold w-full">Apply Adjustment</button>
      </form>
    </div>
  );
}

/* -------- Homepage CMS -------- */
export function HomepageCmsPanel() {
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("hero");

  const load = () => investApi("/admin/settings").then((d) => setForm(d.settings || {})).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await investApi("/admin/settings", { method: "PUT", body: form });
      setMsg("Homepage content saved.");
    } catch (e2) {
      setMsg(e2.message);
    }
  };

  return (
    <div className="page-stack">
      <div>
        <h2 className="text-lg font-bold">Homepage Content</h2>
        <p className="text-sm text-muted-foreground">Manage public landing page copy, sections, and partners.</p>
      </div>
      {msg && <Alert type={msg.includes("saved") ? "success" : "error"}>{msg}</Alert>}
      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {[["hero", "Hero"], ["about", "About"], ["sections", "Sections"], ["partners", "Partners"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === id ? "bg-primary/15 text-accent-tone" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      {(tab === "hero" || tab === "about" || tab === "sections") && (
        <form onSubmit={save} className="card max-w-2xl space-y-3 p-5">
          {tab === "hero" && (
            <>
              <Field label="Hero title"><input className="input" value={form.homepage_hero_title || ""} onChange={(e) => set("homepage_hero_title", e.target.value)} /></Field>
              <Field label="Hero subtitle"><textarea className="input min-h-[5rem]" value={form.homepage_hero_subtitle || ""} onChange={(e) => set("homepage_hero_subtitle", e.target.value)} /></Field>
            </>
          )}
          {tab === "about" && (
            <>
              <Field label="About title"><input className="input" value={form.homepage_about_title || ""} onChange={(e) => set("homepage_about_title", e.target.value)} /></Field>
              <Field label="About body"><textarea className="input min-h-[6rem]" value={form.homepage_about_body || ""} onChange={(e) => set("homepage_about_body", e.target.value)} /></Field>
              <Field label="Company name"><input className="input" value={form.about_company_name || ""} onChange={(e) => set("about_company_name", e.target.value)} /></Field>
              <Field label="Tagline"><input className="input" value={form.about_company_tagline || ""} onChange={(e) => set("about_company_tagline", e.target.value)} /></Field>
              <Field label="Credentials"><textarea className="input" value={form.about_company_credentials || ""} onChange={(e) => set("about_company_credentials", e.target.value)} /></Field>
            </>
          )}
          {tab === "sections" && (
            <>
              <Field label="Show ROI calculator"><select className="input" value={form.homepage_show_calculator || "true"} onChange={(e) => set("homepage_show_calculator", e.target.value)}><option value="true">Yes</option><option value="false">No</option></select></Field>
              <Field label="Show partners strip"><select className="input" value={form.homepage_show_partners || "true"} onChange={(e) => set("homepage_show_partners", e.target.value)}><option value="true">Yes</option><option value="false">No</option></select></Field>
              <Field label="Show trust stats"><select className="input" value={form.homepage_show_trust_stats || "true"} onChange={(e) => set("homepage_show_trust_stats", e.target.value)}><option value="true">Yes</option><option value="false">No</option></select></Field>
            </>
          )}
          <button className="btn-gold">Save Content</button>
        </form>
      )}
      {tab === "partners" && <PartnersCmsPanel />}
    </div>
  );
}

/* -------- Notification Management -------- */
export function NotificationManagementPanel() {
  const [notifications, setNotifications] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [form, setForm] = useState({ investorId: "", title: "", body: "", type: "INFO", link: "" });
  const [msg, setMsg] = useState("");

  const load = () => {
    investApi("/admin/notifications/recent").then((d) => setNotifications(d.notifications || [])).catch(() => {});
    investApi("/admin/investors").then((d) => setInvestors((d.investors || []).filter((i) => i.role === "INVESTOR"))).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await investApi("/admin/notifications/send", { method: "POST", body: form });
      setMsg("Notification sent.");
      setForm({ investorId: "", title: "", body: "", type: "INFO", link: "" });
      load();
    } catch (e2) {
      setMsg(e2.message);
    }
  };

  return (
    <div className="page-stack">
      <h2 className="text-lg font-bold">Notification Management</h2>
      <p className="text-sm text-muted-foreground">Send targeted in-app notifications to individual investors.</p>
      {msg && <Alert type={msg.includes("sent") ? "success" : "error"}>{msg}</Alert>}
      <form onSubmit={send} className="card max-w-xl space-y-3 p-5">
        <Field label="Investor">
          <select className="input" required value={form.investorId} onChange={(e) => setForm({ ...form, investorId: e.target.value })}>
            <option value="">Select…</option>
            {investors.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.email}</option>)}
          </select>
        </Field>
        <Field label="Title"><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Message"><textarea className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <Field label="Link tab (optional)"><input className="input" placeholder="e.g. deposit, kyc" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
        <button className="btn-gold">Send Notification</button>
      </form>
      <div className="card p-5">
        <h3 className="mb-3 font-bold">Recent Notifications</h3>
        <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-lg border border-border p-3">
              <div className="font-semibold">{n.title}</div>
              <div className="text-muted-foreground">{n.investor?.name} • {new Date(n.createdAt).toLocaleString()}</div>
              {n.body && <p className="mt-1">{n.body}</p>}
            </div>
          ))}
          {!notifications.length && <p className="text-muted-foreground">No notifications yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* -------- Backup & Export -------- */
export function BackupExportPanel({ canImport = false }) {
  return <DataPortabilityPanel portal="invest" canImport={canImport} />;
}
