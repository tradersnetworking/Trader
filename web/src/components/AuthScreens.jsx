import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/store.jsx";
import { Field, Alert, PasswordInput } from "./ui.jsx";
import { AUTH_CARD, AUTH_LINK, AUTH_MUTED, AUTH_PRIMARY_BTN } from "../lib/ui-system.js";
import GoogleButton from "./GoogleButton.jsx";
import PhoneInput from "./shared/PhoneInput.jsx";
import AuthPageLayout from "./invest/AuthPageLayout.jsx";
import AuthBrandPanel, { AuthMobileBrand } from "./invest/AuthBrandPanel.jsx";
import MainAuthBrandPanel, { MainAuthMobileBrand } from "./main/MainAuthBrandPanel.jsx";
import { isWebAuthnSupported, loginWithPasskey, verify2FAWithPasskey } from "../lib/webauthn.js";
import { useI18n } from "../lib/i18n/context.jsx";

import { investPath } from "../lib/site.js";


function paths(scope) {
  if (scope === "invest") {
    return {
      login: investPath("/login"),
      staff: investPath("/staff-login"),
      register: investPath("/register"),
      forgot: investPath("/forgot-password"),
      home: investPath(""),
    };
  }
  return {
    login: "/login",
    staff: "/staff-login",
    register: "/register",
    forgot: "/forgot-password",
    home: "/",
  };
}

function Shell({ scope, title, subtitle, children }) {
  const mobileBrand = scope === "invest" ? <AuthMobileBrand /> : <MainAuthMobileBrand />;
  const brandPanel = scope === "invest" ? <AuthBrandPanel /> : <MainAuthBrandPanel />;

  return (
    <AuthPageLayout brandPanel={brandPanel}>
      <div className={AUTH_CARD}>
        {mobileBrand}
        <h1 className="text-center text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className={`mb-6 mt-1 text-center text-sm ${AUTH_MUTED}`}>{subtitle}</p>}
        {children}
      </div>
    </AuthPageLayout>
  );
}

function useLogin(scope) {
  const auth = useAuth();
  return scope === "invest" ? auth.loginInvest : auth.loginMain;
}

export function LoginScreen({ scope, staff }) {
  const p = paths(scope);
  const login = useLogin(scope);
  const nav = useNavigate();
  const { t } = useI18n();
  const isInvest = scope === "invest";
  const tx = (key, fallback) => (isInvest ? t(`auth.${key}`) : null) || fallback;
  const [form, setForm] = useState({ email: "", password: "", totpCode: "" });
  const [needs2FA, setNeeds2FA] = useState(false);
  const [passkey2FA, setPasskey2FA] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = scope === "invest" ? "aex_invest_session_msg" : "aex_main_session_msg";
    const msg = sessionStorage.getItem(key);
    if (msg) {
      setErr(msg);
      sessionStorage.removeItem(key);
    }
  }, [scope]);

  const dest = (user) => {
    if (scope === "invest") {
      return ["ADMIN", "SUPERADMIN"].includes(user.role) ? investPath("/admin") : investPath("/dashboard");
    }
    return ["ADMIN", "SUPERADMIN", "STAFF"].includes(user.role) ? "/admin" : "/dashboard";
  };

  const commitLogin = (token, user) => {
    flushSync(() => login(token, user));
    nav(dest(user));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const { token, user, requires2FA, passkeyAvailable } = await api(scope, "/auth/login", { method: "POST", body: { ...form, staff: !!staff } });
      if (requires2FA) {
        setNeeds2FA(true);
        setPasskey2FA(!!passkeyAvailable);
        setErr("");
        setLoading(false);
        return;
      }
      commitLogin(token, user);
    } catch (e2) { setErr(e2.message); } finally { setLoading(false); }
  };

  const onGoogle = async (credential) => {
    setErr("");
    try {
      const { token, user } = await api(scope, "/auth/google", { method: "POST", body: { credential } });
      commitLogin(token, user);
    } catch (e2) { setErr(e2.message); }
  };

  const onPasskey = async () => {
    if (!form.email.trim()) return setErr(tx("passkeyEmailFirst", "Enter your email first, then use passkey login."));
    setErr("");
    setLoading(true);
    try {
      const { token, user } = await loginWithPasskey(form.email);
      commitLogin(token, user);
    } catch (e2) {
      setErr(e2.message || "Passkey login cancelled");
    } finally {
      setLoading(false);
    }
  };

  const onPasskey2FA = async () => {
    setErr("");
    setLoading(true);
    try {
      const { token, user } = await verify2FAWithPasskey(form.email);
      commitLogin(token, user);
    } catch (e2) {
      setErr(e2.message || "Passkey verification cancelled");
    } finally {
      setLoading(false);
    }
  };

  const passkeyOk = scope === "invest" && isWebAuthnSupported();

  return (
    <Shell scope={scope}
      title={staff ? tx("staffLogin", "Staff / Admin Login") : (scope === "invest" ? tx("investorLogin", "Investor Login") : tx("userLogin", "User Login"))}
      subtitle={staff ? tx("staffSubtitle", "Authorized personnel only") : (scope === "invest" ? tx("welcomeInvest", "Welcome back to Akshaya Invest") : tx("welcomeMain", "Welcome back to Akshaya Exim"))}>
      {scope === "invest" && (
        <Link to={investPath("")} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-600">
          {tx("backToHome", "← Back to home")}
        </Link>
      )}
      <form onSubmit={submit} className="space-y-4">
        {needs2FA && <Alert type="info">{tx("authenticatorHint", "Enter the 6-digit code from your authenticator app.")}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label={tx("email", "Email")}><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={tx("password", "Password")}><PasswordInput required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" /></Field>
        {needs2FA && (
          <Field label={tx("authenticatorCode", "Authenticator code")}><input className="input" required={!passkey2FA} value={form.totpCode} onChange={(e) => setForm({ ...form, totpCode: e.target.value })} placeholder="6-digit 2FA code" /></Field>
        )}
        <div className="flex justify-end"><Link to={p.forgot} className={`text-xs ${AUTH_LINK}`}>{tx("forgotPassword", "Forgot password?")}</Link></div>
        <button className={AUTH_PRIMARY_BTN} disabled={loading}>{loading ? tx("signingIn", "Signing in…") : needs2FA ? tx("verifyLogin", "Verify & Login") : tx("login", "Login")}</button>
      </form>
      {needs2FA && passkey2FA && passkeyOk && (
        <>
          <div className={`my-3 flex items-center gap-3 text-xs ${AUTH_MUTED}`}><div className="h-px flex-1 bg-border" />{tx("or", "OR")}<div className="h-px flex-1 bg-border" /></div>
          <button
            type="button"
            className="w-full rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground transition hover:border-amber-500/40 hover:bg-amber-500/5"
            disabled={loading}
            onClick={onPasskey2FA}
          >
            🔐 {tx("passkey2fa", "Verify with passkey")}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{tx("passkey2faHint", "Or use your registered passkey instead of the authenticator code")}</p>
        </>
      )}
      {passkeyOk && !needs2FA && (
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground transition hover:border-amber-500/40 hover:bg-amber-500/5"
          disabled={loading || !form.email.trim()}
          onClick={onPasskey}
        >
          🔐 {tx("passkeyLogin", "Sign in with passkey")}
        </button>
      )}
      {!staff && (
        <>
          <div className={`my-4 flex items-center gap-3 text-xs ${AUTH_MUTED}`}><div className="h-px flex-1 bg-border" />{tx("or", "OR")}<div className="h-px flex-1 bg-border" /></div>
          <GoogleButton scope={scope} onCredential={onGoogle} />
          <p className={`mt-4 text-center text-sm ${AUTH_MUTED}`}>{tx("noAccount", "No account?")} <Link to={p.register} className={AUTH_LINK}>{tx("register", "Register")}</Link></p>
          <Link to={p.staff} className="mt-3 block w-full rounded-lg border border-border py-2 text-center text-sm font-semibold text-muted-foreground hover:bg-muted">{tx("staffLoginLink", "Staff / Admin Login →")}</Link>
        </>
      )}
      {staff && <Link to={p.login} className={`mt-4 block text-center text-sm ${AUTH_LINK}`}>{tx("backToLogin", "← Back to user login")}</Link>}
    </Shell>
  );
}

export function RegisterScreen({ scope }) {
  const p = paths(scope);
  const login = useLogin(scope);
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const refFromUrl = sp.get("ref") || "";
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", phoneCountryCode: "+91", accountType: "B2C", companyName: "", referralCode: refFromUrl });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = sp.get("ref");
    if (ref) {
      try { localStorage.setItem("invest_ref", ref); } catch {}
      setForm((f) => ({ ...f, referralCode: ref }));
    } else {
      try {
        const stored = localStorage.getItem("invest_ref");
        if (stored) setForm((f) => ({ ...f, referralCode: stored }));
      } catch {}
    }
  }, [sp]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const body = { ...form };
      if (scope !== "invest") delete body.referralCode;
      const { token, user } = await api(scope, "/auth/register", { method: "POST", body });
      flushSync(() => login(token, user));
      nav(scope === "invest" ? investPath("/onboarding") : "/dashboard");
    } catch (e2) { setErr(e2.message); } finally { setLoading(false); }
  };

  return (
    <Shell scope={scope} title={scope === "invest" ? "Create Investor Account" : "Create Account"} subtitle="Join Akshaya Exim Traders">
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Full Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone">
          <PhoneInput
            countryCode={form.phoneCountryCode}
            phone={form.phone}
            onCountryCodeChange={(v) => setForm({ ...form, phoneCountryCode: v })}
            onPhoneChange={(v) => setForm({ ...form, phone: v })}
          />
        </Field>
        {scope === "main" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Type">
              <select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
                <option value="B2C">B2C (Individual)</option>
                <option value="B2B">B2B (Business)</option>
              </select>
            </Field>
            <Field label="Company (optional)"><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          </div>
        )}
        <Field label="Password"><PasswordInput required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></Field>
        {scope === "invest" && (
          <Field label="Referral code (optional)">
            <input className="input font-mono uppercase" placeholder="AEX-..." value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.trim() })} />
          </Field>
        )}
        <button className="btn-gold w-full" disabled={loading}>{loading ? "Creating…" : "Register"}</button>
      </form>
      <p className={`mt-4 text-center text-sm ${AUTH_MUTED}`}>Already have an account? <Link to={p.login} className={AUTH_LINK}>Login</Link></p>
    </Shell>
  );
}

export function ForgotScreen({ scope }) {
  const p = paths(scope);
  const { t } = useI18n();
  const tx = (key, fallback) => (scope === "invest" ? t(`auth.${key}`) : null) || fallback;
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try { const r = await api(scope, "/auth/forgot-password", { method: "POST", body: { email } }); setMsg(r.message || "Check your email."); } catch (e2) { setMsg(e2.message); }
  };
  return (
    <Shell scope={scope} title={tx("forgotTitle", "Forgot Password")} subtitle={tx("forgotSubtitle", "We'll email you a reset link")}>
      <form onSubmit={submit} className="space-y-4">
        {msg && <Alert type="success">{msg}</Alert>}
        <Field label={tx("email", "Email")}><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <button className={AUTH_PRIMARY_BTN}>{tx("sendReset", "Send reset link")}</button>
      </form>
      <p className={`mt-4 text-center text-sm ${AUTH_MUTED}`}><Link to={p.login} className={AUTH_LINK}>{tx("login", "Login")}</Link></p>
    </Shell>
  );
}

export function ResetScreen({ scope }) {
  const p = paths(scope);
  const { t } = useI18n();
  const tx = (key, fallback) => (scope === "invest" ? t(`auth.${key}`) : null) || fallback;
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api(scope, "/auth/reset-password", { method: "POST", body: { token: sp.get("token"), password } });
      setOk(true);
      setTimeout(() => nav(p.login), 1500);
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <Shell scope={scope} title={tx("resetTitle", "Reset Password")}>
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        {ok && <Alert type="success">Password updated. Redirecting to login…</Alert>}
        <Field label={tx("newPassword", "New Password")}><PasswordInput required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
        <button className={AUTH_PRIMARY_BTN}>{tx("updatePassword", "Update Password")}</button>
      </form>
    </Shell>
  );
}
