import { useEffect, useMemo, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge, Modal, Field, Alert } from "../ui.jsx";

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
  const [tab, setTab] = useState("list");
  const [investors, setInvestors] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [manageTab, setManageTab] = useState("profile");

  const [walletForm, setWalletForm] = useState({ amount: "", direction: "CREDIT", bucket: "available", note: "", sendNotice: true });
  const [subForm, setSubForm] = useState({ planId: "", amount: "", customMonthlyRoiPct: "", roiOverrideNote: "", skipBalanceCheck: false });
  const [roiForm, setRoiForm] = useState({ subscriptionId: "", monthlyRoiPct: "", roiOverrideNote: "" });
  const [payoutForm, setPayoutForm] = useState({ amount: "", payoutKind: "ROI_RETURN", mode: "UPI", remarks: "" });

  const load = () => {
    investApi("/admin/investors").then((d) => setInvestors((d.investors || []).filter((i) => i.role === "INVESTOR"))).catch(() => {});
    investApi("/public/plans").then((d) => setPlans(d.plans || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return investors;
    return investors.filter((i) => i.name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.phone?.includes(q));
  }, [investors, search]);

  const loadDetail = async (id) => {
    if (!id) return;
    const d = await investApi(`/admin/investors/${id}`);
    setDetail(d.investor);
    setSelectedId(id);
    setTab("manage");
    setManageTab("profile");
  };

  const flash = (m, e) => { setMsg(m || ""); setErr(e || ""); };

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

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!detail) return;
    flash();
    try {
      const body = {
        name: detail.name,
        phone: detail.phone,
        upiId: detail.upiId,
        bankName: detail.bankName,
        accountNumber: detail.accountNumber,
        ifsc: detail.ifsc,
        kyc: {
          fullName: detail.kyc?.fullName || detail.name,
          phone: detail.kyc?.phone || detail.phone,
          panNumber: detail.kyc?.panNumber,
          aadhaarNumber: detail.kyc?.aadhaarNumber,
          bankName: detail.kyc?.bankName || detail.bankName,
          bankAccount: detail.kyc?.bankAccount || detail.accountNumber,
          ifscCode: detail.kyc?.ifscCode || detail.ifsc,
          upiId: detail.kyc?.upiId || detail.upiId,
          address: detail.kyc?.address,
          status: detail.kyc?.status || "APPROVED",
        },
      };
      const d = await investApi(`/admin/investors/${detail.id}/full`, { method: "PUT", body });
      setDetail(d.investor);
      flash("Profile, KYC and bank details saved.");
      load();
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
        body: { monthlyRoiPct: Number(roiForm.monthlyRoiPct), roiOverrideNote: roiForm.roiOverrideNote },
      });
      flash("Custom ROI updated — investor notified.");
      await loadDetail(detail.id);
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

  return (
    <div className="page-stack">
      <div>
        <h2 className="text-lg font-bold">Investor Management</h2>
        <p className="text-sm text-muted-foreground">
          Create investors manually, set KYC & bank details, add/withdraw funds, assign plans, override ROI, and schedule payouts with prior notice.
        </p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

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
          { id: "manage", label: "Manage investor", disabled: !detail },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.disabled}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? "bg-primary/15 text-accent-tone" : "text-muted-foreground hover:bg-muted/50"} disabled:opacity-40`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <div className="flex flex-wrap gap-3">
            <input className="input max-w-xs" placeholder="Search name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" className="btn-outline text-xs" onClick={load}>Refresh</button>
          </div>
          <div className="app-table-wrap card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email / Phone</th>
                  <th className="p-3">Wallet</th>
                  <th className="p-3">KYC</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-muted-foreground">{i.email}<br /><span className="text-xs">{i.phone || "—"}</span></td>
                    <td className="p-3">{inr(i.wallet?.available || 0)} avail · {inr(i.wallet?.invested || 0)} inv</td>
                    <td className="p-3"><Badge status={i.kyc?.status || "PENDING"} /></td>
                    <td className="p-3 text-right">
                      <button type="button" className="text-xs font-semibold text-primary" onClick={() => loadDetail(i.id)}>Manage</button>
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
            <Field label="Password"><input className="input" type="password" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></Field>
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
              <div className="font-bold">{detail.name}</div>
              <div className="text-sm text-muted-foreground">{detail.email} · {detail.phone || "No phone"}</div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>Avail: <b>{inr(detail.wallet?.available || 0)}</b></span>
              <span>Invested: <b>{inr(detail.wallet?.invested || 0)}</b></span>
              <span>Earnings: <b>{inr(detail.wallet?.earnings || 0)}</b></span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {MANAGE_TABS.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => setManageTab(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${manageTab === id ? "bg-amber-500/15 text-amber-700" : "text-muted-foreground"}`}>{label}</button>
            ))}
          </div>

          {manageTab === "profile" && (
            <form onSubmit={saveProfile} className="card max-w-2xl space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name"><input className="input" value={detail.name || ""} onChange={(e) => setDetail({ ...detail, name: e.target.value })} /></Field>
                <Field label="Phone"><input className="input" value={detail.phone || ""} onChange={(e) => setDetail({ ...detail, phone: e.target.value })} /></Field>
                <Field label="UPI"><input className="input" value={detail.upiId || ""} onChange={(e) => setDetail({ ...detail, upiId: e.target.value })} /></Field>
                <Field label="Bank"><input className="input" value={detail.bankName || ""} onChange={(e) => setDetail({ ...detail, bankName: e.target.value })} /></Field>
                <Field label="Account"><input className="input" value={detail.accountNumber || ""} onChange={(e) => setDetail({ ...detail, accountNumber: e.target.value })} /></Field>
                <Field label="IFSC"><input className="input" value={detail.ifsc || ""} onChange={(e) => setDetail({ ...detail, ifsc: e.target.value })} /></Field>
                <Field label="PAN"><input className="input" value={detail.kyc?.panNumber || ""} onChange={(e) => setDetail({ ...detail, kyc: { ...detail.kyc, panNumber: e.target.value } })} /></Field>
                <Field label="Aadhaar"><input className="input" value={detail.kyc?.aadhaarNumber || ""} onChange={(e) => setDetail({ ...detail, kyc: { ...detail.kyc, aadhaarNumber: e.target.value } })} /></Field>
                <Field label="KYC status">
                  <select className="input" value={detail.kyc?.status || "APPROVED"} onChange={(e) => setDetail({ ...detail, kyc: { ...detail.kyc, status: e.target.value } })}>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </Field>
              </div>
              <button className="btn-gold">Save profile & KYC</button>
            </form>
          )}

          {manageTab === "wallet" && (
            <form onSubmit={adjustWallet} className="card max-w-lg space-y-3 p-5">
              <p className="text-sm text-muted-foreground">Add (credit) or withdraw (debit) from available, invested, or earnings bucket.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Direction">
                  <select className="input" value={walletForm.direction} onChange={(e) => setWalletForm({ ...walletForm, direction: e.target.value })}>
                    <option value="CREDIT">Add funds (+)</option>
                    <option value="DEBIT">Withdraw (−)</option>
                  </select>
                </Field>
                <Field label="Bucket">
                  <select className="input" value={walletForm.bucket} onChange={(e) => setWalletForm({ ...walletForm, bucket: e.target.value })}>
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
            <form onSubmit={assignPlan} className="card max-w-lg space-y-3 p-5">
              <Field label="Investment plan">
                <select className="input" required value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}>
                  <option value="">Select plan…</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.monthlyRoiPct}%/mo</option>)}
                </select>
              </Field>
              <Field label="Amount (₹)"><input className="input" type="number" required value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} /></Field>
              <Field label="Custom monthly ROI % (optional override)"><input className="input" type="number" step="0.1" placeholder="Leave blank to use plan default" value={subForm.customMonthlyRoiPct} onChange={(e) => setSubForm({ ...subForm, customMonthlyRoiPct: e.target.value })} /></Field>
              <Field label="ROI override note"><input className="input" value={subForm.roiOverrideNote} onChange={(e) => setSubForm({ ...subForm, roiOverrideNote: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subForm.skipBalanceCheck} onChange={(e) => setSubForm({ ...subForm, skipBalanceCheck: e.target.checked })} /> Skip balance check (credit wallet first if needed)</label>
              <button className="btn-gold">Assign plan & invest</button>
            </form>
          )}

          {manageTab === "roi" && (
            <div className="space-y-4">
              <div className="card p-4">
                <h4 className="mb-2 text-sm font-bold">Active investments</h4>
                {(detail.subscriptions || []).filter((s) => s.status === "ACTIVE").map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
                    <span>{s.plan?.name} — {inr(s.amount)} @ {s.monthlyRoiPct}%/mo</span>
                    <button type="button" className="text-xs text-primary" onClick={() => setRoiForm({ subscriptionId: s.id, monthlyRoiPct: String(s.monthlyRoiPct), roiOverrideNote: s.roiOverrideNote || "" })}>Adjust ROI</button>
                  </div>
                ))}
                {!detail.subscriptions?.some((s) => s.status === "ACTIVE") && <p className="text-sm text-muted-foreground">No active subscriptions.</p>}
              </div>
              {roiForm.subscriptionId && (
                <form onSubmit={updateRoi} className="card max-w-lg space-y-3 p-5">
                  <Field label="New monthly ROI %"><input className="input" type="number" step="0.1" required value={roiForm.monthlyRoiPct} onChange={(e) => setRoiForm({ ...roiForm, monthlyRoiPct: e.target.value })} /></Field>
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
        </div>
      )}
    </div>
  );
}
