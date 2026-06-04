import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import AdminInvestorKycManageForm from "./AdminInvestorKycManageForm.jsx";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr } from "../../lib/format.js";
import { ADMIN_MAX_MONTHLY_ROI_PCT } from "../../lib/adminRoiLimits.js";
import { Badge, Field, Alert, PasswordInput } from "../ui.jsx";
import KycFullViewModal from "./KycFullViewModal.jsx";
import AgreementPdfViewDialog from "./AgreementPdfViewDialog.jsx";

const MANAGE_TABS = [
  { id: "profile", label: "KYC & Bank" },
  { id: "wallet", label: "Wallet" },
  { id: "invest", label: "Invest" },
  { id: "roi", label: "Custom ROI" },
  { id: "payout", label: "Schedule payout" },
];

const WORKFLOW_STEPS = [
  { n: 1, title: "Create investor", detail: "Create investor tab — account, KYC, bank & optional initial deposit" },
  { n: 2, title: "Credit wallet", detail: "Manage → Wallet — credit Available (or Earnings); optional prior notice" },
  { n: 3, title: "Assign plan", detail: "Manage → Invest — pick plan, amount, optional custom ROI %" },
  { n: 4, title: "Schedule payout", detail: "Manage → Schedule payout — sends prior notice; ledger not updated yet" },
  { n: 5, title: "Mark payout done", detail: "Sidebar → Withdrawals — Mark payout done after external payment" },
];

const EMPTY_CREATE = {
  name: "", email: "", password: "", phone: "",
  upiId: "", bankName: "", accountNumber: "", ifsc: "",
  panNumber: "", aadhaarNumber: "", address: "",
  initialDeposit: "",
};

export default function InvestorOpsPanel() {
  const [sp, setSp] = useSearchParams();
  const { invest } = useAuth();
  const isSuper = invest?.role === "SUPERADMIN";
  const isAdminRole = invest?.role === "ADMIN" || invest?.role === "SUPERADMIN";
  const [tab, setTab] = useState(() => (sp.get("manage") ? "manage" : "list"));
  const [investors, setInvestors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authFilter, setAuthFilter] = useState("all");
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pickerId, setPickerId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const flash = (m, e) => { setMsg(m || ""); setErr(e || ""); };
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [manageTab, setManageTab] = useState("profile");
  const [viewKyc, setViewKyc] = useState(null);
  const [pdfAgreement, setPdfAgreement] = useState(null);

  const [walletForm, setWalletForm] = useState({
    amount: "",
    direction: "CREDIT",
    bucket: "available",
    transactionType: "CASH_DEPOSIT",
    note: "",
    sendNotice: true,
  });
  const [cancelSub, setCancelSub] = useState({ subscriptionId: "", reason: "", refundPrincipal: true });
  const [subForm, setSubForm] = useState({
    planId: "",
    amount: "",
    lockInMonths: "",
    customMonthlyRoiPct: "",
    roiOverrideNote: "",
    skipBalanceCheck: false,
  });
  const [roiForm, setRoiForm] = useState({ subscriptionId: "", monthlyRoiPct: "", lockInMonths: "", roiOverrideNote: "" });
  const [payoutForm, setPayoutForm] = useState({ amount: "", payoutKind: "ROI_RETURN", mode: "UPI", remarks: "" });
  const [resetPwd, setResetPwd] = useState({ password: "", sendLink: false });

  const load = async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (silent) setRefreshing(true);
    else setLoadingList(true);
    setLoadErr("");
    try {
      const d = await investApi("/admin/investors");
      const list = (d.investors || []).filter((i) => i.role === "INVESTOR");
      setInvestors(list);
      setSummary(d.summary || null);
    } catch (e) {
      setLoadErr(e.message || "Could not load investors.");
      setInvestors([]);
      setSummary(null);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
    investApi("/public/plans").then((d) => setPlans(d.plans || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const manageFromUrl = sp.get("manage");

  const syncManageUrl = (id) => {
    if (id) setSp({ tab: "investors", manage: id }, { replace: true });
    else setSp({ tab: "investors" }, { replace: true });
  };

  const loadDetail = async (id) => {
    if (!id) return;
    setSelectedId(id);
    setDetailLoading(true);
    setErr("");
    try {
      const d = await investApi(`/admin/investors/${id}`);
      if (!d?.investor) throw new Error("Investor not found");
      setDetail(d.investor);
      setSelectedId(id);
      setTab("manage");
      setManageTab("profile");
      syncManageUrl(id);
    } catch (e) {
      setDetail(null);
      setSelectedId("");
      flash("", e.message || "Could not load investor for management.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!manageFromUrl) return;
    if (detail?.id === manageFromUrl && tab === "manage") return;
    loadDetail(manageFromUrl);
  }, [manageFromUrl]);

  const authLabel = (i) => {
    if (i.authMethod === "google") return "Google";
    if (i.authMethod === "password") return "Email";
    if (i.authMethod === "google_and_password") return "Google + Email";
    return "—";
  };

  const filtered = useMemo(() => {
    let list = investors;
    if (authFilter === "google") {
      list = list.filter((i) => i.hasGoogle || i.authMethod === "google" || i.authMethod === "google_and_password");
    } else if (authFilter === "password") {
      list = list.filter((i) => i.hasPassword || i.authMethod === "password" || i.authMethod === "google_and_password");
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => {
      const hay = [i.name, i.email, i.phone, i.id, authLabel(i)].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [investors, search, authFilter]);

  const openManageTab = () => {
    setTab("manage");
    if (detail) return;
    if (manageFromUrl) {
      loadDetail(manageFromUrl);
      return;
    }
    if (filtered.length === 1) loadDetail(filtered[0].id);
  };

  const leaveManage = () => {
    setTab("list");
    setDetail(null);
    setSelectedId("");
    syncManageUrl(null);
  };

  const createInvestor = async (e) => {
    e.preventDefault();
    flash();
    try {
      await investApi("/admin/investors/create-full", {
        method: "POST",
        body: {
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          phone: createForm.phone,
          upiId: createForm.upiId,
          bankName: createForm.bankName,
          accountNumber: createForm.accountNumber,
          ifsc: createForm.ifsc,
          initialDeposit: createForm.initialDeposit ? Number(createForm.initialDeposit) : 0,
          kyc: {
            fullName: createForm.name,
            phone: createForm.phone,
            panNumber: createForm.panNumber,
            aadhaarNumber: createForm.aadhaarNumber,
            address: createForm.address,
            bankName: createForm.bankName,
            bankAccount: createForm.accountNumber,
            ifscCode: createForm.ifsc,
            upiId: createForm.upiId,
          },
        },
      });
      flash("Investor created with KYC and bank details.");
      setCreateForm(EMPTY_CREATE);
      load();
      setTab("list");
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const adjustWallet = async (e) => {
    e.preventDefault();
    flash();
    try {
      await investApi("/admin/wallet/adjust", { method: "POST", body: { investorId: detail.id, ...walletForm, amount: Number(walletForm.amount) } });
      flash(walletForm.sendNotice ? "Wallet adjusted — prior notice sent to investor." : "Wallet adjusted.");
      await loadDetail(detail.id);
      load();
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const assignPlan = async (e) => {
    e.preventDefault();
    flash();
    try {
      await investApi(`/admin/investors/${detail.id}/subscribe`, {
        method: "POST",
        body: {
          ...subForm,
          amount: Number(subForm.amount),
          customLockInMonths: subForm.lockInMonths ? Number(subForm.lockInMonths) : undefined,
          customMonthlyRoiPct: subForm.customMonthlyRoiPct ? Number(subForm.customMonthlyRoiPct) : undefined,
        },
      });
      flash("Investment plan assigned.");
      await loadDetail(detail.id);
      load();
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const updateRoi = async (e) => {
    e.preventDefault();
    flash();
    try {
      await investApi(`/admin/subscriptions/${roiForm.subscriptionId}/roi`, {
        method: "PATCH",
        body: {
          monthlyRoiPct: Number(roiForm.monthlyRoiPct),
          lockInMonths: roiForm.lockInMonths ? Number(roiForm.lockInMonths) : undefined,
          roiOverrideNote: roiForm.roiOverrideNote,
        },
      });
      flash("Custom ROI updated — investor notified.");
      await loadDetail(detail.id);
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const toggleActive = async (investor, next) => {
    if (!isSuper) return;
    flash();
    try {
      await investApi(`/admin/investors/${investor.id}`, { method: "PATCH", body: { isActive: next } });
      flash(next ? `${investor.name} unblocked.` : `${investor.name} blocked.`);
      load();
      if (detail?.id === investor.id) await loadDetail(investor.id);
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const resetKyc = async () => {
    if (!detail || !window.confirm("Delete this investor's KYC record? They must submit KYC again.")) return;
    flash();
    try {
      await investApi(`/admin/investors/${detail.id}/kyc`, { method: "DELETE" });
      flash("KYC record deleted.");
      await loadDetail(detail.id);
      load();
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const cancelPlan = async (e) => {
    e.preventDefault();
    if (!cancelSub.subscriptionId) return;
    flash();
    try {
      await investApi(`/admin/subscriptions/${cancelSub.subscriptionId}/cancel`, {
        method: "POST",
        body: { reason: cancelSub.reason, refundPrincipal: cancelSub.refundPrincipal },
      });
      flash("Plan cancelled (opt-out). Principal returned to wallet when enabled.");
      setCancelSub({ subscriptionId: "", reason: "", refundPrincipal: true });
      await loadDetail(detail.id);
      load();
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!isSuper || !detail) return;
    flash();
    try {
      const r = await investApi(`/admin/investors/${detail.id}/reset-password`, {
        method: "POST",
        body: resetPwd.sendLink
          ? { sendResetLink: true }
          : { password: resetPwd.password },
      });
      flash(r.message || "Password reset.");
      setResetPwd({ password: "", sendLink: false });
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const schedulePayout = async (e) => {
    e.preventDefault();
    flash();
    try {
      await investApi("/admin/payouts/schedule", {
        method: "POST",
        body: { investorId: detail.id, ...payoutForm, amount: Number(payoutForm.amount) },
      });
      flash("Prior notice sent. Mark payout done from Withdrawals tab when paid.");
      setPayoutForm({ amount: "", payoutKind: "ROI_RETURN", mode: "UPI", remarks: "" });
    } catch (e2) {
      flash("", e2.message);
    }
  };

  const selectedPlan = plans.find((p) => p.id === subForm.planId);

  return (
    <div className="page-stack">
      <KycFullViewModal open={Boolean(viewKyc)} kyc={viewKyc} onClose={() => setViewKyc(null)} />

      <div>
        <h2 className="text-lg font-bold">Investor Management</h2>
        <p className="text-sm text-muted-foreground">
          Super Admin and Admin can manage investors on behalf: create accounts, add/edit/delete KYC, credit or debit wallet (cash/manual),
          opt in to plans, opt out (cancel), invest, schedule withdrawals, and deposits.
        </p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}
      {loadErr && <Alert type="error">{loadErr}</Alert>}

      <div className="card border border-primary/20 bg-primary/5 p-4">
        <h3 className="text-sm font-bold text-heading">Typical admin workflow</h3>
        <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
          {WORKFLOW_STEPS.map((s) => (
            <li key={s.n} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-accent-tone">{s.n}</span>
              <span><strong className="text-foreground">{s.title}</strong> — {s.detail}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {[
          { id: "list", label: "All investors" },
          { id: "create", label: "Create investor" },
          { id: "manage", label: detail ? `Manage: ${detail.name}` : "Manage investor" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === "list") leaveManage();
              else if (t.id === "manage") openManageTab();
              else {
                setTab(t.id);
                syncManageUrl(null);
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? "bg-primary/15 text-accent-tone" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          {summary && (
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{summary.investors ?? investors.length}</strong> investor accounts
              {summary.google != null && (
                <> · <strong className="text-foreground">{summary.google}</strong> used Google sign-in</>
              )}
              {summary.password != null && (
                <> · <strong className="text-foreground">{summary.password}</strong> registered with email/password</>
              )}
              . Includes every Google and registered user on the invest portal.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["all", "All"],
              ["google", "Google sign-in"],
              ["password", "Email registered"],
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setAuthFilter(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${authFilter === v ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <input className="input max-w-xs" placeholder="Search name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" className="btn-outline text-xs" disabled={refreshing || loadingList} onClick={() => load({ silent: true })}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="app-table-wrap card">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Sign-in</th>
                  <th className="p-3">Email / Phone</th>
                  <th className="p-3">Wallet</th>
                  <th className="p-3">KYC</th>
                  {isSuper && <th className="p-3">Active</th>}
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList && (
                  <tr>
                    <td colSpan={isSuper ? 7 : 6} className="p-6 text-center text-muted-foreground">Loading investors…</td>
                  </tr>
                )}
                {!loadingList && filtered.length === 0 && (
                  <tr>
                    <td colSpan={isSuper ? 7 : 6} className="p-6 text-center text-muted-foreground">
                      No investors match this filter. Google and email registrations both appear here — use User KYC &amp; Accounts only for submitted KYC forms.
                    </td>
                  </tr>
                )}
                {!loadingList && filtered.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3">
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{authLabel(i)}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{i.email}<br /><span className="text-xs">{i.phone || "—"}</span></td>
                    <td className="p-3">{inr(i.wallet?.available || 0)} avail · {inr(i.wallet?.invested || 0)} inv</td>
                    <td className="p-3"><Badge status={i.kyc?.status || "PENDING"} /></td>
                    {isSuper && (
                      <td className="p-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={i.isActive !== false}
                            onChange={(e) => toggleActive(i, e.target.checked)}
                          />
                          <span>{i.isActive !== false ? "On" : "Blocked"}</span>
                        </label>
                      </td>
                    )}
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {i.kyc ? (
                          <button
                            type="button"
                            className="btn-outline px-2 py-1 text-xs"
                            onClick={() => setViewKyc({ ...i.kyc, investor: i })}
                          >
                            View KYC
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No KYC</span>
                        )}
                        <button
                          type="button"
                          className="btn-gold px-2 py-1 text-xs"
                          disabled={detailLoading && selectedId === i.id}
                          onClick={() => loadDetail(i.id)}
                        >
                          {detailLoading && selectedId === i.id ? "Loading…" : "Manage"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "create" && (
        <form onSubmit={createInvestor} className="card max-w-2xl space-y-4 p-5">
          <h3 className="font-bold">Create investor account</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><input className="input" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></Field>
            <Field label="Mobile"><input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></Field>
            <Field label="Password"><PasswordInput required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} autoComplete="new-password" /></Field>
          </div>
          <h4 className="text-sm font-semibold">Bank & payout</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UPI ID"><input className="input" value={createForm.upiId} onChange={(e) => setCreateForm({ ...createForm, upiId: e.target.value })} /></Field>
            <Field label="Bank name"><input className="input" value={createForm.bankName} onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })} /></Field>
            <Field label="Account number"><input className="input" value={createForm.accountNumber} onChange={(e) => setCreateForm({ ...createForm, accountNumber: e.target.value })} /></Field>
            <Field label="IFSC"><input className="input" value={createForm.ifsc} onChange={(e) => setCreateForm({ ...createForm, ifsc: e.target.value })} /></Field>
          </div>
          <h4 className="text-sm font-semibold">KYC (auto-approved)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="PAN"><input className="input" value={createForm.panNumber} onChange={(e) => setCreateForm({ ...createForm, panNumber: e.target.value })} /></Field>
            <Field label="Aadhaar"><input className="input" value={createForm.aadhaarNumber} onChange={(e) => setCreateForm({ ...createForm, aadhaarNumber: e.target.value })} /></Field>
            <Field label="Address" className="sm:col-span-2"><textarea className="input" rows={2} value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} /></Field>
          </div>
          <Field label="Initial deposit to wallet (₹, optional)"><input className="input" type="number" min="0" value={createForm.initialDeposit} onChange={(e) => setCreateForm({ ...createForm, initialDeposit: e.target.value })} /></Field>
          <button className="btn-gold">Create investor</button>
        </form>
      )}

      {tab === "manage" && detail && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{detail.name}</span>
                {isSuper && (
                  <label className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={detail.isActive !== false}
                      onChange={(e) => toggleActive(detail, e.target.checked)}
                    />
                    Account {detail.isActive !== false ? "active" : "blocked"}
                  </label>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{detail.email} · {detail.phone || "No phone"}</div>
              {detail.kyc && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-primary"
                  onClick={() => setViewKyc({ ...detail.kyc, investor: detail })}
                >
                  View full KYC
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>Avail: <b>{inr(detail.wallet?.available || 0)}</b></span>
              <span>Invested: <b>{inr(detail.wallet?.invested || 0)}</b></span>
              <span>Earnings: <b>{inr(detail.wallet?.earnings || 0)}</b></span>
            </div>
          </div>

          {(detail.loginSessions?.length > 0) && (
            <div className="card p-4">
              <h4 className="text-sm font-bold">Login history (IP & location)</h4>
              <p className="mt-1 text-xs text-muted-foreground">One active device per account. New login signs out other devices.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs">
                  <thead className="text-left uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">When</th>
                      <th className="p-2">IP</th>
                      <th className="p-2">Location</th>
                      <th className="p-2">Device</th>
                      <th className="p-2">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.loginSessions.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-2">{dateStr(s.createdAt, true)}</td>
                        <td className="p-2 font-mono">{s.ipAddress || "—"}</td>
                        <td className="p-2">{[s.city, s.region, s.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="p-2">{s.deviceLabel || "—"}</td>
                        <td className="p-2">{s.isCurrent ? "Yes" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isSuper && (
            <form onSubmit={resetPassword} className="card max-w-lg space-y-3 p-5 border border-amber-500/20">
              <h4 className="text-sm font-bold">Reset password (Super Admin)</h4>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={resetPwd.sendLink} onChange={(e) => setResetPwd({ ...resetPwd, sendLink: e.target.checked })} />
                Email password reset link instead
              </label>
              {!resetPwd.sendLink && (
                <Field label="New password (min 8)">
                  <PasswordInput minLength={8} value={resetPwd.password} onChange={(e) => setResetPwd({ ...resetPwd, password: e.target.value })} autoComplete="new-password" />
                </Field>
              )}
              <button className="btn-outline text-sm" type="submit">Reset password</button>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {MANAGE_TABS.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => setManageTab(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${manageTab === id ? "bg-amber-500/15 text-amber-700" : "text-muted-foreground"}`}>{label}</button>
            ))}
          </div>

          {manageTab === "profile" && (
            <div className="space-y-3">
              <AdminInvestorKycManageForm
                detail={detail}
                setDetail={setDetail}
                onSaved={() => {
                  flash("KYC, bank details and documents saved.");
                  load({ silent: true });
                }}
                onError={(m) => flash("", m)}
              />
              {detail.kyc && (
                <button type="button" className="btn-outline text-rose-600" onClick={resetKyc}>
                  Delete KYC record
                </button>
              )}
            </div>
          )}

          {manageTab === "wallet" && (
            <form onSubmit={adjustWallet} className="card max-w-lg space-y-3 p-5">
              <p className="text-sm text-muted-foreground">
                Top-up (credit) or debit wallet for cash/manual transactions. Use Available for deposits and withdrawals.
              </p>
              <Field label="Transaction type">
                <select
                  className="input"
                  value={walletForm.transactionType}
                  onChange={(e) => {
                    const t = e.target.value;
                    const direction = t === "CASH_WITHDRAWAL" ? "DEBIT" : "CREDIT";
                    setWalletForm({ ...walletForm, transactionType: t, direction, bucket: "available" });
                  }}
                >
                  <option value="CASH_DEPOSIT">Cash deposit / top-up</option>
                  <option value="CASH_WITHDRAWAL">Cash withdrawal / payout</option>
                  <option value="MANUAL_ADJUSTMENT">Manual adjustment (any bucket)</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Direction">
                  <select
                    className="input"
                    value={walletForm.direction}
                    disabled={walletForm.transactionType !== "MANUAL_ADJUSTMENT"}
                    onChange={(e) => setWalletForm({ ...walletForm, direction: e.target.value })}
                  >
                    <option value="CREDIT">Add funds (+)</option>
                    <option value="DEBIT">Withdraw (−)</option>
                  </select>
                </Field>
                <Field label="Bucket">
                  <select
                    className="input"
                    value={walletForm.bucket}
                    disabled={walletForm.transactionType !== "MANUAL_ADJUSTMENT"}
                    onChange={(e) => setWalletForm({ ...walletForm, bucket: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="invested">Invested</option>
                    <option value="earnings">Earnings</option>
                  </select>
                </Field>
              </div>
              <Field label="Amount (₹)"><input className="input" type="number" required min="1" value={walletForm.amount} onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })} /></Field>
              <Field label="Note"><input className="input" value={walletForm.note} onChange={(e) => setWalletForm({ ...walletForm, note: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={walletForm.sendNotice} onChange={(e) => setWalletForm({ ...walletForm, sendNotice: e.target.checked })} /> Send prior notice email/notification to investor</label>
              <button className="btn-gold">Apply wallet change</button>
            </form>
          )}

          {manageTab === "invest" && (
            <div className="space-y-4">
            <form onSubmit={assignPlan} className="card max-w-lg space-y-3 p-5">
              <Field label="Investment plan">
                <select className="input" required value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}>
                  <option value="">Select plan…</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.monthlyRoiPct}%/mo</option>)}
                </select>
              </Field>
              <Field label="Amount (₹)">
                <input
                  className="input"
                  type="number"
                  required
                  min={selectedPlan?.minInvestment}
                  max={selectedPlan?.maxInvestment}
                  value={subForm.amount}
                  onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
                />
                {selectedPlan && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Plan range: {inr(selectedPlan.minInvestment)} – {inr(selectedPlan.maxInvestment)}
                  </p>
                )}
              </Field>
              <Field label="Lock-in (months, optional)">
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="60"
                  placeholder={selectedPlan ? String(Math.round(selectedPlan.lockInDays / 30)) : "Plan default"}
                  value={subForm.lockInMonths}
                  onChange={(e) => setSubForm({ ...subForm, lockInMonths: e.target.value })}
                />
              </Field>
              <Field label={`Custom monthly ROI % (optional${!isSuper ? `, max ${ADMIN_MAX_MONTHLY_ROI_PCT}%` : ""})`}>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min="0"
                  max={isSuper ? undefined : ADMIN_MAX_MONTHLY_ROI_PCT}
                  placeholder="Leave blank to use plan default"
                  value={subForm.customMonthlyRoiPct}
                  onChange={(e) => setSubForm({ ...subForm, customMonthlyRoiPct: e.target.value })}
                />
                {!isSuper && (
                  <p className="mt-1 text-xs text-muted-foreground">Admins cannot set monthly ROI above {ADMIN_MAX_MONTHLY_ROI_PCT}%. Super Admin has no limit.</p>
                )}
              </Field>
              <Field label="ROI override note"><input className="input" value={subForm.roiOverrideNote} onChange={(e) => setSubForm({ ...subForm, roiOverrideNote: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subForm.skipBalanceCheck} onChange={(e) => setSubForm({ ...subForm, skipBalanceCheck: e.target.checked })} /> Skip balance check (credit wallet first if needed)</label>
              <button className="btn-gold">Assign plan & invest (opt-in)</button>
            </form>

            <div className="card max-w-lg space-y-3 p-5">
              <h4 className="text-sm font-bold">Active plans — opt out / cancel</h4>
              {(detail.subscriptions || []).filter((s) => s.status === "ACTIVE").length === 0 ? (
                <p className="text-sm text-muted-foreground">No active subscriptions.</p>
              ) : (
                <form onSubmit={cancelPlan} className="space-y-3">
                  <Field label="Plan to cancel">
                    <select
                      className="input"
                      required
                      value={cancelSub.subscriptionId}
                      onChange={(e) => setCancelSub({ ...cancelSub, subscriptionId: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {(detail.subscriptions || [])
                        .filter((s) => s.status === "ACTIVE")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.plan?.name} — {inr(s.amount)}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Reason (optional)">
                    <input className="input" value={cancelSub.reason} onChange={(e) => setCancelSub({ ...cancelSub, reason: e.target.value })} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={cancelSub.refundPrincipal}
                      onChange={(e) => setCancelSub({ ...cancelSub, refundPrincipal: e.target.checked })}
                    />
                    Return principal to available wallet
                  </label>
                  <button className="btn-outline" type="submit">Cancel plan (opt-out)</button>
                </form>
              )}
            </div>
            </div>
          )}

          {manageTab === "roi" && (
            <div className="space-y-4">
              <div className="card p-4">
                <h4 className="mb-2 text-sm font-bold">Active investments</h4>
                {(detail.subscriptions || []).filter((s) => s.status === "ACTIVE").map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
                    <span>{s.plan?.name} — {inr(s.amount)} @ {s.monthlyRoiPct}%/mo</span>
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={() =>
                        setRoiForm({
                          subscriptionId: s.id,
                          monthlyRoiPct: String(s.monthlyRoiPct),
                          lockInMonths: String(Math.round((s.lockInDays || s.plan?.lockInDays || 360) / 30)),
                          roiOverrideNote: s.roiOverrideNote || "",
                        })
                      }
                    >
                      Adjust terms
                    </button>
                  </div>
                ))}
                {!detail.subscriptions?.some((s) => s.status === "ACTIVE") && <p className="text-sm text-muted-foreground">No active subscriptions.</p>}
              </div>
              {roiForm.subscriptionId && (
                <form onSubmit={updateRoi} className="card max-w-lg space-y-3 p-5">
                  <Field label={`New monthly ROI %${!isSuper ? ` (max ${ADMIN_MAX_MONTHLY_ROI_PCT}%)` : ""}`}>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      required
                      max={isSuper ? undefined : ADMIN_MAX_MONTHLY_ROI_PCT}
                      value={roiForm.monthlyRoiPct}
                      onChange={(e) => setRoiForm({ ...roiForm, monthlyRoiPct: e.target.value })}
                    />
                  </Field>
                  <Field label="Lock-in (months)">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="60"
                      value={roiForm.lockInMonths}
                      onChange={(e) => setRoiForm({ ...roiForm, lockInMonths: e.target.value })}
                    />
                  </Field>
                  <Field label="Reason / note"><input className="input" value={roiForm.roiOverrideNote} onChange={(e) => setRoiForm({ ...roiForm, roiOverrideNote: e.target.value })} /></Field>
                  <button className="btn-gold">Save custom ROI</button>
                </form>
              )}
            </div>
          )}

          {manageTab === "payout" && (
            <form onSubmit={schedulePayout} className="card max-w-lg space-y-3 p-5">
              <p className="text-sm text-muted-foreground">
                Sends email & in-app prior notice to the investor. Status becomes <strong>SCHEDULED</strong> — go to{" "}
                <strong>Withdrawals</strong> in the sidebar and click <strong>Mark payout done</strong> after you pay externally.
              </p>
              <Field label="Payout type">
                <select className="input" value={payoutForm.payoutKind} onChange={(e) => setPayoutForm({ ...payoutForm, payoutKind: e.target.value })}>
                  <option value="ROI_RETURN">Profit / ROI credit</option>
                  <option value="MANUAL_CREDIT">Manual credit to earnings</option>
                  <option value="WITHDRAWAL">Withdrawal to UPI/Bank</option>
                </select>
              </Field>
              {payoutForm.payoutKind === "WITHDRAWAL" && (
                <Field label="Mode">
                  <select className="input" value={payoutForm.mode} onChange={(e) => setPayoutForm({ ...payoutForm, mode: e.target.value })}>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank</option>
                  </select>
                </Field>
              )}
              <Field label="Amount (₹)"><input className="input" type="number" required min="1" value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} /></Field>
              <Field label="Remarks"><input className="input" value={payoutForm.remarks} onChange={(e) => setPayoutForm({ ...payoutForm, remarks: e.target.value })} /></Field>
              <button className="btn-gold">Send notice & schedule payout</button>
            </form>
          )}

          {isAdminRole && (detail.agreements?.length > 0) && (
            <div className="card p-5">
              <h4 className="mb-3 font-bold">All agreements (including archived)</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Ref / Title</th>
                      <th className="p-2">Plan</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Subscription</th>
                      <th className="p-2 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.agreements.map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="p-2">
                          <div className="font-mono text-xs">{a.agreementUid || a.id.slice(-8)}</div>
                          <div className="text-xs text-muted-foreground">{a.title}</div>
                        </td>
                        <td className="p-2">{a.subscription?.plan?.name || "—"}</td>
                        <td className="p-2"><Badge status={a.status} /></td>
                        <td className="p-2 text-xs">{a.subscription?.status || "—"}</td>
                        <td className="p-2 text-right">
                          <button type="button" className="btn-outline px-2 py-1 text-xs" onClick={() => setPdfAgreement(a)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      <AgreementPdfViewDialog
        admin
        open={Boolean(pdfAgreement)}
        onClose={() => setPdfAgreement(null)}
        documentKey={pdfAgreement?.id}
        agreementId={pdfAgreement?.id}
        agreementUid={pdfAgreement?.agreementUid}
      />
    </div>
  );
}
