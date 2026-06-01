import { useCallback, useEffect, useState } from "react";
import { Alert, Field } from "../ui.jsx";
import KpiStatCard from "../invest/InvestDashboardWidgets.jsx";
import {
  DEFAULT_EMAIL_COMM_CONFIG,
  DEFAULT_EMAIL_PURPOSE_META,
  DEFAULT_EMAIL_PURPOSES,
  GROUP_ORDER,
} from "../../lib/email-communication-defaults.js";
import { MAIN_MAILBOXES, INVEST_MAILBOXES } from "../../lib/mailbox-defaults.js";

const MAIN_PURPOSE_META = {
  ...DEFAULT_EMAIL_PURPOSE_META,
  quote_received: { label: "Quote / RFQ Received", description: "When a buyer submits a quote request", group: "Trade" },
  order_confirmed: { label: "Order Confirmed", description: "When an order is confirmed", group: "Trade" },
  trade_kyc: { label: "Trade KYC Update", description: "Trade buyer/supplier KYC notifications", group: "Compliance" },
};
const MAIN_PURPOSES = Object.keys(MAIN_PURPOSE_META);
const MAIN_GROUP_ORDER = [...GROUP_ORDER, "Trade"];

function defaultsFor(portal) {
  if (portal === "main") {
    return {
      config: {
        identities: MAIN_MAILBOXES.map(({ id, label, name, address }) => ({ id, label, name, address })),
        assignments: Object.fromEntries(MAIN_PURPOSES.map((p) => [p, "noreply"])),
        autoEmails: Object.fromEntries(MAIN_PURPOSES.map((p) => [p, { enabled: true, subject: "Notification from Akshaya EXIM TRADERS" }])),
      },
      purposeMeta: MAIN_PURPOSE_META,
      purposes: MAIN_PURPOSES,
      groupOrder: MAIN_GROUP_ORDER,
    };
  }
  return {
    config: DEFAULT_EMAIL_COMM_CONFIG,
    purposeMeta: DEFAULT_EMAIL_PURPOSE_META,
    purposes: DEFAULT_EMAIL_PURPOSES,
    groupOrder: GROUP_ORDER,
  };
}

function emptyMailbox(id, label, name, address) {
  return {
    id,
    label,
    name,
    address,
    smtp: { host: "", port: "587", secure: false, user: "", pass: "" },
    imap: { host: "", port: "993", secure: true, user: "", pass: "" },
  };
}

function defaultMailboxes(portal) {
  const list = portal === "main" ? MAIN_MAILBOXES : INVEST_MAILBOXES;
  return {
    defaultMailboxId: "noreply",
    mailboxes: list.map((m) => emptyMailbox(m.id, m.label, m.name, m.address)),
  };
}

export default function PortalEmailSettingsPanel({ portal, api }) {
  const base = defaultsFor(portal);
  const domain = portal === "main" ? "akshayaexim.com" : "akshayaexim.in";

  const [config, setConfig] = useState(null);
  const [mailboxes, setMailboxes] = useState(null);
  const [purposeMeta, setPurposeMeta] = useState(base.purposeMeta);
  const [purposes, setPurposes] = useState(base.purposes);
  const [summary, setSummary] = useState(null);
  const [resolvedFrom, setResolvedFrom] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("mailboxes");
  const [testPurpose, setTestPurpose] = useState(purposes[0] || "registration");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testingBox, setTestingBox] = useState(null);
  const [emailRouting, setEmailRouting] = useState(null);
  const [routingSaving, setRoutingSaving] = useState(false);

  const effectiveDomain = emailRouting?.effectiveDomain || summary?.emailDomain || domain;
  const domainNote = portal === "main"
    ? "Main marketplace — use @akshayaexim.com addresses only."
    : emailRouting?.routingActive
      ? `Invest email routed via @${emailRouting.additionalDomain} — inbound & outbound use additional domain mailboxes.`
      : "Invest subdomain — use @akshayaexim.in addresses (or enable additional domain routing below).";

  const load = useCallback(async () => {
    const fb = defaultsFor(portal);
    setLoading(true);
    setLoadError("");
    try {
      const data = await api("/admin/settings/email-communication");
      setConfig(data.config);
      setMailboxes(data.mailboxes?.config || defaultMailboxes(portal));
      setPurposeMeta(data.purposeMeta || fb.purposeMeta);
      const nextPurposes = data.purposes || fb.purposes;
      setPurposes(nextPurposes);
      setSummary(data.summary);
      setResolvedFrom(data.resolvedFrom || {});
      setEmailRouting(data.emailRouting || data.mailboxes?.emailRouting || null);
      setTestPurpose((cur) => (nextPurposes.includes(cur) ? cur : nextPurposes[0] || "registration"));
    } catch (e) {
      setConfig(JSON.parse(JSON.stringify(fb.config)));
      setMailboxes(defaultMailboxes(portal));
      setLoadError(e.message || "Could not load — showing defaults.");
    } finally {
      setLoading(false);
    }
  }, [api, portal]);

  useEffect(() => { load(); }, [load]);

  const saveEmailDomainRouting = async (patch) => {
    if (portal !== "invest") return;
    setRoutingSaving(true);
    setLoadError("");
    setMsg("");
    try {
      const r = await api("/admin/settings/email-routing", { method: "PUT", body: patch });
      setEmailRouting(r.routing);
      setMsg(patch.enabled === false ? "Invest email reverted to @akshayaexim.in addresses." : "Invest email now routes through additional domain.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setRoutingSaving(false);
    }
  };

  const applyAdditionalDomainEmails = async () => {
    setRoutingSaving(true);
    setLoadError("");
    try {
      await api("/admin/settings/mailboxes/apply-additional-domain", { method: "POST", body: {} });
      setMsg("All 5 mailbox addresses updated to additional domain. Enter SMTP/IMAP passwords if needed, then save.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setRoutingSaving(false);
    }
  };

  const revertSubdomainEmails = async () => {
    if (!confirm("Revert all invest mailboxes to @akshayaexim.in and turn off additional-domain email routing?")) return;
    setRoutingSaving(true);
    try {
      await api("/admin/settings/mailboxes/revert-subdomain-email", { method: "POST" });
      setMsg("Mailboxes reverted to @akshayaexim.in addresses.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setRoutingSaving(false);
    }
  };

  const saveMailboxes = async () => {
    if (!mailboxes) return;
    setSaving(true);
    setMsg("");
    try {
      await api("/admin/settings/mailboxes", { method: "PUT", body: { config: mailboxes } });
      setMsg("Mailbox SMTP/IMAP credentials saved.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveRouting = async () => {
    if (!config) return;
    setSaving(true);
    setMsg("");
    try {
      await api("/admin/settings/email-communication", { method: "POST", body: { config } });
      setMsg("Mail routing & automation saved.");
      await load();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const testMailbox = async (mailboxId, type) => {
    setTestingBox(`${mailboxId}-${type}`);
    setLoadError("");
    try {
      const r = await api("/admin/settings/mailboxes/test", { method: "POST", body: { mailboxId, type } });
      setMsg(r.message || `${type.toUpperCase()} OK`);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setTestingBox(null);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return setLoadError("Enter a recipient email.");
    setTesting(true);
    setLoadError("");
    try {
      const r = await api("/admin/settings/email-communication/test", {
        method: "POST",
        body: { purpose: testPurpose, testTo: testTo.trim() },
      });
      setMsg(r.message || "Test sent.");
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setTesting(false);
    }
  };

  const updateMailbox = (id, patch) => {
    setMailboxes((prev) => ({
      ...prev,
      mailboxes: prev.mailboxes.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const updateMailboxSmtp = (id, key, value) => {
    setMailboxes((prev) => ({
      ...prev,
      mailboxes: prev.mailboxes.map((m) =>
        m.id === id ? { ...m, smtp: { ...m.smtp, [key]: value } } : m
      ),
    }));
  };

  const updateMailboxImap = (id, key, value) => {
    setMailboxes((prev) => ({
      ...prev,
      mailboxes: prev.mailboxes.map((m) =>
        m.id === id ? { ...m, imap: { ...m.imap, [key]: value } } : m
      ),
    }));
  };

  const apiGroups = [...new Set(purposes.map((p) => purposeMeta[p]?.group).filter(Boolean))];
  const allGroups = [...base.groupOrder, ...apiGroups.filter((g) => !base.groupOrder.includes(g))];
  const grouped = allGroups.map((group) => ({
    group,
    items: purposes.filter((p) => purposeMeta[p]?.group === group),
  })).filter((g) => g.items.length);

  const enabledCount = config ? purposes.filter((p) => config.autoEmails[p]?.enabled !== false).length : 0;

  const tabs = [
    { id: "mailboxes", label: "5 Mailboxes (SMTP/IMAP)" },
    { id: "routing", label: "Purpose Routing" },
    { id: "automation", label: `Auto Emails (${enabledCount}/${purposes.length})` },
    { id: "test", label: "Send Test" },
  ];

  return (
    <div className="page-stack min-w-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white">Email & Communication</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {domainNote} Configure five mailboxes with SMTP/IMAP credentials. <strong>noreply</strong> is the default sender for all automated mail until you route by purpose.
          </p>
        </div>
        <button type="button" className="btn-outline shrink-0 text-sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {loadError && <Alert type="error">{loadError}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiStatCard tone="blue" label="Default (noreply)" value={summary.defaultMailbox || summary.smtp?.from || "—"} subValue={`@${effectiveDomain}`} icon="📧" loading={loading} />
          <KpiStatCard tone="violet" label="Support Inbox" value={summary.inbox?.address || "—"} subValue="Mail desk / replies" icon="📥" loading={loading} />
          <KpiStatCard tone="amber" label="Mailboxes" value="5" subValue={`${mailboxes?.mailboxes?.filter((m) => m.smtp?.host && m.smtp?.user)?.length || 0} SMTP configured`} icon="✉️" loading={loading} />
          <KpiStatCard tone="emerald" label="Auto Emails" value={`${summary.autoEmailsEnabled}/${summary.autoEmailsTotal}`} subValue="Enabled events" icon="⚡" loading={loading} />
        </div>
      )}

      {portal === "invest" && emailRouting && (
        <div className="card space-y-4 p-4 sm:p-5">
          <div>
            <h3 className="font-bold text-navy dark:text-white">Additional domain email routing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When enabled, all five invest mailboxes send and receive through your additional domain (e.g. <span className="font-mono">@akshayainvest.com</span>) instead of <span className="font-mono">@akshayaexim.in</span>.
              Set up email forwarding at your host so mail to <span className="font-mono">@akshayaexim.in</span> still reaches the additional-domain inboxes if needed.
            </p>
          </div>

          {!emailRouting.canEnableRouting ? (
            <Alert type="info">
              No enabled additional domain found. Add one under <strong>Site &amp; API Settings → Additional invest domains</strong>, then return here to route email.
            </Alert>
          ) : (
            <>
              {emailRouting.availableDomains?.filter((d) => d.enabled).length > 1 && (
                <Field label="Additional domain for email">
                  <select
                    className="input max-w-md"
                    value={emailRouting.additionalDomainId || ""}
                    disabled={routingSaving}
                    onChange={(e) => saveEmailDomainRouting({ domainId: e.target.value })}
                  >
                    {emailRouting.availableDomains.filter((d) => d.enabled).map((d) => (
                      <option key={d.id} value={d.id}>{d.hostname}{d.note ? ` — ${d.note}` : ""}</option>
                    ))}
                  </select>
                </Field>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={emailRouting.routeEnabled === true}
                  disabled={routingSaving || !emailRouting.canEnableRouting}
                  onChange={(e) => saveEmailDomainRouting({ enabled: e.target.checked, domainId: emailRouting.additionalDomainId })}
                />
                <span>
                  <span className="block text-sm font-semibold">Route invest email through additional domain</span>
                  <span className="text-xs text-muted-foreground">
                    {emailRouting.routingActive
                      ? `Active — mailboxes use @${emailRouting.additionalDomain}`
                      : `Off — mailboxes use @${emailRouting.subdomainDomain}`}
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-gold text-sm"
                  disabled={routingSaving || !emailRouting.additionalDomain}
                  onClick={applyAdditionalDomainEmails}
                >
                  {routingSaving ? "Applying…" : `Apply @${emailRouting.additionalDomain || "domain"} to all 5 mailboxes`}
                </button>
                <button
                  type="button"
                  className="btn-outline text-sm"
                  disabled={routingSaving}
                  onClick={revertSubdomainEmails}
                >
                  Revert to @akshayaexim.in
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${tab === t.id ? "border-gold bg-gold/10 text-gold-700" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !config || !mailboxes ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <>
          {tab === "mailboxes" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Five fixed addresses per portal — add Hostinger (or your provider) SMTP/IMAP credentials for each mailbox you use.</p>
                <button type="button" className="btn-gold text-sm" onClick={saveMailboxes} disabled={saving}>{saving ? "Saving…" : "Save all mailboxes"}</button>
              </div>
              {mailboxes.mailboxes.map((box) => (
                <div key={box.id} className="card space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold">
                        {box.label}
                        {box.id === "noreply" && <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-xs text-gold-700">Default sender</span>}
                      </h3>
                      <p className="font-mono text-sm text-muted-foreground">{box.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-outline text-xs" disabled={testingBox === `${box.id}-smtp`} onClick={() => testMailbox(box.id, "smtp")}>
                        {testingBox === `${box.id}-smtp` ? "Testing…" : "Test SMTP"}
                      </button>
                      <button type="button" className="btn-outline text-xs" disabled={testingBox === `${box.id}-imap`} onClick={() => testMailbox(box.id, "imap")}>
                        {testingBox === `${box.id}-imap` ? "Testing…" : "Test IMAP"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label="Display name"><input className="input" value={box.name} onChange={(e) => updateMailbox(box.id, { name: e.target.value })} /></Field>
                    <Field label="Email address"><input className="input font-mono text-sm" type="email" value={box.address} onChange={(e) => updateMailbox(box.id, { address: e.target.value })} /></Field>
                    <Field label="Login / SMTP user"><input className="input font-mono text-sm" value={box.smtp.user} onChange={(e) => updateMailboxSmtp(box.id, "user", e.target.value)} placeholder={box.address} /></Field>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Field label="SMTP host"><input className="input" value={box.smtp.host} onChange={(e) => updateMailboxSmtp(box.id, "host", e.target.value)} placeholder="smtp.hostinger.com" /></Field>
                    <Field label="SMTP port"><input className="input" value={box.smtp.port} onChange={(e) => updateMailboxSmtp(box.id, "port", e.target.value)} /></Field>
                    <Field label="SMTP password"><input className="input" type="password" value={box.smtp.pass} onChange={(e) => updateMailboxSmtp(box.id, "pass", e.target.value)} placeholder="Leave blank to keep" /></Field>
                    <label className="flex items-end gap-2 pb-2 text-sm">
                      <input type="checkbox" checked={box.smtp.secure === true || box.smtp.secure === "true"} onChange={(e) => updateMailboxSmtp(box.id, "secure", e.target.checked)} />
                      SMTP SSL/TLS
                    </label>
                  </div>
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-semibold">IMAP (inbox sync for Mail Desk)</summary>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <Field label="IMAP host"><input className="input" value={box.imap.host} onChange={(e) => updateMailboxImap(box.id, "host", e.target.value)} placeholder="imap.hostinger.com" /></Field>
                      <Field label="IMAP port"><input className="input" value={box.imap.port} onChange={(e) => updateMailboxImap(box.id, "port", e.target.value)} /></Field>
                      <Field label="IMAP password"><input className="input" type="password" value={box.imap.pass} onChange={(e) => updateMailboxImap(box.id, "pass", e.target.value)} placeholder="Leave blank to keep" /></Field>
                      <Field label="IMAP user"><input className="input font-mono text-sm" value={box.imap.user} onChange={(e) => updateMailboxImap(box.id, "user", e.target.value)} placeholder={box.address} /></Field>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          {tab === "routing" && (
            <div className="card space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Purpose → Sender Routing</h3>
                <button type="button" className="btn-gold text-sm" onClick={saveRouting} disabled={saving}>{saving ? "Saving…" : "Save routing"}</button>
              </div>
              {grouped.map(({ group, items }) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group}</p>
                  <div className="space-y-2">
                    {items.map((purpose) => (
                      <div key={purpose} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-center">
                        <div className="sm:col-span-5">
                          <p className="text-sm font-semibold">{purposeMeta[purpose]?.label || purpose}</p>
                          <p className="text-xs text-muted-foreground">{purposeMeta[purpose]?.description}</p>
                        </div>
                        <div className="sm:col-span-3">
                          <select className="input text-sm" value={config.assignments[purpose] || "noreply"} onChange={(e) => setConfig({ ...config, assignments: { ...config.assignments, [purpose]: e.target.value } })}>
                            {config.identities.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                          </select>
                        </div>
                        <div className="text-xs text-muted-foreground sm:col-span-4">From: {resolvedFrom[purpose] || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "automation" && (
            <div className="card space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Automated Email Subjects</h3>
                <button type="button" className="btn-gold text-sm" onClick={saveRouting} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
              {purposes.map((purpose) => {
                const auto = config.autoEmails[purpose] || { enabled: true, subject: "" };
                return (
                  <div key={purpose} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-center">
                    <label className="flex items-center gap-2 sm:col-span-4">
                      <input type="checkbox" checked={auto.enabled !== false} onChange={(e) => setConfig({ ...config, autoEmails: { ...config.autoEmails, [purpose]: { ...auto, enabled: e.target.checked } } })} />
                      <span className="text-sm font-semibold">{purposeMeta[purpose]?.label || purpose}</span>
                    </label>
                    <div className="sm:col-span-8">
                      <input className="input text-sm" value={auto.subject || ""} onChange={(e) => setConfig({ ...config, autoEmails: { ...config.autoEmails, [purpose]: { ...auto, subject: e.target.value } } })} placeholder="Email subject line" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "test" && (
            <div className="card max-w-lg space-y-4 p-4 sm:p-5">
              <h3 className="font-bold">Send Test Email</h3>
              <Field label="Purpose">
                <select className="input" value={testPurpose} onChange={(e) => setTestPurpose(e.target.value)}>
                  {purposes.map((p) => <option key={p} value={p}>{purposeMeta[p]?.label || p}</option>)}
                </select>
              </Field>
              <Field label="Recipient">
                <input className="input" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
              </Field>
              <button type="button" className="btn-gold" disabled={testing} onClick={sendTest}>{testing ? "Sending…" : "Send test"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
