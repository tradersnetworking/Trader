import { useEffect, useState } from "react";

import { investApi } from "../../lib/api.js";

import { dateStr } from "../../lib/format.js";

import { Badge, Modal, Alert, Field } from "../ui.jsx";

import SignaturePad from "./SignaturePad.jsx";



export function InvestorAgreementsPanel({ pendingAgreementId, onPendingHandled }) {

  const [agreements, setAgreements] = useState([]);

  const [types, setTypes] = useState([]);

  const [filter, setFilter] = useState("all");

  const [view, setView] = useState(null);

  const [sign, setSign] = useState(null);

  const [signatureData, setSignatureData] = useState(null);

  const [msg, setMsg] = useState("");



  const load = () => investApi("/agreements").then((d) => { setAgreements(d.agreements || []); setTypes(d.types || []); }).catch(() => {});

  useEffect(() => { load(); }, []);



  useEffect(() => {

    if (!pendingAgreementId || !agreements.length) return;

    const ag = agreements.find((a) => a.id === pendingAgreementId);

    if (ag?.status === "PENDING_SIGNATURE") {

      setSign(ag);

      onPendingHandled?.();

    }

  }, [pendingAgreementId, agreements, onPendingHandled]);



  const pending = agreements.filter((a) => a.status === "PENDING_SIGNATURE");

  const filtered = agreements.filter((a) => {

    if (filter === "pending") return a.status === "PENDING_SIGNATURE";

    if (filter === "signed") return a.status === "SIGNED";

    return true;

  });



  const requestLegal = async (type) => {

    if (type === "investment") {

      alert("Investment agreements are auto-generated when you subscribe to a plan.");

      return;

    }

    try {

      await investApi("/agreements/generate", { method: "POST", body: { type } });

      load();

    } catch (e) { alert(e.message); }

  };



  const onSignSubmit = async () => {

    if (!signatureData) return alert("Please draw your signature first.");

    try {

      await investApi(`/agreements/${sign.id}/sign`, { method: "POST", body: { signatureData } });

      setSign(null);

      setSignatureData(null);

      setMsg("Agreement signed successfully.");

      load();

    } catch (e) { alert(e.message); }

  };



  const legalTypes = types.filter((t) => t.type !== "investment");



  return (

    <div className="space-y-4">

      {msg && <Alert type="success">{msg}</Alert>}

      {pending.length > 0 && (

        <Alert type="info">

          You have <b>{pending.length}</b> agreement{pending.length > 1 ? "s" : ""} awaiting your signature.

          {pending[0] && (

            <button type="button" className="ml-2 font-bold text-amber-700 underline" onClick={() => setSign(pending[0])}>

              Sign now

            </button>

          )}

        </Alert>

      )}



      <div className="flex flex-wrap gap-2">

        {["all", "pending", "signed"].map((f) => (

          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-amber-500 text-black" : "bg-slate-100 dark:bg-white/5"}`}>{f}</button>

        ))}

        {legalTypes.length > 0 && (

          <select className="input ml-auto h-8 w-52 text-xs" defaultValue="" onChange={(e) => { if (e.target.value) requestLegal(e.target.value); e.target.value = ""; }}>

            <option value="">+ Request legal document</option>

            {legalTypes.map((t) => <option key={t.type} value={t.type}>{t.title}</option>)}

          </select>

        )}

      </div>



      <div className="grid gap-3 md:grid-cols-2">

        {filtered.map((a) => (

          <div key={a.id} className="card p-4">

            <div className="flex justify-between gap-2">

              <div className="min-w-0">

                <b className="text-navy dark:text-white">{a.title}</b>

                {a.subscription?.plan && (

                  <p className="text-xs text-slate-400">{a.subscription.plan.name} · {a.agreementUid || a.id.slice(-8)}</p>

                )}

              </div>

              <Badge status={a.status} />

            </div>

            <p className="mt-1 text-xs text-slate-400">{dateStr(a.createdAt)} {a.signedAt && `· Signed ${dateStr(a.signedAt)}`}</p>

            <div className="mt-3 flex gap-2">

              <button type="button" className="btn-outline text-xs" onClick={() => setView(a)}>View</button>

              {a.status === "PENDING_SIGNATURE" && <button type="button" className="btn-gold text-xs" onClick={() => { setSign(a); setSignatureData(null); }}>Sign</button>}

            </div>

          </div>

        ))}

        {filtered.length === 0 && <p className="text-slate-400">No agreements. Subscribe to a plan to auto-generate your investment agreement.</p>}

      </div>



      <Modal open={!!view} onClose={() => setView(null)} title={view?.title} wide>

        {view?.agreementUid && <p className="mb-2 text-xs text-slate-400">Ref: {view.agreementUid}</p>}

        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{view?.content}</pre>

      </Modal>



      <Modal open={!!sign} onClose={() => { setSign(null); setSignatureData(null); }} title={`Sign: ${sign?.title || "Agreement"}`} wide>

        <p className="mb-2 text-xs text-slate-500">Review the agreement below, then draw your signature (auto-filled with your KYC & plan details).</p>

        <pre className="mb-4 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap dark:bg-white/5">{sign?.content?.slice(0, 2000)}{sign?.content?.length > 2000 ? "…" : ""}</pre>

        <SignaturePad onChange={setSignatureData} />

        <button type="button" className="btn-gold mt-3 w-full" onClick={onSignSubmit} disabled={!signatureData}>Confirm Signature</button>

      </Modal>

    </div>

  );

}



export function AdminAgreementsPanel({ isSuper }) {

  const [tab, setTab] = useState("generated");

  const [agreements, setAgreements] = useState([]);

  const [templates, setTemplates] = useState([]);

  const [types, setTypes] = useState([]);

  const [edit, setEdit] = useState(null);

  const [form, setForm] = useState({ investorId: "", type: "investment" });



  const load = () => {

    investApi("/admin/agreements").then((d) => setAgreements(d.agreements || [])).catch(() => {});

    investApi("/admin/agreement-templates").then((d) => { setTemplates(d.templates || []); setTypes(d.types || []); }).catch(() => {});

  };

  useEffect(() => { load(); }, []);



  const saveTemplate = async () => {

    await investApi(`/admin/agreement-templates/${edit.type}`, { method: "PUT", body: edit });

    setEdit(null);

    load();

  };



  const generate = async (e) => {

    e.preventDefault();

    await investApi("/admin/agreements/generate", { method: "POST", body: form });

    load();

  };



  const revoke = async (id) => {

    if (confirm("Revoke agreement?")) {

      await investApi(`/admin/agreements/${id}/revoke`, { method: "POST", body: {} });

      load();

    }

  };



  return (

    <div className="space-y-4">

      <div className="flex gap-2">

        {["generated", "templates"].map((t) => (

          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "text-slate-500"}`}>{t}</button>

        ))}

      </div>



      {tab === "generated" && (

        <>

          <form onSubmit={generate} className="card flex flex-wrap items-end gap-3 p-4">

            <Field label="Investor ID"><input className="input" required value={form.investorId} onChange={(e) => setForm({ ...form, investorId: e.target.value })} placeholder="cuid from investors list" /></Field>

            <Field label="Type">

              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>

                {types.map((t) => <option key={t.type} value={t.type}>{t.title}</option>)}

              </select>

            </Field>

            <button className="btn-gold">Generate</button>

          </form>

          <div className="overflow-x-auto card">

            <table className="w-full text-sm">

              <thead className="bg-slate-50 text-left text-xs uppercase dark:bg-white/5"><tr><th className="p-3">Investor</th><th className="p-3">Title</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3"></th></tr></thead>

              <tbody>

                {agreements.map((a) => (

                  <tr key={a.id} className="border-t dark:border-white/5">

                    <td className="p-3">{a.investor?.name}<div className="text-xs text-slate-400">{a.investor?.email}</div></td>

                    <td className="p-3">{a.agreementUid || a.title}</td>

                    <td className="p-3">{a.subscription?.plan?.name || "—"}</td>

                    <td className="p-3"><Badge status={a.status} /></td>

                    <td className="p-3">{dateStr(a.createdAt)}</td>

                    <td className="p-3">{a.status !== "REVOKED" && a.status !== "PURGED" && <button type="button" className="text-xs text-rose-500" onClick={() => revoke(a.id)}>Revoke</button>}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </>

      )}



      {tab === "templates" && (

        <div className="grid gap-3">

          {!isSuper && <Alert type="info">Only Super Admin can edit templates.</Alert>}

          {templates.map((t) => (

            <div key={t.type} className="card p-4">

              <div className="flex justify-between"><b>{t.title}</b><span className="text-xs text-slate-400">v{t.version}</span></div>

              {isSuper && <button type="button" className="mt-2 text-xs font-semibold text-amber-600" onClick={() => setEdit({ ...t })}>Edit template</button>}

            </div>

          ))}

        </div>

      )}



      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit: ${edit?.title}`} wide>

        <Field label="Title"><input className="input" value={edit?.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>

        <Field label="Content (markdown + {{PLACEHOLDERS}})"><textarea className="input font-mono text-xs" rows={12} value={edit?.content || ""} onChange={(e) => setEdit({ ...edit, content: e.target.value })} /></Field>

        <button type="button" className="btn-gold mt-3 w-full" onClick={saveTemplate}>Save Template</button>

      </Modal>

    </div>

  );

}


