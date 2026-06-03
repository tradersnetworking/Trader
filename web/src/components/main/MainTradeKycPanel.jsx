import { useEffect, useState } from "react";
import { mainApi, mainApiForm } from "../../lib/api.js";
import { validateUploadFiles } from "../../lib/upload-limits.js";
import { Alert, Badge, Field } from "../ui.jsx";
import PhoneInput from "../shared/PhoneInput.jsx";
import KycDocumentViewer from "../shared/KycDocumentViewer.jsx";
import { KYC_COUNTRIES, isIndiaCountry } from "../../lib/country-codes.js";

const DOC_FIELDS_INDIA = [
  ["photo", "Photo"], ["panDocument", "PAN"], ["aadhaarFront", "Aadhaar Front"], ["aadhaarBack", "Aadhaar Back"],
  ["addressProof", "Address Proof"], ["bankProof", "Bank Proof"], ["cancelledCheque", "Cancelled Cheque"],
];
const DOC_FIELDS_INTL = [
  ["photo", "Photo"], ["passportDocument", "Passport"], ["companyRegDoc", "Company Registration"],
  ["addressProof", "Address Proof"], ["bankProof", "Bank Proof"],
];

/** User KYC for marketplace buyer / supplier — India vs international fields */
export default function MainTradeKycPanel() {
  const [kyc, setKyc] = useState(null);
  const [form, setForm] = useState({
    partnerType: "BUYER", country: "IN", phoneCountryCode: "+91", fullName: "", companyName: "", phone: "",
    address: "", city: "", state: "", postalCode: "", panNumber: "", aadhaarNumber: "", gstNumber: "",
    passportNumber: "", taxId: "", companyRegNo: "", bankName: "", bankAccount: "", ifscCode: "", swiftCode: "",
  });
  const [files, setFiles] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [viewDocs, setViewDocs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    mainApi("/trade-kyc/mine")
      .then((d) => {
        if (d.kyc) {
          setKyc(d.kyc);
          setForm((f) => ({ ...f, ...d.kyc }));
        }
      })
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const status = kyc?.status;
  const submitted = status && !["NOT_SUBMITTED", "REJECTED"].includes(status);
  const india = isIndiaCountry(form.country);
  const docFields = india ? DOC_FIELDS_INDIA : DOC_FIELDS_INTL;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const sizeErr = validateUploadFiles(files);
    if (sizeErr) {
      setErr(sizeErr);
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v != null && v !== "") fd.append(k, v); });
    Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
    try {
      const d = await mainApiForm("/trade-kyc", fd);
      setKyc(d.kyc);
      setForm((f) => ({ ...f, ...d.kyc }));
      setMsg("KYC submitted for admin review. You can view your uploaded documents below.");
      setFiles({});
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack max-w-2xl">
      <div>
        <h3 className="font-bold">Trade partner KYC</h3>
        <p className="text-sm text-muted-foreground">Required for buyers and suppliers. Fields adapt to your country (India: PAN/Aadhaar; international: passport/tax ID).</p>
        {status && <div className="mt-2"><Badge status={status} /></div>}
      </div>
      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      {submitted && (
        <div className="card space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            {status === "APPROVED"
              ? "Your KYC is approved. Documents are locked; contact support to update."
              : status === "REJECTED"
                ? `Rejected: ${kyc?.remarks || "See admin remarks"}. Update the form and resubmit.`
                : "Your application is under review (typically 24–48 hours)."}
          </p>
          <button type="button" className="btn-outline text-sm" onClick={() => setViewDocs(true)}>
            View submitted KYC & documents
          </button>
        </div>
      )}

      <KycDocumentViewer
        open={viewDocs}
        kyc={kyc}
        onClose={() => setViewDocs(false)}
        title="Your submitted trade KYC documents"
        scope="main"
        showMissing={false}
      />

      {status !== "APPROVED" && (
        <form onSubmit={submit} className="card space-y-4 p-5">
          <Field label="I am a">
            <select className="input" value={form.partnerType} onChange={(e) => setForm({ ...form, partnerType: e.target.value })}>
              <option value="BUYER">Purchaser / Importer</option>
              <option value="SUPPLIER">Supplier / Exporter</option>
              <option value="BOTH">Both</option>
            </select>
          </Field>
          <Field label="Country">
            <select className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              {KYC_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Full name"><input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          {(form.partnerType === "SUPPLIER" || form.partnerType === "BOTH") && (
            <Field label="Company name"><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          )}
          <Field label="Phone">
            <PhoneInput
              countryCode={form.phoneCountryCode}
              phone={form.phone}
              onCountryCodeChange={(v) => setForm({ ...form, phoneCountryCode: v })}
              onPhoneChange={(v) => setForm({ ...form, phone: v })}
              required
            />
          </Field>
          <Field label="Address"><textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="State"><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
            <Field label="Postal"><input className="input" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field>
          </div>

          {india ? (
            <>
              <Field label="PAN"><input className="input font-mono uppercase" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} /></Field>
              <Field label="Aadhaar (last 4 ok for display)"><input className="input font-mono" value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} /></Field>
              <Field label="GST (if B2B)"><input className="input font-mono uppercase" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></Field>
            </>
          ) : (
            <>
              <Field label="Passport number"><input className="input font-mono" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} /></Field>
              <Field label="Tax ID / VAT"><input className="input" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></Field>
              <Field label="Company registration no."><input className="input" value={form.companyRegNo} onChange={(e) => setForm({ ...form, companyRegNo: e.target.value })} /></Field>
            </>
          )}

          <Field label="Bank name"><input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>
          <Field label="Account number"><input className="input font-mono" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></Field>
          {india ? (
            <Field label="IFSC"><input className="input font-mono uppercase" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} /></Field>
          ) : (
            <Field label="SWIFT / BIC"><input className="input font-mono uppercase" value={form.swiftCode} onChange={(e) => setForm({ ...form, swiftCode: e.target.value })} /></Field>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Upload documents (max 10 MB each)</p>
            {docFields.map(([field, label]) => (
              <Field key={field} label={label}>
                <input type="file" accept="image/*,.pdf" className="input py-1.5" onChange={(e) => setFiles({ ...files, [field]: e.target.files?.[0] || null })} />
                {kyc?.[field] && !files[field] && (
                  <p className="mt-1 text-[11px] text-muted-foreground">On file — upload only to replace</p>
                )}
              </Field>
            ))}
          </div>

          <button className="btn-gold w-full" disabled={submitting}>
            {submitting ? "Submitting…" : submitted ? "Resubmit KYC" : "Submit KYC"}
          </button>
        </form>
      )}
    </div>
  );
}
