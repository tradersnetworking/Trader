import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { Alert, Field } from "../ui.jsx";

export default function NotInvestedInvestorsPanel() {
  const [investors, setInvestors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [subject, setSubject] = useState("Start your investment journey with Akshaya EXIM TRADERS");
  const [body, setBody] = useState(
    "Dear {name},\n\nYou registered on our invest portal but haven't subscribed to an investment plan yet.\n\nLog in to explore Bronze, Silver, Gold and other plans with transparent monthly returns.\n\n— Akshaya EXIM TRADERS Team"
  );
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => investApi("/admin/investors/not-invested").then((d) => setInvestors(d.investors || [])).catch(() => {});
  useEffect(() => { load(); }, []);

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

  const sendEmail = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const html = body.split("\n").map((l) => `<p>${l || "&nbsp;"}</p>`).join("");
      const r = await investApi("/admin/investors/not-invested/email", {
        method: "POST",
        body: {
          subject,
          html,
          text: body,
          investorIds: selected.size ? [...selected] : undefined,
        },
      });
      setMsg(`Email sent to ${r.sent} of ${r.total} investor(s).`);
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
        <h3 className="font-bold">Registered — not yet invested</h3>
        <p className="text-sm text-muted-foreground">
          Investors who signed up but have no active investment plan. Send a nurture email encouraging them to invest.
        </p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <div className="card space-y-3 p-5">
        <Field label="Email subject"><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Email body (use {'{name}'} for investor name)">
          <textarea className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <button type="button" disabled={busy || !investors.length} onClick={sendEmail} className="btn-gold disabled:opacity-50">
          {busy ? "Sending…" : selected.size ? `Email ${selected.size} selected` : `Email all ${investors.length}`}
        </button>
      </div>

      <div className="app-table-wrap card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3"><input type="checkbox" checked={selected.size === investors.length && investors.length > 0} onChange={selectAll} /></th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">KYC</th>
              <th className="p-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {investors.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3"><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>
                <td className="p-3 font-medium">{i.name}</td>
                <td className="p-3 text-muted-foreground">{i.email}</td>
                <td className="p-3">{i.kyc?.status || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{dateStr(i.createdAt)}</td>
              </tr>
            ))}
            {!investors.length && <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">All registered investors have at least one investment.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
