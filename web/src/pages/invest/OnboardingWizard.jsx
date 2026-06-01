import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { investApi, investSecurityApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { Field, Alert } from "../../components/ui.jsx";
import { investPath } from "../../lib/site.js";
import { inr } from "../../lib/format.js";

const STEPS = [
  "Welcome",
  "Personal",
  "Identity",
  "Address",
  "Banking",
  "Risk & Terms",
  "Complete",
];

export default function OnboardingWizard() {
  const { invest, refreshInvest } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: invest?.name || "",
    phone: invest?.phone || "",
    panNumber: "",
    aadhaarNumber: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    acceptTerms: false,
    acceptRisk: false,
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    investSecurityApi("/onboarding").then((d) => {
      if (d.complete) return nav(investPath("/dashboard"));
      setStep(d.step || 1);
      if (d.draft && Object.keys(d.draft).length) setForm((f) => ({ ...f, ...d.draft }));
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = () => {
    setErr("");
    if (step === 1 && !form.name.trim()) return setErr("Please enter your full name."), false;
    if (step === 2 && !form.phone.trim()) return setErr("Phone number is required."), false;
    if (step === 3 && form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.toUpperCase())) {
      return setErr("Invalid PAN format (e.g. ABCDE1234F)."), false;
    }
    if (step === 3 && form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) {
      return setErr("Aadhaar must be 12 digits."), false;
    }
    if (step === 6 && (!form.acceptTerms || !form.acceptRisk)) {
      return setErr("Please accept the terms and risk disclosure."), false;
    }
    return true;
  };

  const save = async (nextStep, complete = false) => {
    if (!validateStep()) return;
    await investSecurityApi("/onboarding", { method: "PUT", body: { step: nextStep, data: form, complete } });
    if (complete) {
      await investApi("/profile", {
        method: "PUT",
        body: { name: form.name, phone: form.phone, upiId: form.upiId, bankName: form.bankName, accountNumber: form.accountNumber, ifsc: form.ifsc },
      });
      refreshInvest();
      nav(investPath("/dashboard?tab=kyc"));
    } else {
      setStep(nextStep);
      setMsg("Progress saved.");
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="page-title">Set up your investor account</h1>
      <p className="page-subtitle mt-1">Complete these steps to start investing in Akshaya Exim plans. All amounts are in INR (₹).</p>

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 min-w-[2rem] flex-1 rounded-full ${i + 1 <= step ? "bg-gold" : "bg-muted"}`} title={s} />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Step {step} of {STEPS.length}: {STEPS[step - 1]}</p>

      {msg && <div className="mt-4"><Alert type="success">{msg}</Alert></div>}
      {err && <div className="mt-4"><Alert type="error">{err}</Alert></div>}

      <div className="card mt-6 space-y-4 p-4 sm:p-6">
        {step === 1 && (
          <>
            <Alert type="info">Welcome to Akshaya Exim Invest — structured plans with monthly ROI paid in Indian Rupees.</Alert>
            <Field label="Full name"><input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          </>
        )}
        {step === 2 && (
          <Field label="Mobile number"><input className="input" type="tel" required placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        )}
        {step === 3 && (
          <div className="responsive-form-grid">
            <Field label="PAN"><input className="input uppercase" placeholder="ABCDE1234F" value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} /></Field>
            <Field label="Aadhaar (optional)"><input className="input" inputMode="numeric" maxLength={12} value={form.aadhaarNumber} onChange={(e) => set("aadhaarNumber", e.target.value.replace(/\D/g, ""))} /></Field>
          </div>
        )}
        {step === 4 && (
          <>
            <Field label="Address"><input className="input" value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} /></Field>
            <div className="responsive-form-grid">
              <Field label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="State"><input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
              <Field label="PIN code"><input className="input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <Field label="UPI ID (for withdrawals)"><input className="input" placeholder="name@upi" value={form.upiId} onChange={(e) => set("upiId", e.target.value)} /></Field>
            <div className="responsive-form-grid">
              <Field label="Bank name"><input className="input" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
              <Field label="IFSC"><input className="input uppercase" value={form.ifsc} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} /></Field>
            </div>
            <Field label="Account number"><input className="input" value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} /></Field>
          </>
        )}
        {step === 6 && (
          <>
            <Alert type="info">Investments carry lock-in periods. Minimum investments start from {inr(100000)} depending on plan tier.</Alert>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} className="mt-1" />
              <span>I agree to the <a href={investPath("/terms")} target="_blank" rel="noreferrer" className="text-primary underline">Terms of Service</a> and <a href={investPath("/privacy")} target="_blank" rel="noreferrer" className="text-primary underline">Privacy Policy</a>.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.acceptRisk} onChange={(e) => set("acceptRisk", e.target.checked)} className="mt-1" />
              <span>I have read the <a href={investPath("/risk-disclosure")} target="_blank" rel="noreferrer" className="text-primary underline">Risk Disclosure</a> and understand that returns are not guaranteed.</span>
            </label>
          </>
        )}
        {step === 7 && (
          <Alert type="success">Profile saved. Complete KYC document upload from your dashboard, then add funds and invest in our 42 INR plans.</Alert>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          {step > 1 && <button type="button" className="btn-outline flex-1" onClick={() => setStep(step - 1)}>Back</button>}
          {step < STEPS.length ? (
            <button type="button" className="btn-gold flex-1" onClick={() => save(step + 1)}>Continue</button>
          ) : (
            <button type="button" className="btn-gold flex-1" onClick={() => save(step, true)}>Finish & Complete KYC</button>
          )}
        </div>
      </div>
    </div>
  );
}
