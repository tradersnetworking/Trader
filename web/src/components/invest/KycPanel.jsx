import { useMemo, useState } from "react";

import { getToken, investApi } from "../../lib/api.js";

import { Badge, Field, Alert } from "../ui.jsx";
import PhoneInput from "../shared/PhoneInput.jsx";

import {

  KYC_DOCUMENT_FIELDS,

  isValidPan,

  isValidAadhaar,

  normalizePan,

  normalizeAadhaar,

  validateKycFile,

  filenameFromUrl,

  KYC_ACCEPT_DOCS,

  KYC_ACCEPT_IMAGE,

} from "../../lib/kyc-document-fields.js";



const STEPS = [

  { n: 0, title: "Personal" },

  { n: 1, title: "Identity" },

  { n: 2, title: "Banking" },

  { n: 3, title: "Review" },

];



const ID_TYPES = [

  { value: "PAN", label: "PAN Card" },

  { value: "AADHAAR", label: "Aadhaar Card" },

  { value: "PASSPORT", label: "Passport" },

  { value: "DRIVERS_LICENSE", label: "Driver's License" },

];



function initForm(kyc) {

  return {

    fullName: kyc?.fullName || "",

    dob: kyc?.dob || "",

    phone: kyc?.phone || "",

    phoneCountryCode: kyc?.phoneCountryCode || "+91",

    country: kyc?.country || "India",

    city: kyc?.city || "",

    state: kyc?.state || "",

    address: kyc?.address || "",

    idType: kyc?.idType || "PAN",

    idNumber: kyc?.idNumber || "",

    panNumber: kyc?.panNumber || "",

    aadhaarNumber: kyc?.aadhaarNumber || "",

    bankName: kyc?.bankName || "",

    bankAccount: kyc?.bankAccount || "",

    ifscCode: kyc?.ifscCode || "",

    branchName: kyc?.branchName || "",

    upiId: kyc?.upiId || "",

    taxId: kyc?.taxId || "",

  };

}



export default function KycPanel({ kyc, onRefresh }) {

  const [tab, setTab] = useState("kyc");

  const [step, setStep] = useState(0);

  const [form, setForm] = useState(() => initForm(kyc));

  const [files, setFiles] = useState({});

  const [msg, setMsg] = useState("");

  const [err, setErr] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [confirmed, setConfirmed] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));



  const submitted = kyc?.status && !["NOT_SUBMITTED", "REJECTED"].includes(kyc.status);

  const canEdit = !submitted || kyc?.status === "REJECTED";



  const existingDocs = useMemo(

    () => KYC_DOCUMENT_FIELDS.filter((f) => kyc?.[f.key]).map((f) => ({ ...f, url: kyc[f.key] })),

    [kyc]

  );



  const saveAccounts = async () => {

    setErr("");

    setMsg("");

    try {

      await investApi("/payout-details", {

        method: "PUT",

        body: {

          upiId: form.upiId,

          bankName: form.bankName,

          accountNumber: form.bankAccount,

          ifsc: form.ifscCode,

          branchName: form.branchName,

        },

      });

      setMsg("Payout details saved.");

      onRefresh?.();

    } catch (e) {

      setErr(e.message);

    }

  };



  const hasDoc = (key) => files[key] || kyc?.[key];



  const validateStep = (s) => {

    if (s === 0) {

      if (!form.fullName.trim()) return "Full name is required";

      if (!form.address.trim()) return "Address is required";

      if (!form.phone.trim()) return "Phone number is required";

    }

    if (s === 1) {

      if (!isValidPan(form.panNumber)) return "Enter a valid PAN (e.g. ABCDE1234F)";

      if (!isValidAadhaar(form.aadhaarNumber)) return "Enter a valid 12-digit Aadhaar number";

      if (!hasDoc("photo")) return "Passport size photo is required";

      if (!hasDoc("panDocument")) return "PAN card photocopy is required";

      const aadhaarOk =

        (hasDoc("aadhaarFront") && hasDoc("aadhaarBack")) || hasDoc("aadhaarDocument");

      if (!aadhaarOk) return "Upload Aadhaar front & back, or a single Aadhaar PDF/image";

      for (const [key, file] of Object.entries(files)) {

        const def = KYC_DOCUMENT_FIELDS.find((d) => d.key === key);

        const fileErr = validateKycFile(file, { imageOnly: def?.imageOnly });

        if (fileErr) return `${def?.label || key}: ${fileErr}`;

      }

    }

    if (s === 2) {

      if (!form.bankName.trim()) return "Bank name is required";

      if (!form.bankAccount.trim()) return "Account number is required";

      if (!form.ifscCode.trim()) return "IFSC code is required";

    }

    return null;

  };



  const goNext = () => {

    const v = validateStep(step);

    if (v) {

      setErr(v);

      return;

    }

    setErr("");

    setStep((s) => s + 1);

  };



  const submit = async () => {

    setErr("");

    setMsg("");

    if (!confirmed) {

      setErr("Please confirm the declaration before submitting.");

      return;

    }

    for (let i = 0; i < 3; i++) {

      const v = validateStep(i);

      if (v) {

        setErr(v);

        setStep(i);

        return;

      }

    }

    setSubmitting(true);

    const fd = new FormData();

    const payload = {

      ...form,

      panNumber: normalizePan(form.panNumber),

      aadhaarNumber: normalizeAadhaar(form.aadhaarNumber),

      idNumber: form.idNumber || normalizePan(form.panNumber) || normalizeAadhaar(form.aadhaarNumber),

    };

    Object.entries(payload).forEach(([k, v]) => fd.append(k, v || ""));

    Object.entries(files).forEach(([k, f]) => f && fd.append(k, f));

    try {

      const res = await fetch("/api/invest/kyc", {

        method: "POST",

        headers: { Authorization: `Bearer ${getToken("invest")}` },

        body: fd,

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Submission failed");

      setMsg("KYC submitted for admin review. Our team will verify within 24–48 hours.");

      setFiles({});

      onRefresh?.();

    } catch (e) {

      setErr(e.message);

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="page-stack max-w-3xl">

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">

        {[

          ["kyc", "KYC Details"],

          ["accounts", "Account Details"],

        ].map(([id, label]) => (

          <button

            key={id}

            type="button"

            onClick={() => setTab(id)}

            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${

              tab === id

                ? "bg-primary/15 text-accent-tone"

                : "text-muted-foreground hover:bg-muted"

            }`}

          >

            {label}

          </button>

        ))}

        <div className="ml-auto">

          <Badge status={kyc?.status || "NOT SUBMITTED"} />

        </div>

      </div>



      {tab === "accounts" && (

        <div className="card max-w-xl space-y-3 p-5 sm:p-6">

          <h3 className="font-bold text-foreground">Payout Accounts</h3>

          <p className="text-sm text-muted-foreground">

            Update your UPI ID and bank account for withdrawals anytime.

          </p>

          {err && tab === "accounts" && <Alert type="error">{err}</Alert>}

          {msg && tab === "accounts" && <Alert type="success">{msg}</Alert>}

          <Field label="UPI ID">

            <input className="input" value={form.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="name@upi" />

          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <Field label="Bank Name"><input className="input" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>

            <Field label="Branch"><input className="input" value={form.branchName} onChange={(e) => set("branchName", e.target.value)} /></Field>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <Field label="Account Number"><input className="input" value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} /></Field>

            <Field label="IFSC"><input className="input" value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value)} placeholder="SBIN0001234" /></Field>

          </div>

          <button type="button" className="btn-gold w-full" onClick={saveAccounts}>Save Payout Details</button>

        </div>

      )}



      {tab === "kyc" && submitted ? (

        <KycStatusView kyc={kyc} docs={existingDocs} />

      ) : tab === "kyc" && (

        <div className="card p-5 sm:p-6">

          {kyc?.status === "REJECTED" && kyc.remarks && (

            <Alert type="error">Application rejected: {kyc.remarks}. Please correct and resubmit.</Alert>

          )}



          <Stepper step={step} />



          {err && <div className="mt-4"><Alert type="error">{err}</Alert></div>}

          {msg && <div className="mt-4"><Alert type="success">{msg}</Alert></div>}



          {step === 0 && (

            <div className="mt-4 space-y-3">

              <Field label="Full Legal Name">

                <input className="input" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="As per PAN / Aadhaar" />

              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <Field label="Phone Number">

                  <PhoneInput
                    countryCode={form.phoneCountryCode}
                    phone={form.phone}
                    onCountryCodeChange={(v) => set("phoneCountryCode", v)}
                    onPhoneChange={(v) => set("phone", v)}
                    required
                  />

                </Field>

                <Field label="Date of Birth">

                  <input className="input" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />

                </Field>

              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                <Field label="Country"><input className="input" value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>

                <Field label="State"><input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>

                <Field label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>

              </div>

              <Field label="Full Address">

                <textarea className="input" rows={3} required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House no., street, pincode" />

              </Field>

            </div>

          )}



          {step === 1 && (

            <div className="mt-4 space-y-4">

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">

                For Indian investors: PAN number, Aadhaar number, passport-size photo, and photocopies of PAN & Aadhaar are required. Upload images (JPG, PNG) or PDF up to 10 MB.

              </div>



              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <Field label="PAN Number *">

                  <input

                    className="input uppercase"

                    value={form.panNumber}

                    onChange={(e) => set("panNumber", e.target.value.toUpperCase())}

                    placeholder="ABCDE1234F"

                    maxLength={10}

                  />

                </Field>

                <Field label="Aadhaar Number *">

                  <input

                    className="input"

                    value={form.aadhaarNumber}

                    onChange={(e) => set("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}

                    placeholder="12-digit Aadhaar"

                    inputMode="numeric"

                  />

                </Field>

              </div>



              <Field label="Primary ID Type">

                <select className="input" value={form.idType} onChange={(e) => set("idType", e.target.value)}>

                  {ID_TYPES.map((t) => (

                    <option key={t.value} value={t.value}>{t.label}</option>

                  ))}

                </select>

              </Field>



              {form.idType === "PASSPORT" && (

                <Field label="Passport Number">

                  <input className="input" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />

                </Field>

              )}



              <div className="space-y-3">

                <UploadField

                  label="Passport Size Photo *"

                  hint="Recent colour photo, white background, face clearly visible (35×45 mm style)"

                  name="photo"

                  accept={KYC_ACCEPT_IMAGE}

                  imageOnly

                  required

                  files={files}

                  setFiles={setFiles}

                  existingUrl={kyc?.photo}

                />

                <UploadField

                  label="PAN Card (photocopy) *"

                  hint="Clear scan or photo of your PAN card — image or PDF"

                  name="panDocument"

                  accept={KYC_ACCEPT_DOCS}

                  required

                  files={files}

                  setFiles={setFiles}

                  existingUrl={kyc?.panDocument}

                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <UploadField

                    label="Aadhaar Front *"

                    name="aadhaarFront"

                    accept={KYC_ACCEPT_DOCS}

                    files={files}

                    setFiles={setFiles}

                    existingUrl={kyc?.aadhaarFront}

                  />

                  <UploadField

                    label="Aadhaar Back *"

                    name="aadhaarBack"

                    accept={KYC_ACCEPT_DOCS}

                    files={files}

                    setFiles={setFiles}

                    existingUrl={kyc?.aadhaarBack}

                  />

                </div>

                <UploadField

                  label="Aadhaar (single file alternative)"

                  hint="Or upload one combined Aadhaar PDF/image instead of front & back"

                  name="aadhaarDocument"

                  accept={KYC_ACCEPT_DOCS}

                  files={files}

                  setFiles={setFiles}

                  existingUrl={kyc?.aadhaarDocument}

                />

                {form.idType === "PASSPORT" && (

                  <UploadField

                    label="Passport Document"

                    name="passportDocument"

                    accept={KYC_ACCEPT_DOCS}

                    files={files}

                    setFiles={setFiles}

                    existingUrl={kyc?.passportDocument}

                  />

                )}

                <UploadField

                  label="Address Proof"

                  hint="Utility bill, bank statement, or rental agreement (not older than 3 months)"

                  name="addressProof"

                  accept={KYC_ACCEPT_DOCS}

                  files={files}

                  setFiles={setFiles}

                  existingUrl={kyc?.addressProof}

                />

                <UploadField

                  label="Selfie Verification"

                  hint="Selfie holding your ID beside your face"

                  name="selfie"

                  accept={KYC_ACCEPT_IMAGE}

                  imageOnly

                  files={files}

                  setFiles={setFiles}

                  existingUrl={kyc?.selfie}

                />

                <UploadField

                  label="Signature"

                  hint="Sign on white paper and upload a clear photo or scan"

                  name="signature"

                  accept={KYC_ACCEPT_DOCS}

                  files={files}

                  setFiles={setFiles}

                  existingUrl={kyc?.signature}

                />

              </div>

            </div>

          )}



          {step === 2 && (

            <div className="mt-4 space-y-3">

              <Field label="Bank Name *">

                <input className="input" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />

              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <Field label="Account Number *">

                  <input className="input" value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} />

                </Field>

                <Field label="IFSC Code *">

                  <input className="input" value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value.toUpperCase())} placeholder="SBIN0001234" />

                </Field>

              </div>

              <Field label="Branch Name">

                <input className="input" value={form.branchName} onChange={(e) => set("branchName", e.target.value)} />

              </Field>

              <Field label="UPI ID">

                <input className="input" value={form.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="name@upi" />

              </Field>

              <Field label="Tax ID (optional)">

                <input className="input" value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />

              </Field>

              <UploadField

                label="Cancelled Cheque"

                hint="For bank account verification — image or PDF"

                name="cancelledCheque"

                accept={KYC_ACCEPT_DOCS}

                files={files}

                setFiles={setFiles}

                existingUrl={kyc?.cancelledCheque}

              />

            </div>

          )}



          {step === 3 && (

            <div className="mt-4 space-y-4 text-sm">

              <p className="font-bold text-foreground">Review your application</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {[

                  ["Full Name", form.fullName],

                  ["Phone", form.phone],

                  ["Address", form.address],

                  ["PAN", normalizePan(form.panNumber)],

                  ["Aadhaar", normalizeAadhaar(form.aadhaarNumber)],

                  ["Bank", form.bankName],

                  ["Account", form.bankAccount],

                  ["IFSC", form.ifscCode],

                ].map(([l, v]) => (

                  <div key={l}>

                    <p className="text-muted-foreground">{l}</p>

                    <p className="font-medium break-words">{v || "—"}</p>

                  </div>

                ))}

              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">

                <p className="text-xs text-muted-foreground leading-relaxed">

                  Documents selected:{" "}

                  {KYC_DOCUMENT_FIELDS.filter((f) => hasDoc(f.key))

                    .map((f) => f.label)

                    .join(", ") || "None"}

                </p>

              </div>

              <label className="flex items-start gap-2 text-xs text-muted-foreground">

                <input

                  type="checkbox"

                  className="mt-0.5"

                  checked={confirmed}

                  onChange={(e) => setConfirmed(e.target.checked)}

                />

                I confirm all information is accurate and belongs to me. I understand that falsification of documents is a legal offense.

              </label>

            </div>

          )}



          <div className="mt-6 flex flex-col-reverse gap-2 xs:flex-row xs:justify-between">

            {step > 0 ? (

              <button type="button" className="btn-outline flex-1 xs:flex-none" onClick={() => { setErr(""); setStep((s) => s - 1); }}>

                Back

              </button>

            ) : (

              <span />

            )}

            {step < 3 ? (

              <button type="button" className="btn-gold flex-1 xs:flex-none" onClick={goNext}>Next Step</button>

            ) : (

              <button type="button" className="btn-gold flex-1 xs:flex-none" disabled={submitting} onClick={submit}>

                {submitting ? "Submitting…" : "Submit Application"}

              </button>

            )}

          </div>



          {canEdit && existingDocs.length > 0 && step === 0 && (

            <div className="mt-6 border-t border-border pt-4">

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previously uploaded</p>

              <KycDocumentsList docs={existingDocs} compact />

            </div>

          )}

        </div>

      )}

    </div>

  );

}



function Stepper({ step }) {

  return (

    <div className="overflow-x-auto scrollbar-none -mx-1 px-1">

      <div className="relative flex min-w-[280px] justify-between px-2">

        <div className="absolute left-0 top-5 -z-10 h-0.5 w-full bg-border" />

        {STEPS.map((s) => (

          <div key={s.n} className="flex flex-col items-center gap-2 shrink-0">

            <div

              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition ${

                step >= s.n

                  ? "border-primary bg-primary text-primary-foreground"

                  : "border-border bg-card text-muted-foreground"

              }`}

            >

              {step > s.n ? "✓" : s.n + 1}

            </div>

            <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s.n ? "text-accent-tone" : "text-muted-foreground"}`}>

              {s.title}

            </span>

          </div>

        ))}

      </div>

    </div>

  );

}



function KycStatusView({ kyc, docs }) {

  const verified = kyc.status === "APPROVED";

  return (

    <div className="card space-y-4 p-5 sm:p-6 text-center sm:text-left">

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">

        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 ${verified ? "border-emerald-500/50 bg-emerald-500/15" : "border-amber-500/50 bg-amber-500/15"}`}>

          <span className="text-2xl">{verified ? "✓" : "⏳"}</span>

        </div>

        <div className="min-w-0">

          <h2 className="text-xl font-bold text-foreground">

            KYC {verified ? "Verified" : "Under Review"}

          </h2>

          <p className="mt-1 text-sm text-muted-foreground">

            {verified

              ? "Your account is fully verified. You can invest and withdraw without limits."

              : "We have received your application and our compliance team is reviewing it (24–48 hours)."}

          </p>

        </div>

      </div>



      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">

        <InfoTile label="Applicant" value={kyc.fullName} />

        <InfoTile label="Submitted" value={kyc.createdAt ? new Date(kyc.createdAt).toLocaleDateString("en-IN") : "—"} />

        <InfoTile label="PAN" value={kyc.panNumber} />

        <InfoTile label="Aadhaar" value={kyc.aadhaarNumber ? `XXXX XXXX ${kyc.aadhaarNumber.slice(-4)}` : "—"} />

      </div>



      {kyc.remarks && <Alert type="info">Remarks: {kyc.remarks}</Alert>}



      <div>

        <h3 className="mb-2 text-sm font-semibold text-foreground">Uploaded Documents</h3>

        {verified && (

          <p className="mb-2 text-[11px] text-muted-foreground">

            Approved documents are locked. Contact support to request changes.

          </p>

        )}

        <KycDocumentsList docs={docs} />

      </div>

    </div>

  );

}



function InfoTile({ label, value }) {

  return (

    <div className="rounded-lg border border-border bg-muted/40 p-3 text-left">

      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>

      <p className="truncate text-sm font-medium">{value || "—"}</p>

    </div>

  );

}



function KycDocumentsList({ docs, compact }) {

  if (!docs?.length) {

    return <p className="py-3 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>;

  }

  return (

    <div className={`divide-y divide-border rounded-lg border border-border bg-muted/30 ${compact ? "text-xs" : "text-sm"}`}>

      {docs.map((d) => (

        <div key={d.key} className={`flex items-center justify-between gap-3 ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}>

          <div className="min-w-0 text-left">

            <p className="truncate font-medium text-foreground">{d.label}</p>

            <p className="truncate text-[11px] text-muted-foreground">{filenameFromUrl(d.url)}</p>

          </div>

          <a

            href={d.url}

            target="_blank"

            rel="noreferrer"

            className="btn-outline shrink-0 px-2 py-1 text-xs"

          >

            View

          </a>

        </div>

      ))}

    </div>

  );

}



function UploadField({ label, hint, name, accept, imageOnly, required, files, setFiles, existingUrl }) {

  const file = files[name];

  const [localErr, setLocalErr] = useState("");



  const onChange = (e) => {

    const f = e.target.files?.[0];

    if (!f) return;

    const err = validateKycFile(f, { imageOnly });

    if (err) {

      setLocalErr(err);

      e.target.value = "";

      return;

    }

    setLocalErr("");

    setFiles((prev) => ({ ...prev, [name]: f }));

  };



  const preview = file?.type?.startsWith("image/") ? URL.createObjectURL(file) : null;



  return (

    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4">

      <div className="mb-2 flex items-start justify-between gap-2">

        <div>

          <p className="text-xs font-semibold text-foreground">

            {label}

            {required && <span className="text-rose-500"> *</span>}

          </p>

          {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}

        </div>

        {existingUrl && !file && (

          <span className="badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Uploaded</span>

        )}

      </div>

      {preview && (

        <img src={preview} alt="" className="mb-2 h-20 w-20 rounded-lg border border-border object-cover" onLoad={() => URL.revokeObjectURL(preview)} />

      )}

      {file && !preview && (

        <p className="mb-2 truncate text-xs text-muted-foreground">{file.name}</p>

      )}

      {existingUrl && !file && (

        <p className="mb-2 truncate text-[11px] text-muted-foreground">Current: {filenameFromUrl(existingUrl)}</p>

      )}

      <input

        type="file"

        accept={accept}

        className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"

        onChange={onChange}

      />

      {localErr && <p className="mt-1 text-[11px] text-rose-500">{localErr}</p>}

    </div>

  );

}

