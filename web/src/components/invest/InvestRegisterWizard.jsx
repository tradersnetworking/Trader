import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { investPath } from "../../lib/site.js";
import { Field, Alert, PasswordInput } from "../ui.jsx";
import { AUTH_CARD, AUTH_LINK, AUTH_MUTED, AUTH_PRIMARY_BTN } from "../../lib/ui-system.js";
import AuthPageLayout from "./AuthPageLayout.jsx";
import AuthBrandPanel, { AuthMobileBrand } from "./AuthBrandPanel.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";

const STEP_KEYS = ["stepVerify", "stepAgreements"];

/** Minimal signup: email + password + OTP. Profile, KYC and bank details after login. */
export default function InvestRegisterWizard() {
  const login = useAuth().loginInvest;
  const nav = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: "",
    password: "",
    referralCode: "",
    acceptTerms: false,
    acceptRisk: false,
  });
  const [captcha, setCaptcha] = useState({ question: "", captchaToken: "" });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [otpSessionToken, setOtpSessionToken] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    loadCaptcha();
    try {
      const ref = new URLSearchParams(window.location.search).get("ref") || localStorage.getItem("invest_ref");
      if (ref) setForm((f) => ({ ...f, referralCode: ref }));
    } catch {}
  }, []);

  const loadCaptcha = async () => {
    try {
      const d = await api("invest", "/auth/register/captcha");
      setCaptcha(d);
      setCaptchaAnswer("");
    } catch {}
  };

  const sendOtp = async () => {
    setErr("");
    if (!form.password || form.password.length < 6) return setErr("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const d = await api("invest", "/auth/register/send-otp", {
        method: "POST",
        body: { email: form.email, captchaToken: captcha.captchaToken, captchaAnswer },
      });
      setOtpSessionToken(d.otpSessionToken);
      setOtpSent(true);
      setMsg(d.devOtp ? `Code sent. Dev OTP: ${d.devOtp}` : "Verification code sent to your email.");
    } catch (e) {
      setErr(e.message);
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setErr("");
    setLoading(true);
    try {
      const d = await api("invest", "/auth/register/verify-otp", {
        method: "POST",
        body: { otpSessionToken, email: form.email, code: otpCode },
      });
      setVerificationToken(d.verificationToken);
      setEmailVerified(true);
      setMsg("Email verified. Accept the agreements to create your account.");
      setStep(1);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setErr("");
    if (!form.acceptTerms || !form.acceptRisk) return setErr("Please accept the terms and risk disclosure.");
    setLoading(true);
    try {
      const { token, user } = await api("invest", "/auth/register", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
          verificationToken,
          referralCode: form.referralCode || undefined,
          acceptTerms: true,
        },
      });
      login(token, user);
      nav(investPath("/dashboard"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo(() => ((step + 1) / STEP_KEYS.length) * 100, [step]);

  return (
    <AuthPageLayout brandPanel={<AuthBrandPanel />}>
      <div className={AUTH_CARD}>
        <AuthMobileBrand />
        <Link to={investPath("")} className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-600">
          {t("auth.backToHome")}
        </Link>
        <h1 className="text-center text-2xl font-bold sm:text-3xl">{t("register.title")}</h1>
        <p className={`mb-4 mt-1 text-center text-sm ${AUTH_MUTED}`}>
          Create your account with email only. Complete KYC and bank details from your dashboard before investing.
        </p>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("register.stepOf").replace("{n}", step + 1).replace("{total}", STEP_KEYS.length).replace("{name}", t(`register.${STEP_KEYS[step]}`))}
        </p>

        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}

        {step === 0 && (
          <div className="mt-4 space-y-4">
            <Field label={t("auth.email")}>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={emailVerified}
              />
            </Field>
            <Field label={t("auth.password")}>
              <PasswordInput
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                disabled={emailVerified}
              />
            </Field>
            {!emailVerified && (
              <Field label={`Captcha: ${captcha.question || "Loading…"}`}>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    inputMode="numeric"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Answer"
                  />
                  <button type="button" className="btn-outline shrink-0 px-3 text-xs" onClick={loadCaptcha}>
                    ↻
                  </button>
                </div>
              </Field>
            )}
            {!otpSent ? (
              <button
                type="button"
                className={AUTH_PRIMARY_BTN}
                disabled={loading || !form.email || !form.password}
                onClick={sendOtp}
              >
                {loading ? t("common.loading") : t("register.sendOtp")}
              </button>
            ) : (
              <>
                <Field label="Email verification code">
                  <input
                    className="input font-mono tracking-widest"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6-digit code"
                  />
                </Field>
                <button
                  type="button"
                  className={AUTH_PRIMARY_BTN}
                  disabled={loading || otpCode.length < 6}
                  onClick={verifyOtp}
                >
                  {loading ? t("common.loading") : t("register.verifyContinue")}
                </button>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground underline"
                  onClick={() => {
                    setOtpSent(false);
                    loadCaptcha();
                  }}
                >
                  {t("register.resendCode")}
                </button>
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="mt-4 space-y-4">
            <Field label={t("register.referralOptional")}>
              <input
                className="input font-mono uppercase"
                value={form.referralCode}
                onChange={(e) => setForm({ ...form, referralCode: e.target.value.trim() })}
                placeholder="AEX-…"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
                className="mt-1"
              />
              <span>
                I accept the{" "}
                <Link to={investPath("/terms")} className={AUTH_LINK} target="_blank">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to={investPath("/privacy")} className={AUTH_LINK} target="_blank">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.acceptRisk}
                onChange={(e) => setForm({ ...form, acceptRisk: e.target.checked })}
                className="mt-1"
              />
              <span>
                I have read the{" "}
                <Link to={investPath("/risk-disclosure")} className={AUTH_LINK} target="_blank">
                  Risk Disclosure
                </Link>{" "}
                and understand investment risks.
              </span>
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-outline flex-1" onClick={() => setStep(0)}>
                {t("register.back")}
              </button>
              <button type="button" className={`${AUTH_PRIMARY_BTN} flex-1`} disabled={loading} onClick={submit}>
                {loading ? t("register.creating") : t("register.createAccount")}
              </button>
            </div>
          </div>
        )}

        <p className={`mt-4 text-center text-sm ${AUTH_MUTED}`}>
          {t("register.alreadyHave")}{" "}
          <Link to={investPath("/login")} className={AUTH_LINK}>
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
