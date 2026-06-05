import { useEffect, useMemo, useState } from "react";
import { investApiForm } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import KycDocumentField from "./KycDocumentField.jsx";
import { KYC_DOCUMENT_FIELDS } from "../../lib/kyc-document-fields.js";
import { validateUploadFiles } from "../../lib/upload-limits.js";
import { makeAdminKycApi } from "../../lib/admin-kyc-upload.js";

const BANK_PROOF_TYPES = [
  { value: "CHEQUE", label: "Cancelled cheque" },
  { value: "PASSBOOK", label: "Passbook" },
  { value: "STATEMENT", label: "Bank statement" },
];

const STEPS = ["Details & bank", "Documents", "Save"];

/**
 * Admin / Super Admin: KYC on behalf of investor — per-file upload, auto-save, resume.
 */
export default function AdminInvestorKycManageForm({ detail, setDetail, onSaved, onError }) {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState({});
  const [stagedUploads, setStagedUploads] = useState({});
  const [fileHashes, setFileHashes] = useState({});
  const [busy, setBusy] = useState(false);
  const [localMsg, setLocalMsg] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [draftResumed, setDraftResumed] = useState(false);

  const investorId = detail?.id;
  const adminKyc = useMemo(() => (investorId ? makeAdminKycApi(investorId) : null), [investorId]);

  useEffect(() => {
    if (!adminKyc || !investorId) return;
    adminKyc
      .loadDraft()
      .then((d) => {
        if (d.uploads) setStagedUploads((prev) => ({ ...prev, ...d.uploads }));
        if (typeof d.step === "number" && d.step >= 0 && d.step < STEPS.length) {
          setStep(d.step);
          if (d.resumed) setDraftResumed(true);
        }
        if (d.form) {
          const { form } = adminKyc.unpackKycDraftForm(d.form);
          if (form && Object.keys(form).length) {
            setDetail((prev) => ({
              ...prev,
              name: form.fullName || prev.name,
              phone: form.phone || prev.phone,
              upiId: form.upiId || prev.upiId,
              bankName: form.bankName || prev.bankName,
              accountNumber: form.bankAccount || prev.accountNumber,
              ifsc: form.ifscCode || prev.ifsc,
              kyc: { ...(prev.kyc || {}), ...form, bankAccount: form.bankAccount, ifscCode: form.ifscCode },
            }));
          }
        }
      })
      .catch(() => {});
  }, [investorId, adminKyc]);

  const persistDraft = () => {
    if (!adminKyc || !detail) return Promise.resolve();
    const form = {
      fullName: detail.kyc?.fullName || detail.name,
      phone: detail.phone,
      upiId: detail.upiId,
      bankName: detail.bankName,
      bankAccount: detail.accountNumber,
      ifscCode: detail.ifsc,
      panNumber: detail.kyc?.panNumber,
      aadhaarNumber: detail.kyc?.aadhaarNumber,
      address: detail.kyc?.address,
      bankProofType: detail.kyc?.bankProofType,
      status: detail.kyc?.status,
    };
    return adminKyc.saveDraft({ step, form }).catch(() => {});
  };

  useEffect(() => {
    if (!adminKyc) return undefined;
    const t = window.setTimeout(() => persistDraft(), 900);
    return () => window.clearTimeout(t);
  }, [detail, step, adminKyc]);

  if (!detail || !adminKyc) return null;

  const setKyc = (key, value) => setDetail({ ...detail, kyc: { ...(detail.kyc || {}), [key]: value } });
  const setFile = (key, file) => setFiles((prev) => ({ ...prev, [key]: file || undefined }));

  const handleStaged = (name, upload, hash) => {
    setStagedUploads((prev) => {
      const next = { ...prev };
      if (!upload) delete next[name];
      else next[name] = upload;
      return next;
    });
    if (hash) setFileHashes((h) => ({ ...h, [name]: hash }));
    else if (!upload) {
      setFileHashes((h) => {
        const next = { ...h };
        delete next[name];
        return next;
      });
    }
    persistDraft();
  };

  const submit = async (e) => {
    e.preventDefault();
    setLocalMsg("");
    setLocalErr("");
    const sizeErr = validateUploadFiles(files);
    if (sizeErr) {
      setLocalErr(sizeErr);
      onError?.(sizeErr);
      return;
    }
    const fd = new FormData();
    fd.append("name", detail.name || "");
    fd.append("phone", detail.phone || "");
    fd.append("upiId", detail.upiId || "");
    fd.append("bankName", detail.bankName || "");
    fd.append("accountNumber", detail.accountNumber || "");
    fd.append("ifsc", detail.ifsc || "");
    fd.append("fullName", detail.kyc?.fullName || detail.name || "");
    fd.append("panNumber", detail.kyc?.panNumber || "");
    fd.append("aadhaarNumber", detail.kyc?.aadhaarNumber || "");
    fd.append("address", detail.kyc?.address || "");
    fd.append("status", detail.kyc?.status || "APPROVED");
    fd.append("bankProofType", detail.kyc?.bankProofType || "CHEQUE");
    if (detail.kyc?.remarks) fd.append("remarks", detail.kyc.remarks);
    Object.entries(files).forEach(([k, f]) => f && fd.append(k, f));
    setBusy(true);
    try {
      const d = await investApiForm(`/admin/investors/${detail.id}/kyc`, fd);
      setDetail((prev) => ({ ...prev, ...d.investor, kyc: d.investor?.kyc }));
      setFiles({});
      setLocalMsg(d.message || "KYC, bank details and documents saved.");
      onSaved?.(d.investor);
    } catch (err) {
      setLocalErr(err.message);
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-3xl space-y-4 p-5">
      <div>
        <h4 className="font-bold text-foreground">KYC on behalf of investor</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload each document separately — shows <strong>Uploaded</strong> per file. Progress auto-saves; resume anytime.
        </p>
      </div>

      {draftResumed && (
        <Alert type="success">
          Resuming saved KYC progress for this investor (step {step + 1} of {STEPS.length}).
        </Alert>
      )}

      {localMsg && <Alert type="success">{localMsg}</Alert>}
      {localErr && <Alert type="error">{localErr}</Alert>}

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${step === i ? "bg-gold text-white" : "bg-muted text-muted-foreground"}`}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className="input" value={detail.name || ""} onChange={(e) => setDetail({ ...detail, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={detail.phone || ""} onChange={(e) => setDetail({ ...detail, phone: e.target.value })} />
          </Field>
          <Field label="UPI ID">
            <input className="input" value={detail.upiId || ""} onChange={(e) => setDetail({ ...detail, upiId: e.target.value })} />
          </Field>
          <Field label="Bank name">
            <input className="input" value={detail.bankName || ""} onChange={(e) => setDetail({ ...detail, bankName: e.target.value })} />
          </Field>
          <Field label="Account number">
            <input className="input" value={detail.accountNumber || ""} onChange={(e) => setDetail({ ...detail, accountNumber: e.target.value })} />
          </Field>
          <Field label="IFSC">
            <input className="input" value={detail.ifsc || ""} onChange={(e) => setDetail({ ...detail, ifsc: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="PAN">
            <input className="input" value={detail.kyc?.panNumber || ""} onChange={(e) => setKyc("panNumber", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Aadhaar">
            <input className="input" value={detail.kyc?.aadhaarNumber || ""} onChange={(e) => setKyc("aadhaarNumber", e.target.value)} />
          </Field>
          <Field label="KYC status">
            <select className="input" value={detail.kyc?.status || "NOT_SUBMITTED"} onChange={(e) => setKyc("status", e.target.value)}>
              <option value="NOT_SUBMITTED">Not submitted</option>
              <option value="PENDING">Pending review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Field>
          <Field label="Bank proof type">
            <select className="input" value={detail.kyc?.bankProofType || "CHEQUE"} onChange={(e) => setKyc("bankProofType", e.target.value)}>
              {BANK_PROOF_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <textarea className="input" rows={2} value={detail.kyc?.address || ""} onChange={(e) => setKyc("address", e.target.value)} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {detail.kyc && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Already on file</p>
              <KycDocumentsList kyc={detail.kyc} scope="invest" compact />
            </div>
          )}
          <p className="text-sm font-semibold text-foreground">Upload documents (saved per file)</p>
          {KYC_DOCUMENT_FIELDS.map(({ key, label, imageOnly }) => (
            <KycDocumentField
              key={key}
              label={label}
              name={key}
              imageOnly={imageOnly}
              allowCamera={imageOnly}
              existingUrl={detail.kyc?.[key]}
              stagedUploads={stagedUploads}
              fileHashes={fileHashes}
              onStaged={handleStaged}
              uploadDocument={adminKyc.uploadDocument.bind(adminKyc)}
              deleteDocument={adminKyc.deleteDocument.bind(adminKyc)}
            />
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Alert type="info">
            Review details and documents. Staged uploads are included automatically. Click save to finalize KYC for this investor.
          </Alert>
          <p className="text-sm text-muted-foreground">
            Uploaded slots: {Object.keys(stagedUploads).filter((k) => stagedUploads[k]?.url).length} / {KYC_DOCUMENT_FIELDS.length}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {step > 0 && (
          <button type="button" className="btn-outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="btn-gold" onClick={() => { persistDraft(); setStep((s) => s + 1); }}>
            Next
          </button>
        )}
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? "Saving…" : "Save KYC, bank & documents"}
        </button>
      </div>
    </form>
  );
}
