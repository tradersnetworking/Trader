import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { dateStr } from "../../lib/format.js";
import { Badge, Modal, Alert, Field } from "../ui.jsx";
import SignaturePad from "./SignaturePad.jsx";
import AgreementPdfViewDialog from "./AgreementPdfViewDialog.jsx";
import { fetchAgreementUserSettings, fetchAgreementAdminSettings, saveAgreementAdminSettings, fetchAgreementPdfBlob } from "../../lib/agreements-api.js";

export function InvestorAgreementsPanel({ pendingAgreementId, onPendingHandled }) {
  const [agreements, setAgreements] = useState([]);
  const [types, setTypes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState(null);
  const [pdfView, setPdfView] = useState(null);
  const [sign, setSign] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [msg, setMsg] = useState("");
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const viewOnly = !downloadEnabled;

  const load = () => {
    investApi("/agreements").then((d) => { setAgreements(d.agreements || []); setTypes(d.types || []); }).catch(() => {});
    fetchAgreementUserSettings().then((s) => setDownloadEnabled(s.userDownloadEnabled !== false)).catch(() => {});
  };

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
      setMsg("Agreement generated. Please review and sign.");
      load();
    } catch (e) { alert(e.message); }
  };

  const onSignSubmit = async () => {
    if (!signatureData) return alert("Please draw your signature first.");
    try {
      await investApi(`/agreements/${sign.id}/sign`, { method: "POST", body: { signatureData, method: "draw" } });
      setSign(null);
      setSignatureData(null);
      setMsg(viewOnly ? "Agreement signed. You can view the PDF in the popup viewer." : "Agreement signed. You can view or download the PDF.");
      load();
    } catch (e) { alert(e.message); }
  };

  const downloadPdf = async (a) => {
    try {
      const blob = await fetchAgreementPdfBlob(a.id, { download: true });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${a.agreementUid || "agreement"}.pdf`;
      link.click();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {msg && <Alert type="success">{msg}</Alert>}
      {viewOnly && (
        <Alert type="info">
          PDF download is disabled by the platform. You can <strong>view</strong> signed agreements in the popup viewer only.
        </Alert>
      )}
      {pending.length > 0 && (
        <Alert type="info">
          You have <b>{pending.length}</b> agreement{pending.length > 1 ? "s" : ""} awaiting signature.
          {pending[0] && (
            <button type="button" className="ml-2 font-bold text-amber-700 underline" onClick={() => setSign(pending[0])}>Sign now</button>
          )}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", "pending", "signed"].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-amber-500 text-black" : "bg-slate-100 dark:bg-white/5"}`}>{f}</button>
        ))}
        <select className="input ml-auto h-8 w-56 text-xs" defaultValue="" onChange={(e) => { if (e.target.value) requestLegal(e.target.value); e.target.value = ""; }}>
          <option value="">+ Request agreement</option>
          {types.map((t) => (
            <option key={t.type} value={t.type}>{t.title}{t.type === "investment" ? " (auto on subscribe)" : ""}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <b className="text-foreground">{a.title}</b>
                <p className="text-xs text-muted-foreground">{a.agreementUid || a.id.slice(-8)}{a.subscription?.plan ? ` · ${a.subscription.plan.name}` : ""}</p>
              </div>
              <Badge status={a.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{dateStr(a.createdAt)}{a.signedAt && ` · Signed ${dateStr(a.signedAt)}`}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-outline text-xs" onClick={() => setView(a)}>Preview text</button>
              <button type="button" className="btn-outline text-xs" onClick={() => setPdfView(a)}>View PDF</button>
              {downloadEnabled && a.status === "SIGNED" && (
                <button type="button" className="btn-outline text-xs" onClick={() => downloadPdf(a)}>Download PDF</button>
              )}
              {a.status === "PENDING_SIGNATURE" && (
                <button type="button" className="btn-gold text-xs" onClick={() => { setSign(a); setSignatureData(null); }}>Sign</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground">No agreements yet. Subscribe to a plan to auto-generate your investment agreement.</p>}
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title} wide>
        {view?.agreementUid && <p className="mb-2 text-xs text-muted-foreground">Ref: {view.agreementUid}</p>}
        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm">{view?.content}</pre>
      </Modal>

      <AgreementPdfViewDialog
        open={!!pdfView}
        agreementId={pdfView?.id}
        agreementUid={pdfView?.agreementUid}
        allowDownload={downloadEnabled}
        onClose={() => setPdfView(null)}
      />

      <Modal open={!!sign} onClose={() => { setSign(null); setSignatureData(null); }} title={`Sign: ${sign?.title || "Agreement"}`} wide>
        <p className="mb-2 text-xs text-muted-foreground">Review the agreement, then draw your signature. A branded PDF is generated on sign (KYC & plan details auto-filled).</p>
        <pre className="mb-4 max-h-40 overflow-y-auto rounded-lg bg-muted/40 p-3 text-xs whitespace-pre-wrap">{sign?.content?.slice(0, 2500)}{sign?.content?.length > 2500 ? "…" : ""}</pre>
        <SignaturePad onChange={setSignatureData} />
        <button type="button" className="btn-gold mt-3 w-full" onClick={onSignSubmit} disabled={!signatureData}>Confirm & generate PDF</button>
      </Modal>
    </div>
  );
}

export function AdminAgreementsPanel({ isSuper }) {
  const [tab, setTab] = useState("generated");
  const [agreements, setAgreements] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [types, setTypes] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pdfView, setPdfView] = useState(null);
  const [form, setForm] = useState({ investorId: "", type: "investment" });
  const [previewInvestorId, setPreviewInvestorId] = useState("");
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const viewOnly = !downloadEnabled;
  const [settingsMsg, setSettingsMsg] = useState("");

  const load = () => {
    investApi("/admin/agreements").then((d) => setAgreements(d.agreements || [])).catch(() => {});
    investApi("/admin/agreement-templates").then((d) => { setTemplates(d.templates || []); setTypes(d.types || []); }).catch(() => {});
    investApi("/admin/agreement-templates/placeholders").then((d) => setPlaceholders(d.placeholders || [])).catch(() => {});
    investApi("/admin/investors?take=200").then((d) => setInvestors(d.investors || [])).catch(() => {});
    if (isSuper) fetchAgreementAdminSettings().then((s) => setDownloadEnabled(s.userDownloadEnabled !== false)).catch(() => {});
  };

  useEffect(() => { load(); }, [isSuper]);

  const saveTemplate = async () => {
    await investApi(`/admin/agreement-templates/${edit.type}`, { method: "PUT", body: edit });
    setEdit(null);
    load();
  };

  const copyDefault = async (type) => {
    const d = await investApi(`/admin/agreement-templates/default/${type}`);
    setEdit({ type, title: d.template.title, content: d.template.content, version: "3.0" });
  };

  const previewTemplate = async () => {
    if (!previewInvestorId) return alert("Select an investor for preview");
    const r = await investApi("/admin/agreement-templates/preview", {
      method: "POST",
      body: { investorId: previewInvestorId, type: edit?.type, title: edit?.title, content: edit?.content },
    });
    setPreview(r);
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

  const toggleViewOnly = async (viewOnlyMode) => {
    setDownloadEnabled(!viewOnlyMode);
    await saveAgreementAdminSettings({ viewOnlyMode });
    setSettingsMsg(
      viewOnlyMode
        ? "View-only ON — investors see PDF in popup only (no download)."
        : "View-only OFF — investors can download signed PDFs."
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["generated", "templates", "placeholders"].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {isSuper && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="font-semibold">Investor agreement PDF — view-only mode</div>
            <div className="text-xs text-muted-foreground">
              <strong>ON</strong> — investors can only view PDF in popup (download blocked).
              <br />
              <strong>OFF</strong> — investors can download signed agreements.
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <span className={viewOnly ? "text-amber-600" : "text-muted-foreground"}>{viewOnly ? "ON" : "OFF"}</span>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={viewOnly}
              onChange={(e) => toggleViewOnly(e.target.checked)}
            />
          </label>
        </div>
      )}
      {settingsMsg && <Alert type="success">{settingsMsg}</Alert>}

      {tab === "generated" && (
        <>
          <form onSubmit={generate} className="card flex flex-wrap items-end gap-3 p-4">
            <Field label="Investor">
              <select className="input" required value={form.investorId} onChange={(e) => setForm({ ...form, investorId: e.target.value })}>
                <option value="">— Select —</option>
                {investors.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </Field>
            <Field label="Agreement type">
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {types.map((t) => <option key={t.type} value={t.type}>{t.title}</option>)}
              </select>
            </Field>
            <button className="btn-gold">Generate for investor</button>
          </form>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Investor</th><th className="p-3">Ref / Title</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {agreements.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">{a.investor?.name}<div className="text-xs text-muted-foreground">{a.investor?.email}</div></td>
                    <td className="p-3 font-mono text-xs">{a.agreementUid || a.title}</td>
                    <td className="p-3">{a.subscription?.plan?.name || "—"}</td>
                    <td className="p-3"><Badge status={a.status} /></td>
                    <td className="p-3">{dateStr(a.createdAt)}</td>
                    <td className="p-3 text-right space-x-2">
                      <button type="button" className="text-xs font-semibold text-primary" onClick={() => setPdfView(a)}>PDF</button>
                      {a.status !== "REVOKED" && a.status !== "PURGED" && (
                        <button type="button" className="text-xs text-rose-500" onClick={() => revoke(a.id)}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "templates" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {!isSuper && <Alert type="info">Only Super Admin can edit templates.</Alert>}
          {templates.map((t) => (
            <div key={t.type} className="card p-4">
              <div className="flex justify-between gap-2"><b>{t.title}</b><span className="text-xs text-muted-foreground">v{t.version}</span></div>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</p>
              {isSuper && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="text-xs font-semibold text-primary" onClick={() => setEdit({ ...t })}>Edit</button>
                  <button type="button" className="text-xs text-muted-foreground" onClick={() => copyDefault(t.type)}>Reset from default</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "placeholders" && (
        <div className="card max-h-[70vh] overflow-y-auto p-4">
          <p className="mb-3 text-sm text-muted-foreground">Use these tokens in templates — auto-filled from KYC, profile, and subscription data when agreements are generated.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {placeholders.map((p) => (
              <div key={p.key} className="rounded-lg bg-muted/40 p-2 text-xs">
                <code className="font-bold text-primary">{`{{${p.key}}}`}</code>
                <div className="text-muted-foreground">{p.label} · {p.group}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!edit} onClose={() => { setEdit(null); setPreview(null); }} title={`Edit: ${edit?.title}`} wide>
        <Field label="Title"><input className="input" value={edit?.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
        <Field label="Content (markdown with ## sections and {{PLACEHOLDERS}})">
          <textarea className="input font-mono text-xs" rows={14} value={edit?.content || ""} onChange={(e) => setEdit({ ...edit, content: e.target.value })} />
        </Field>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Preview as investor">
            <select className="input" value={previewInvestorId} onChange={(e) => setPreviewInvestorId(e.target.value)}>
              <option value="">— Select —</option>
              {investors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <button type="button" className="btn-outline text-sm" onClick={previewTemplate}>Preview filled</button>
        </div>
        {preview && (
          <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-muted/40 p-3 text-xs whitespace-pre-wrap">{preview.filledContent}</pre>
        )}
        <button type="button" className="btn-gold mt-3 w-full" onClick={saveTemplate}>Save Template</button>
      </Modal>

      <AgreementPdfViewDialog admin open={!!pdfView} agreementId={pdfView?.id} agreementUid={pdfView?.agreementUid} onClose={() => setPdfView(null)} />
    </div>
  );
}
