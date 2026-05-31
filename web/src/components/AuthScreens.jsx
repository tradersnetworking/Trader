import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/store.jsx";
import { Logo, Field, Alert } from "./ui.jsx";
import GoogleButton from "./GoogleButton.jsx";

function paths(scope) {
  const base = scope === "invest" ? "/invest" : "";
  return {
    login: `${base}/login`,
    staff: `${base}/staff-login`,
    register: `${base}/register`,
    forgot: `${base}/forgot-password`,
    home: scope === "invest" ? "/invest" : "/",
  };
}

function Shell({ scope, title, subtitle, children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
      <Logo className="mb-4 h-16 w-16 rounded-full bg-navy p-1" />
      <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
      {subtitle && <p className="mb-6 mt-1 text-center text-sm text-slate-500">{subtitle}</p>}
      <div className="card w-full p-6">{children}</div>
    </div>
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
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const dest = (user) => {
    if (scope === "invest") return ["ADMIN", "SUPERADMIN"].includes(user.role) ? "/invest/admin" : "/invest/dashboard";
    return ["ADMIN", "SUPERADMIN", "STAFF"].includes(user.role) ? "/admin" : "/dashboard";
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const { token, user } = await api(scope, "/auth/login", { method: "POST", body: { ...form, staff: !!staff } });
      login(token, user);
      nav(dest(user));
    } catch (e2) { setErr(e2.message); } finally { setLoading(false); }
  };

  const onGoogle = async (credential) => {
    setErr("");
    try {
      const { token, user } = await api(scope, "/auth/google", { method: "POST", body: { credential } });
      login(token, user);
      nav(dest(user));
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <Shell scope={scope} title={staff ? "Staff / Admin Login" : (scope === "invest" ? "Investor Login" : "User Login")}
      subtitle={staff ? "Authorized personnel only" : `Welcome back to Akshaya ${scope === "invest" ? "Invest" : "Exim"}`}>
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <div className="flex justify-end"><Link to={p.forgot} className="text-xs font-semibold text-navy hover:underline">Forgot password?</Link></div>
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Login"}</button>
      </form>
      {!staff && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" />OR<div className="h-px flex-1 bg-slate-200" /></div>
          <GoogleButton onCredential={onGoogle} />
          <p className="mt-4 text-center text-sm text-slate-500">No account? <Link to={p.register} className="font-semibold text-navy hover:underline">Register</Link></p>
          <Link to={p.staff} className="mt-3 block w-full rounded-lg border border-slate-200 py-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Staff / Admin Login →</Link>
        </>
      )}
      {staff && <Link to={p.login} className="mt-4 block text-center text-sm font-semibold text-navy hover:underline">← Back to user login</Link>}
    </Shell>
  );
}

export function RegisterScreen({ scope }) {
  const p = paths(scope);
  const login = useLogin(scope);
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", accountType: "B2C", companyName: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const { token, user } = await api(scope, "/auth/register", { method: "POST", body: form });
      login(token, user);
      nav(scope === "invest" ? "/invest/dashboard" : "/dashboard");
    } catch (e2) { setErr(e2.message); } finally { setLoading(false); }
  };

  return (
    <Shell scope={scope} title={scope === "invest" ? "Create Investor Account" : "Create Account"} subtitle="Join Akshaya Exim Traders">
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Full Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
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
        <Field label="Password"><input className="input" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <button className="btn-gold w-full" disabled={loading}>{loading ? "Creating…" : "Register"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">Already have an account? <Link to={p.login} className="font-semibold text-navy hover:underline">Login</Link></p>
    </Shell>
  );
}

export function ForgotScreen({ scope }) {
  const p = paths(scope);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try { const r = await api(scope, "/auth/forgot-password", { method: "POST", body: { email } }); setMsg(r.message || "Check your email."); } catch (e2) { setMsg(e2.message); }
  };
  return (
    <Shell scope={scope} title="Forgot Password" subtitle="We'll email you a reset link">
      <form onSubmit={submit} className="space-y-4">
        {msg && <Alert type="success">{msg}</Alert>}
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <button className="btn-primary w-full">Send reset link</button>
      </form>
      <p className="mt-4 text-center text-sm"><Link to={p.login} className="font-semibold text-navy hover:underline">Back to login</Link></p>
    </Shell>
  );
}

export function ResetScreen({ scope }) {
  const p = paths(scope);
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
    <Shell scope={scope} title="Reset Password">
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        {ok && <Alert type="success">Password updated. Redirecting to login…</Alert>}
        <Field label="New Password"><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn-primary w-full">Update Password</button>
      </form>
    </Shell>
  );
}
