import { useEffect, useMemo, useRef, useState } from "react";
import { kycSubmitReadiness } from "../../lib/kyc-submit-readiness.js";
import { isKycFullySubmitted } from "../../lib/kyc-full-submit.js";

import { investApi, investApiForm } from "../../lib/api.js";
import { validateUploadFiles } from "../../lib/upload-limits.js";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";

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
import KycSignatureField from "./KycSignatureField.jsx";
import KycDocumentField from "./KycDocumentField.jsx";
import { saveKycDraftApi, unpackKycDraftForm } from "../../lib/kyc-upload.js";
import SecureUploadLink from "./SecureUploadLink.jsx";
import { validateSignatureBase64 } from "../../lib/signatureQuality.js";
import {
  initKycForm,
  GUARDIAN_TYPES,
  BANK_PROOF_TYPES,
  PRIMARY_ID_TYPES,
  resolvePrimaryIdNumber,
  primaryIdTypeLabel,
  guardianFieldLabel,
} from "../../lib/kycForm.js";
import KycSectionOverview from "./KycSectionOverview.jsx";
import InvestorApprovedViewButtons from "./InvestorApprovedViewButtons.jsx";
import {
  canEditSection,
  isSectionApproved,
  isSectionRejected,
  parseSectionReviews,
  KYC_SECTION_LABELS,
  needsPartialResubmit,
} from "../../lib/kyc-sections.js";



const STEPS = [

  { n: 0, title: "Personal" },

  { n: 1, title: "Identity" },

  { n: 2, title: "Banking" },

  { n: 3, title: "Review" },

];



function initForm(kyc) {
  return initKycForm(kyc);
}

/** Wraps a KYC step section with sectional review status (approved / rejected / editable). */
function SectionFieldset({ section, kyc, children }) {
  const editable = !kyc || canEditSection(kyc, section);
  const rejected = kyc && isSectionRejected(kyc, section);
  const approved = kyc && isSectionApproved(kyc, section);
  const remarks = parseSectionReviews(kyc)?.[section]?.remarks;

  return (
    <fieldset
      className={`min-w-0 space-y-3 rounded-xl border p-4 ${
        rejected
          ? "border-rose-500/40 bg-rose-500/5"
          : approved
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border"
      }`}
    >
      <legend className="px-1 text-sm font-bold text-foreground">
        {KYC_SECTION_LABELS[section]}
        {approved && (
          <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">Approved</span>
        )}
        {rejected && (
          <span className="ml-2 text-xs font-normal text-rose-700 dark:text-rose-400">Needs correction</span>
        )}
      </legend>
      {rejected && remarks && <Alert type="error">{remarks}</Alert>}
      {approved && !editable && (
        <p className="text-xs text-muted-foreground">This section is approved — no changes needed.</p>
      )}
      <div className={!editable ? "pointer-events-none opacity-80" : undefined}>{children}</div>
    </fieldset>
  );
}

export default function KycPanel({
  kyc,
  investor,
  onRefresh,
  pendingPayoutChange,
  pendingKycRevision,
  forced = false,
  initialSubTab,
}) {

  const [tab, setTab] = useState(() => (initialSubTab === "accounts" ? "accounts" : "kyc"));

  useEffect(() => {
    if (initialSubTab === "accounts" && !forced) setTab("accounts");
  }, [initialSubTab, forced]);
  const [revisionMode, setRevisionMode] = useState(false);
  const [payoutProofFiles, setPayoutProofFiles] = useState({});

  const [step, setStep] = useState(0);
  const stepTopRef = useRef(null);

  const [form, setForm] = useState(() => initForm(kyc));

  const [files, setFiles] = useState({});
  const [stagedUploads, setStagedUploads] = useState({});
  const [fileHashes, setFileHashes] = useState({});
  const [signatureMode, setSignatureMode] = useState(() => (kyc?.signatureData ? "draw" : kyc?.signature ? "upload" : "draw"));
  const [signatureData, setSignatureData] = useState(kyc?.signatureData || null);
  const [signatureFile, setSignatureFile] = useState(null);

  const [msg, setMsg] = useState("");

  const [err, setErr] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [confirmed, setConfirmed] = useState(false);
  const [draftResumed, setDraftResumed] = useState(false);
  const [resumeStep, setResumeStep] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const persistDraft = (overrides = {}) => {
    if (!canEdit || submitted) return Promise.resolve();
    return saveKycDraftApi({
      step: overrides.step ?? step,
      form: overrides.form ?? form,
      signatureData: overrides.signatureData ?? signatureData,
      signatureMode: overrides.signatureMode ?? signatureMode,
    }).catch(() => {});
  };

  const onIdTypeChange = (nextType) => {
    set("idType", nextType);
    set("idNumber", "");
    setFiles((prev) => {
      const next = { ...prev };
      delete next.passportDocument;
      delete next.driversLicenseDocument;
      return next;
    });
    setStagedUploads((prev) => {
      const next = { ...prev };
      delete next.passportDocument;
      delete next.driversLicenseDocument;
      return next;
    });
  };

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

  const submitted =
    kyc?.status === "APPROVED" || (kyc?.status === "PENDING" && isKycFullySubmitted(kyc));

  const canEdit =
    !submitted ||
    kyc?.status === "REJECTED" ||
    (kyc?.status === "PENDING" && !isKycFullySubmitted(kyc)) ||
    revisionMode;

  useEffect(() => {
    if (submitted && !revisionMode) return;
    investApi("/kyc/draft")
      .then((d) => {
        if (d.uploads) setStagedUploads((prev) => ({ ...prev, ...d.uploads }));
        const canRestoreDraft =
          !submitted ||
          revisionMode ||
          !kyc ||
          kyc.status === "NOT_SUBMITTED" ||
          kyc.status === "REJECTED" ||
          (kyc.status === "PENDING" && !isKycFullySubmitted(kyc));
        if (d.form && canRestoreDraft) {
          const { form: draftForm, signatureData: draftSig, signatureMode: draftSigMode } = unpackKycDraftForm(d.form);
          if (draftForm && Object.keys(draftForm).length) {
            setForm((f) => ({ ...f, ...draftForm }));
          }
          if (draftSig) setSignatureData(draftSig);
          if (draftSigMode) setSignatureMode(draftSigMode);
        }
        if (typeof d.step === "number" && d.step >= 0 && d.step < STEPS.length && canRestoreDraft) {
          setStep(d.step);
          if (d.resumed) {
            setDraftResumed(true);
            setResumeStep(d.step);
          }
        }
      })
      .catch(() => {});
  }, [kyc?.id, submitted, revisionMode]);

  useEffect(() => {
    if (!canEdit || submitted) return undefined;
    const t = window.setTimeout(() => {
      persistDraft();
    }, 900);
    return () => window.clearTimeout(t);
  }, [form, step, signatureData, signatureMode, canEdit, submitted]);

  const existingDocs = useMemo(

    () => KYC_DOCUMENT_FIELDS.filter((f) => kyc?.[f.key]).map((f) => ({ ...f, url: kyc[f.key] })),

    [kyc]

  );



  const saveAccounts = async () => {
    setErr("");
    setMsg("");
    const sizeErr = validateUploadFiles(payoutProofFiles);
    if (sizeErr) {
      setErr(sizeErr);
      return;
    }
    try {
      if (kyc?.status === "APPROVED") {
        const fd = new FormData();
        fd.append("upiId", form.upiId || "");
        fd.append("bankName", form.bankName || "");
        fd.append("accountNumber", form.bankAccount || "");
        fd.append("ifscCode", form.ifscCode || "");
        fd.append("branchName", form.branchName || "");
        fd.append("bankProofType", form.bankProofType || "CHEQUE");
        Object.entries(payoutProofFiles).forEach(([k, f]) => f && fd.append(k, f));
        await investApiForm("/payout-details/request", fd);
        setMsg("Bank/UPI change submitted for team approval. Current payout details stay active until approved.");
        setPayoutProofFiles({});
      } else {
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
      }
      onRefresh?.();
    } catch (e) {
      setErr(e.message);
    }
  };



  const hasDoc = (key) =>
    files[key] || stagedUploads[key]?.url || (stagedUploads[key]?.status !== "FAILED" && kyc?.[key]);

  const submitReadiness = useMemo(
    () =>
      kycSubmitReadiness({
        kyc,
        form,
        files,
        stagedUploads,
        signatureData,
        signatureFile,
        confirmed,
      }),
    [kyc, form, files, stagedUploads, signatureData, signatureFile, confirmed]
  );

  const validateStep = (s) => {

    if (s === 0) {
      if (kyc && !canEditSection(kyc, "personal")) return null;
      if (!form.fullName.trim()) return "Full name is required";
      if (!form.guardianName.trim()) return `${guardianFieldLabel(form.guardianType)} is required`;
      if (!form.dob) return "Date of birth is required";
      if (!form.phone.trim()) return "Mobile number is required";
      const wa = form.sameWhatsapp ? form.phone : form.whatsappNumber;
      if (!String(wa || "").trim()) return "WhatsApp number is required";
      if (!form.houseNo.trim()) return "House / flat number is required";
      if (!form.area.trim() && !form.street.trim()) return "Street or area is required";
      if (!form.district.trim()) return "District is required";
      if (!form.state.trim()) return "State is required";
      if (!/^\d{6}$/.test(String(form.pincode || "").trim())) return "Valid 6-digit PIN code is required";
    }

    if (s === 1) {
      const editIdentity = !kyc || canEditSection(kyc, "identity");
      const editSignature = !kyc || canEditSection(kyc, "signature");
      if (!editIdentity && !editSignature) return null;

      if (editIdentity) {
        if (!isValidPan(form.panNumber)) return "Enter a valid PAN (e.g. ABCDE1234F)";
        if (!isValidAadhaar(form.aadhaarNumber)) return "Enter a valid 12-digit Aadhaar number";
        if (!hasDoc("photo")) return "Passport size photo is required";
        if (!hasDoc("panDocument")) return "PAN card photocopy is required";
        const aadhaarOk = (hasDoc("aadhaarFront") && hasDoc("aadhaarBack")) || hasDoc("aadhaarDocument");
        if (!aadhaarOk) return "Upload Aadhaar front & back, or a single Aadhaar PDF/image";
        if (!hasDoc("selfie")) return "Selfie verification photo is required";
        if (!hasDoc("addressProof")) return "Address proof upload is required";
        const idType = String(form.idType || "").toUpperCase();
        if (!idType) return "Select your primary ID document (PAN, Aadhaar, Passport, or Driving Licence)";
        if (idType === "PASSPORT") {
          if (!String(form.idNumber || "").trim()) return "Passport number is required";
          if (!hasDoc("passportDocument")) return "Upload your passport document";
        }
        if (idType === "DRIVERS_LICENSE") {
          if (!String(form.idNumber || "").trim()) return "Driving licence number is required";
          if (!hasDoc("driversLicenseDocument")) return "Upload your driving licence document";
        }
      }

      if (editSignature) {
        const hasSig = signatureData || signatureFile || kyc?.signature || kyc?.signatureData;
        if (!hasSig) return "Signature is required — draw on the pad or upload a clear signature image/PDF";
        if (signatureData) {
          const sigErr = validateSignatureBase64(signatureData);
          if (sigErr) return sigErr;
        }
      }

      for (const [key, file] of Object.entries(files)) {
        const def = KYC_DOCUMENT_FIELDS.find((d) => d.key === key);
        const fileErr = validateKycFile(file, { imageOnly: def?.imageOnly });
        if (fileErr) return `${def?.label || key}: ${fileErr}`;
      }
    }

    if (s === 2) {
      if (kyc && !canEditSection(kyc, "banking")) return null;
      if (!form.bankName.trim()) return "Bank name is required";
      if (!form.bankAccount.trim()) return "Account number is required";
      if (!form.ifscCode.trim()) return "IFSC code is required";
      const bp =
        form.bankProofType === "CHEQUE"
          ? hasDoc("cancelledCheque")
          : form.bankProofType === "PASSBOOK"
            ? hasDoc("passbookDocument")
            : hasDoc("bankStatementDocument");
      if (!bp) {
        return form.bankProofType === "STATEMENT"
          ? "Upload bank statement (unlocked PDF or image — password-protected files not accepted)"
          : form.bankProofType === "PASSBOOK"
            ? "Upload bank passbook copy"
            : "Upload cancelled cheque copy";
      }
    }

    return null;

  };



  const goToStep = (target) => {
    if (target < 0 || target >= STEPS.length || target === step) return;
    setErr("");
    setStep(target);
  };

  const goNext = () => {
    const v = validateStep(step);
    if (v) {
      setErr(v);
      return;
    }
    if (step === 2) {
      const ready = kycSubmitReadiness({
        kyc,
        form,
        files,
        stagedUploads,
        signatureData,
        signatureFile,
        confirmed: true,
      });
      if (!ready.ready) {
        setErr(ready.blockers[0] || "Complete all required documents before review.");
        return;
      }
    }
    setErr("");
    setStep((s) => s + 1);
  };

  const goBack = () => goToStep(step - 1);

  useEffect(() => {
    stepTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);



  const submit = async () => {

    setErr("");

    setMsg("");

    if (!confirmed) {

      setErr("Please confirm the declaration before submitting.");

      return;

    }

    if (!submitReadiness.ready) {
      setErr(submitReadiness.blockers[0] || "Complete all required details and document uploads before submitting.");
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

    const uploadSizeErr = validateUploadFiles({
      ...files,
      ...(signatureFile ? { signature: signatureFile } : {}),
    });
    if (uploadSizeErr) {
      setErr(uploadSizeErr);
      return;
    }

    setSubmitting(true);

    const fd = new FormData();

    const payload = {
      ...form,
      panNumber: normalizePan(form.panNumber),
      aadhaarNumber: normalizeAadhaar(form.aadhaarNumber),
      idNumber: resolvePrimaryIdNumber(form, { normalizePan, normalizeAadhaar }),
      whatsappNumber: form.sameWhatsapp ? form.phone : form.whatsappNumber,
      fatherName: form.guardianName,
    };

    Object.entries(payload).forEach(([k, v]) => fd.append(k, v || ""));

    if (signatureData) {
      fd.append("signatureData", signatureData);
      fd.append("signatureMethod", "draw");
    } else if (signatureFile) {
      fd.append("signature", signatureFile);
      fd.append("signatureMethod", "upload");
    } else if (kyc?.signatureData) {
      fd.append("signatureData", kyc.signatureData);
      fd.append("signatureMethod", kyc.signatureMethod || "draw");
    }

    Object.entries(files).forEach(([k, f]) => {
      if (f && !stagedUploads[k]?.url) fd.append(k, f);
    });

    const isRevision = revisionMode && kyc?.status === "APPROVED";
    try {
      const res = await investApiForm(isRevision ? "/kyc/revision" : "/kyc", fd);
      setMsg(
        res?.message ||
          (isRevision
            ? "KYC update submitted for team approval. Your current approved KYC remains active until then."
            : needsPartialResubmit(kyc)
              ? "Updated sections submitted. Other approved sections were kept unchanged. Please visit again after review."
              : "KYC submitted successfully. Uploads must be clear (not blurry) and PDFs unlocked. It is under review — please visit again after some time (usually 24–48 hours). You will see the full dashboard once fully approved.")
      );
      setFiles({});
      setStagedUploads({});
      setFileHashes({});
      if (isRevision) setRevisionMode(false);
      onRefresh?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }

  };



  return (

    <div className="page-stack max-w-3xl">

      {(pendingPayoutChange || pendingKycRevision) && (
        <Alert type="info">
          {pendingKycRevision && "KYC update pending team approval — your current approved KYC remains in use. "}
          {pendingPayoutChange && "Bank/UPI change pending team approval — withdrawals still use your current approved details."}
        </Alert>
      )}

      {draftResumed && canEdit && (
        <Alert type="success">
          Your progress is saved automatically. Resuming from step {STEPS[resumeStep ?? step]?.title || resumeStep + 1} — complete the remaining fields and uploads, then submit.
        </Alert>
      )}

      {canEdit && (
        <p className="text-xs text-muted-foreground">
          Progress and uploads are saved as you go. You can leave and continue later from the same step.
        </p>
      )}

      {forced && (
        <p className="text-sm text-muted-foreground">
          Complete all four steps: personal details, identity documents (with uploads), bank details (with proof), then review and submit.
        </p>
      )}

      {!forced && (
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2">
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
        </div>
          <span className="self-start sm:ml-auto">
            <Badge status={kyc?.status || "NOT SUBMITTED"} />
          </span>
      </div>
      )}



      {(forced || tab === "accounts") && (

        <div className="card max-w-xl space-y-3 p-5 sm:p-6">

          <h3 className="font-bold text-foreground">Payout Accounts</h3>

          <p className="text-sm text-muted-foreground">
            {kyc?.status === "APPROVED"
              ? "Changes require team approval with bank proof. Active details below are used for withdrawals until approved."
              : "Add UPI and bank details for withdrawals (saved with your KYC submission)."}
          </p>

          {pendingPayoutChange && (
            <Alert type="info">Pending change submitted {new Date(pendingPayoutChange.createdAt).toLocaleString("en-IN")} — awaiting team approval.</Alert>
          )}

          {err && (forced || tab === "accounts") && <Alert type="error">{err}</Alert>}

          {msg && (forced || tab === "accounts") && <Alert type="success">{msg}</Alert>}

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

          {kyc?.status === "APPROVED" && !pendingPayoutChange && (
            <>
              <Field label="Bank proof type">
                <select className="input" value={form.bankProofType || "CHEQUE"} onChange={(e) => set("bankProofType", e.target.value)}>
                  {BANK_PROOF_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              {(form.bankProofType || "CHEQUE") === "CHEQUE" && (
                <Field label="Cancelled cheque (new account)">
                  <input type="file" accept={KYC_ACCEPT_DOCS} className="input py-1.5" onChange={(e) => setPayoutProofFiles({ cancelledCheque: e.target.files?.[0] })} />
                </Field>
              )}
              {(form.bankProofType || "CHEQUE") === "PASSBOOK" && (
                <Field label="Passbook copy">
                  <input type="file" accept={KYC_ACCEPT_DOCS} className="input py-1.5" onChange={(e) => setPayoutProofFiles({ passbookDocument: e.target.files?.[0] })} />
                </Field>
              )}
              {(form.bankProofType || "CHEQUE") === "STATEMENT" && (
                <Field label="Bank statement">
                  <input type="file" accept={KYC_ACCEPT_DOCS} className="input py-1.5" onChange={(e) => setPayoutProofFiles({ bankStatementDocument: e.target.files?.[0] })} />
                </Field>
              )}
            </>
          )}

          <button type="button" className="btn-gold w-full" onClick={saveAccounts} disabled={kyc?.status === "APPROVED" && Boolean(pendingPayoutChange)}>
            {kyc?.status === "APPROVED" ? "Submit change for approval" : "Save Payout Details"}
          </button>

        </div>

      )}



      {(forced || tab === "kyc") && submitted && !revisionMode && !canEdit ? (

        <KycStatusView
          kyc={kyc}
          investor={investor}
          onRequestChanges={() => { setRevisionMode(true); setStep(0); }}
          pendingKycRevision={pendingKycRevision}
        />

      ) : (forced || tab === "kyc") && (

        <div className="card min-w-0 overflow-x-clip p-5 sm:p-6">

          {revisionMode && kyc?.status === "APPROVED" && (
            <div className="mb-4 space-y-2">
              <Alert type="info">
                Upload only the documents you need to change. Your current approved KYC stays active until the team approves this update.
              </Alert>
              <button
                type="button"
                className="btn-outline btn-wrap text-sm"
                onClick={() => {
                  setRevisionMode(false);
                  setStep(0);
                  setErr("");
                  setMsg("");
                }}
              >
                ← Back to KYC summary
              </button>
            </div>
          )}

          {kyc?.status === "REJECTED" && kyc.remarks && (

            <Alert type="error">Application rejected: {kyc.remarks}. Please correct and resubmit.</Alert>

          )}



          <div ref={stepTopRef} className="scroll-mt-4">
          <Stepper step={step} onStepClick={goToStep} />
          </div>



          {err && <div className="mt-4"><Alert type="error">{err}</Alert></div>}

          {msg && <div className="mt-4"><Alert type="success">{msg}</Alert></div>}



          {step === 0 && (
            <SectionFieldset section="personal" kyc={kyc}>
            <div className="space-y-3">
              <Alert type="info">Step 2 will ask you to upload passport photo, PAN, Aadhaar, and bank proof. Use clear, sharp images or unlocked PDFs only (blurry or password-protected files are rejected).</Alert>
              <Field label="Full legal name *">
                <input className="input" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="As per PAN / Aadhaar" />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Relation *">
                  <select className="input" value={form.guardianType} onChange={(e) => set("guardianType", e.target.value)}>
                    {GUARDIAN_TYPES.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label={`${guardianFieldLabel(form.guardianType)} *`}>
                  <input className="input" required value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} placeholder="As per official ID" />
                </Field>
              </div>
              <Field label="Date of birth *">
                <input className="input" type="date" required value={form.dob} onChange={(e) => set("dob", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Mobile number *">
                  <PhoneInput
                    countryCode={form.phoneCountryCode}
                    phone={form.phone}
                    onCountryCodeChange={(v) => set("phoneCountryCode", v)}
                    onPhoneChange={(v) => set("phone", v)}
                    required
                  />
                </Field>
                <Field label="WhatsApp number *">
                  <label className="mb-2 flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={form.sameWhatsapp} onChange={(e) => set("sameWhatsapp", e.target.checked)} />
                    Same as mobile
                  </label>
                  {!form.sameWhatsapp && (
                    <PhoneInput
                      countryCode={form.whatsappCountryCode}
                      phone={form.whatsappNumber}
                      onCountryCodeChange={(v) => set("whatsappCountryCode", v)}
                      onPhoneChange={(v) => set("whatsappNumber", v)}
                      required
                    />
                  )}
                </Field>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">Address (as per ID)</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="House / flat no. *"><input className="input" value={form.houseNo} onChange={(e) => set("houseNo", e.target.value)} /></Field>
                <Field label="Street *"><input className="input" value={form.street} onChange={(e) => set("street", e.target.value)} /></Field>
                <Field label="Landmark"><input className="input" value={form.landmark} onChange={(e) => set("landmark", e.target.value)} /></Field>
                <Field label="Area / locality *"><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} /></Field>
                <Field label="District *"><input className="input" value={form.district} onChange={(e) => set("district", e.target.value)} /></Field>
                <Field label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label="State *"><input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
                <Field label="PIN code *"><input className="input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></Field>
                <Field label="Country"><input className="input" value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
              </div>
            </div>
            </SectionFieldset>
          )}



          {step === 1 && (

            <div className="mt-4 space-y-4">

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Upload clear, sharp photos or unlocked PDFs only. Blurry images and password-protected PDFs are rejected automatically.
              </div>

              <SectionFieldset section="identity" kyc={kyc}>
              <Alert type="info">
                <strong>PAN Card</strong> and <strong>Aadhaar</strong> are compulsory for every investor (number + upload
                below). Also select which document is your <strong>primary ID</strong> from the list.
              </Alert>

              <Field label="Primary ID document *">
                <select
                  className="input"
                  value={form.idType}
                  onChange={(e) => onIdTypeChange(e.target.value)}
                >
                  <option value="">— Select primary ID —</option>
                  {PRIMARY_ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {form.idType && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Primary ID: {primaryIdTypeLabel(form.idType)}
                    {form.idType === "PAN" || form.idType === "AADHAAR"
                      ? " — uses your PAN / Aadhaar number and upload below."
                      : " — enter number and upload the matching document below."}
                  </p>
                )}
              </Field>

              <p className="text-xs font-semibold text-muted-foreground">Compulsory documents (always required)</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="PAN number *">
                  <input
                    className="input uppercase"
                    value={form.panNumber}
                    onChange={(e) => set("panNumber", e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </Field>
                <Field label="Aadhaar number *">
                  <input
                    className="input"
                    value={form.aadhaarNumber}
                    onChange={(e) => set("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="12-digit Aadhaar"
                    inputMode="numeric"
                  />
                </Field>
              </div>

              {form.idType === "PASSPORT" && (
                <Field label="Passport number *">
                  <input className="input" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
                </Field>
              )}

              {form.idType === "DRIVERS_LICENSE" && (
                <Field label="Driving licence number *">
                  <input className="input" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
                </Field>
              )}



              <div className="space-y-3">

                <KycDocumentField
                  label="Passport Size Photo *"
                  hint="Recent colour photo, white background, face clearly visible (35×45 mm style)"
                  name="photo"
                  required
                  imageOnly
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.photo}
                  allowCamera
                />

                <KycDocumentField
                  label="PAN Card (photocopy) *"
                  hint="Clear scan or photo — must match PAN number entered above"
                  name="panDocument"
                  required
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.panDocument}
                  allowCamera
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <KycDocumentField
                    label="Aadhaar Front *"
                    hint="Required unless you upload a single combined Aadhaar file below"
                    name="aadhaarFront"
                    required
                    stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                    existingUrl={kyc?.aadhaarFront}
                    allowCamera
                  />
                  <KycDocumentField
                    label="Aadhaar Back *"
                    hint="Required unless you upload a single combined Aadhaar file below"
                    name="aadhaarBack"
                    required
                    stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                    existingUrl={kyc?.aadhaarBack}
                    allowCamera
                  />
                </div>

                <KycDocumentField
                  label="Aadhaar (single file alternative)"
                  hint="Or one combined Aadhaar PDF/image instead of front & back (mandatory if front/back not uploaded)"
                  name="aadhaarDocument"
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.aadhaarDocument}
                  allowCamera
                />

                {form.idType === "PASSPORT" && (
                  <KycDocumentField
                    label="Passport document *"
                    hint="Required — passport is your primary ID (photo page, image or PDF)"
                    name="passportDocument"
                    required
                    stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                    existingUrl={kyc?.passportDocument}
                    allowCamera
                  />
                )}

                {form.idType === "DRIVERS_LICENSE" && (
                  <KycDocumentField
                    label="Driving licence document *"
                    hint="Required — driving licence is your primary ID (front and back, image or PDF)"
                    name="driversLicenseDocument"
                    required
                    stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                    existingUrl={kyc?.driversLicenseDocument}
                    allowCamera
                  />
                )}

                <KycDocumentField
                  label="Address Proof *"
                  hint="Utility bill, bank statement, or rental agreement (not older than 3 months)"
                  name="addressProof"
                  required
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.addressProof}
                  allowCamera
                />

                <KycDocumentField

                  label="Selfie Verification"

                  hint="Upload a photo or use your camera — hold your ID beside your face"

                  name="selfie"
                  required
                  imageOnly
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}

                  existingUrl={kyc?.selfie}

                  allowCamera

                />

              </div>
              </SectionFieldset>

              <SectionFieldset section="signature" kyc={kyc}>
                <KycSignatureField
                  signatureMode={signatureMode}
                  setSignatureMode={setSignatureMode}
                  signatureData={signatureData}
                  setSignatureData={setSignatureData}
                  signatureFile={signatureFile}
                  setSignatureFile={setSignatureFile}
                  existingUrl={kyc?.signature}
                />
              </SectionFieldset>

            </div>

          )}



          {step === 2 && (
            <SectionFieldset section="banking" kyc={kyc}>
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

              <Field label="Bank proof type *">
                <select className="input" value={form.bankProofType} onChange={(e) => set("bankProofType", e.target.value)}>
                  {BANK_PROOF_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Upload clear image or PDF. Password-protected bank statements are not accepted.</p>
              </Field>
              {form.bankProofType === "CHEQUE" && (
                <KycDocumentField
                  label="Cancelled cheque *"
                  hint="Must show account number and IFSC matching entries above"
                  name="cancelledCheque"
                  required
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.cancelledCheque}
                  allowCamera
                />
              )}
              {form.bankProofType === "PASSBOOK" && (
                <KycDocumentField
                  label="Bank passbook *"
                  hint="First page with name & account — image or PDF"
                  name="passbookDocument"
                  required
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.passbookDocument}
                  allowCamera
                />
              )}
              {form.bankProofType === "STATEMENT" && (
                <KycDocumentField
                  label="Bank statement *"
                  hint="Unlocked PDF or image — password-protected files not accepted"
                  name="bankStatementDocument"
                  required
                  stagedUploads={stagedUploads}
                  onStaged={handleStaged}
                  fileHashes={fileHashes}
                  existingUrl={kyc?.bankStatementDocument}
                  allowCamera
                />
              )}
            </div>
            </SectionFieldset>
          )}



          {step === 3 && (

            <div className="mt-4 space-y-4 text-sm">

              <p className="font-bold text-foreground">Review your application</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {[
                  ["Full Name", form.fullName],
                  [guardianFieldLabel(form.guardianType), form.guardianName],
                  ["Date of birth", form.dob],
                  ["Mobile", form.phone],
                  ["WhatsApp", form.whatsappNumber],
                  ["Address", [form.houseNo, form.street, form.landmark, form.area, form.district, form.state, form.pincode].filter(Boolean).join(", ") || form.address],
                  ["PAN", normalizePan(form.panNumber)],
                  ["Aadhaar", normalizeAadhaar(form.aadhaarNumber)],
                  ["Bank", form.bankName],
                  ["Account", form.bankAccount],
                  ["IFSC", form.ifscCode],
                  ["Bank proof", form.bankProofType],
                ].map(([l, v]) => (

                  <div key={l}>

                    <p className="text-muted-foreground">{l}</p>

                    <p className="font-medium break-words">{v || "—"}</p>

                  </div>

                ))}

              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">

                <p className="text-xs text-muted-foreground leading-relaxed">

                  Documents uploaded:{" "}

                  {KYC_DOCUMENT_FIELDS.filter((f) => hasDoc(f.key))

                    .map((f) => f.label)

                    .join(", ") || "None"}

                </p>

              </div>

              {!submitReadiness.ready && (
                <Alert type="error">
                  <p className="font-semibold">Cannot submit yet:</p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {submitReadiness.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <label className="flex items-start gap-2 text-xs text-muted-foreground">

                <input

                  type="checkbox"

                  className="mt-0.5"

                  checked={confirmed}

                  onChange={(e) => setConfirmed(e.target.checked)}

                />

                I confirm all information is accurate and belongs to me. I understand that falsification of documents is a legal offense.

              </label>

              {!submitReadiness.ready && submitReadiness.blockers.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold text-foreground">Before you can submit:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {submitReadiness.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

          )}



          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-center text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length} — {STEPS[step].title}
              <span className="hidden sm:inline"> · Tap a step above to jump</span>
            </p>
          <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-between">

            {step > 0 ? (

              <button type="button" className="btn-outline flex-1 xs:flex-none" onClick={goBack}>

                ← Previous step

              </button>

            ) : (

              <span className="hidden xs:block xs:flex-1" aria-hidden />

            )}

            {step < 3 ? (

              <button type="button" className="btn-gold flex-1 xs:flex-none" onClick={goNext}>Next step →</button>

            ) : (

              <button
                type="button"
                className={`btn-gold flex-1 xs:flex-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  revisionMode && kyc?.status === "APPROVED" ? "btn-wrap" : ""
                }`}
                disabled={submitting || !submitReadiness.ready}
                title={!submitReadiness.ready ? submitReadiness.blockers[0] : undefined}
                onClick={submit}
              >
                {submitting
                  ? "Submitting…"
                  : revisionMode && kyc?.status === "APPROVED"
                    ? "Submit update for approval"
                    : "Submit Application"}
              </button>

            )}

          </div>
          </div>



          {canEdit && existingDocs.length > 0 && step === 0 && (

            <div className="mt-6 border-t border-border pt-4">

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previously uploaded</p>

              <KycDocumentsList kyc={kyc} compact scope="invest" />

            </div>

          )}

        </div>

      )}

    </div>

  );

}



function Stepper({ step, onStepClick }) {

  return (

    <nav className="overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" aria-label="KYC steps">

      <div className="relative z-0 flex min-w-[280px] justify-between px-2">

        <div className="absolute left-0 top-5 z-0 h-0.5 w-full bg-border" aria-hidden />

        {STEPS.map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
          <button
            key={s.n}
            type="button"
            onClick={() => onStepClick?.(s.n)}
            className={`relative z-[1] flex shrink-0 flex-col items-center gap-2 rounded-lg bg-card px-1 py-1 transition hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "ring-2 ring-primary/30" : ""}`}
            aria-current={active ? "step" : undefined}
            aria-label={`${s.title}${done ? ", completed" : ""}${active ? ", current" : ""}`}
          >

            <div

              className={`relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card text-sm font-bold transition ${

                active

                  ? "border-primary bg-primary text-primary-foreground"

                  : done

                    ? "border-primary/60 bg-primary/15 text-accent-tone"

                    : "border-border text-muted-foreground"

              }`}

            >

              {done ? "✓" : s.n + 1}

            </div>

            <span className={`text-[10px] font-bold uppercase tracking-wider ${active || done ? "text-accent-tone" : "text-muted-foreground"}`}>

              {s.title}

            </span>

          </button>
          );
        })}

      </div>

    </nav>

  );

}



function KycStatusView({ kyc, investor, onRequestChanges, pendingKycRevision }) {

  const verified = kyc.status === "APPROVED";

  return (

    <div className="card min-w-0 space-y-4 overflow-x-clip p-5 sm:p-6 text-center sm:text-left">

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

      {pendingKycRevision && (
        <Alert type="info">A KYC update is awaiting team approval. Your approved documents below remain active for payouts.</Alert>
      )}

      {verified && !pendingKycRevision && onRequestChanges && (
        <button type="button" className="btn-outline btn-wrap text-sm" onClick={onRequestChanges}>
          <span>Request KYC document update</span>
          <span className="text-xs font-normal text-muted-foreground">Requires team approval</span>
        </button>
      )}



      {verified ? (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Your approved records</h3>
          <p className="text-xs text-muted-foreground">
            View KYC details, bank account, and uploaded files in a popup. Documents are locked — use the button
            below to request changes.
          </p>
          <InvestorApprovedViewButtons kyc={kyc} investor={investor} />
        </div>
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Uploaded Documents</h3>
          <KycDocumentsList kyc={kyc} scope="invest" locked={false} />
        </div>
      )}

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
