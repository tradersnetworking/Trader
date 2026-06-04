import { useState } from "react";
import { investApiForm } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import { KYC_DOCUMENT_FIELDS, KYC_ACCEPT_DOCS } from "../../lib/kyc-document-fields.js";
import { validateUploadFiles } from "../../lib/upload-limits.js";

const BANK_PROOF_TYPES = [
  { value: "CHEQUE", label: "Cancelled cheque" },
  { value: "PASSBOOK", label: "Passbook" },
  { value: "STATEMENT", label: "Bank statement" },
];

/**
 * Admin / Super Admin: full KYC + bank + document upload for an existing investor.
 */
export default function AdminInvestorKycManageForm({ detail, setDetail, onSaved, onError }) {
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [localMsg, setLocalMsg] = useState("");
  const [localErr, setLocalErr] = useState("");

  if (!detail) return null;

  const setKyc = (key, value) => setDetail({ ...detail, kyc: { ...(detail.kyc || {}), [key]: value } });
  const setFile = (key, file) => setFiles((prev) => ({ ...prev, [key]: file || undefined }));

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
        <h4 className="font-bold text-foreground">KYC, bank & documents</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload or replace KYC documents on behalf of the investor. Files are optional on each save — existing documents are kept if not replaced.
        </p>
      </div>

      {localMsg && <Alert type="success">{localMsg}</Alert>}
      {localErr && <Alert type="error">{localErr}</Alert>}

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

      {detail.kyc && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current documents</p>
          <KycDocumentsList kyc={detail.kyc} scope="invest" compact />
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">Upload / replace documents</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {KYC_DOCUMENT_FIELDS.map(({ key, label, imageOnly }) => (
            <Field key={key} label={label} hint={files[key] ? files[key].name : "Leave empty to keep existing"}>
              <input
                type="file"
                accept={imageOnly ? "image/jpeg,image/png,image/webp" : KYC_ACCEPT_DOCS}
                className="input py-1.5 text-xs"
                onChange={(e) => setFile(key, e.target.files?.[0] || null)}
              />
            </Field>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-gold w-full sm:w-auto" disabled={busy}>
        {busy ? "Saving…" : "Save KYC, bank & documents"}
      </button>
    </form>
  );
}
