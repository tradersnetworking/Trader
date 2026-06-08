import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { isKycFullySubmitted } from "../../lib/kyc-full-submit.js";
import { Alert, Field } from "../ui.jsx";

function kycListStatus(kyc) {
  if (!kyc?.status || kyc.status === "NOT_SUBMITTED") return "Not submitted";
  if (kyc.status === "PENDING" && !isKycFullySubmitted(kyc)) return "Incomplete";
  return kyc.status;
}

/**
 * Shared admin nurture UI: member list + email + WhatsApp outreach.
 */
export default function InvestorNurturePanel({
  title,
  subtitle,
  listPath,
  notifyPath,
  defaultSubject,
  defaultEmailBody,
  defaultWhatsAppBody,
  emptyMessage,
  manageHref,
}) {
  const [investors, setInvestors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultEmailBody);
  const [whatsappBody, setWhatsappBody] = useState(defaultWhatsAppBody);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await investApi(listPath);
      setInvestors(d.investors || []);
    } catch (e) {
      setErr(e.message || "Could not load members.");
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [listPath]);

  const toggle = (id) => {
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

  const authLabel = (i) => {
    if (i.authMethod === "google") return "Google";
    if (i.authMethod === "password") return "Email";
    if (i.authMethod === "google_and_password") return "Google + Email";
    if (i.hasGoogle) return i.hasPassword ? "Google + Email" : "Google";
    return "Email";
  };

  const sendOutreach = async () => {
    if (!sendEmail && !sendWhatsApp) {
      setErr("Select at least one channel: Email or WhatsApp.");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const html = body.split("\n").map((l) => `<p>${l || "&nbsp;"}</p>`).join("");
      const r = await investApi(notifyPath, {
        method: "POST",
        body: {
          subject,
          html,
          text: body,
          whatsappMessage: whatsappBody,
          sendEmail,
          sendWhatsApp,
          investorIds: selected.size ? [...selected] : undefined,
        },
      });
      const parts = [];
      if (r.email) parts.push(`Email: ${r.email.sent}/${r.total}`);
      if (r.whatsapp) {
        parts.push(`WhatsApp: ${r.whatsapp.sent}/${r.whatsapp.total}${r.whatsapp.skipped ? ` (${r.whatsapp.skipped} skipped — no number)` : ""}`);
      }
      setMsg(parts.join(" · ") || "Done.");
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <div className="card space-y-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outreach channels</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} />
            WhatsApp (Business API template)
          </label>
        </div>
        {sendEmail && (
          <>
            <Field label="Email subject">
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Email body (use {'{name}'} for investor name)">
              <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </>
        )}
        {sendWhatsApp && (
          <Field label="WhatsApp message (use {'{name}'} — sent via your configured utility template)">
            <textarea className="input" rows={4} value={whatsappBody} onChange={(e) => setWhatsappBody(e.target.value)} />
          </Field>
        )}
        <button
          type="button"
          disabled={busy || !investors.length || (!sendEmail && !sendWhatsApp)}
          onClick={sendOutreach}
          className="btn-gold disabled:opacity-50"
        >
          {busy ? "Sending…" : selected.size ? `Notify ${selected.size} selected` : `Notify all ${investors.length}`}
        </button>
        <p className="text-xs text-muted-foreground">
          WhatsApp requires a valid mobile on the profile or KYC. Configure API under Super Admin → WhatsApp Business API.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{investors.length}</strong> member{investors.length === 1 ? "" : "s"}
          {selected.size > 0 && <> · <strong className="text-foreground">{selected.size}</strong> selected</>}
        </span>
        <button type="button" className="btn-outline ml-auto text-xs" disabled={loading} onClick={load}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="app-table-wrap card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={selected.size === investors.length && investors.length > 0}
                  onChange={selectAll}
                />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Sign-in</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">KYC</th>
              <th className="p-3">Registered</th>
              {manageHref && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={manageHref ? 8 : 7} className="p-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              investors.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                  </td>
                  <td className="p-3 font-medium">{i.name}</td>
                  <td className="p-3">
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold">{authLabel(i)}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{i.email}</td>
                  <td className="p-3 text-xs text-muted-foreground">{i.phone || i.kyc?.phone || "—"}</td>
                  <td className="p-3 text-xs">{kycListStatus(i.kyc)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{dateStr(i.createdAt)}</td>
                  {manageHref && (
                    <td className="p-3 text-right">
                      <Link
                        to={`${manageHref}${i.id}`}
                        className="btn-gold inline-block px-2 py-1 text-xs"
                      >
                        Manage
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            {!loading && !investors.length && (
              <tr>
                <td colSpan={manageHref ? 8 : 7} className="p-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
