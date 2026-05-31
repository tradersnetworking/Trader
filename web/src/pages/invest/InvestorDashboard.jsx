import { useEffect, useState } from "react";
import { investApi, getToken } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr, daysLeft } from "../../lib/format.js";
import { Stat, Badge, Copyable, Field, Alert } from "../../components/ui.jsx";
import PlanCard from "../../components/PlanCard.jsx";
import SubscribeModal from "../../components/SubscribeModal.jsx";

export default function InvestorDashboard() {
  const { invest } = useAuth();
  const [tab, setTab] = useState("overview");
  const [wallet, setWallet] = useState(null);
  const [subs, setSubs] = useState([]);
  const [kyc, setKyc] = useState(null);

  const loadCore = () => {
    investApi("/wallet").then((d) => setWallet(d.wallet)).catch(() => {});
    investApi("/subscriptions").then((d) => setSubs(d.subscriptions)).catch(() => {});
    investApi("/kyc").then((d) => setKyc(d.kyc)).catch(() => {});
  };
  useEffect(() => { loadCore(); }, []);

  const tabs = [["overview", "Overview"], ["plans", "Plans"], ["investments", "My Investments"], ["wallet", "Wallet & Ledger"], ["deposit", "Add Funds"], ["withdraw", "Withdraw"], ["kyc", "KYC"], ["profile", "Profile"]];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-navy">Hello, {invest?.name}</h1>
      <p className="text-sm text-slate-500">{invest?.email} • KYC: <Badge status={kyc?.status || "PENDING"} /></p>

      {kyc?.status !== "APPROVED" && (
        <div className="mt-4"><Alert type="info">Complete your KYC (Profile → KYC tab) and add funds before investing.</Alert></div>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold ${tab === id ? "border-b-2 border-navy text-navy" : "text-slate-400"}`}>{label}</button>)}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview wallet={wallet} subs={subs} />}
        {tab === "plans" && <Plans onRefresh={loadCore} />}
        {tab === "investments" && <Investments subs={subs} />}
        {tab === "wallet" && <WalletTab wallet={wallet} />}
        {tab === "deposit" && <Deposit onRefresh={loadCore} />}
        {tab === "withdraw" && <Withdraw wallet={wallet} onRefresh={loadCore} />}
        {tab === "kyc" && <Kyc kyc={kyc} onRefresh={loadCore} />}
        {tab === "profile" && <Profile />}
      </div>
    </div>
  );
}

function Overview({ wallet, subs }) {
  const active = subs.filter((s) => s.status === "ACTIVE");
  const monthly = active.reduce((s, x) => s + x.monthlyReturn, 0);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Available Balance" value={inr(wallet?.available || 0)} accent="emerald" />
      <Stat label="Total Invested" value={inr(wallet?.invested || 0)} accent="blue" />
      <Stat label="Total Earnings" value={inr(wallet?.earnings || 0)} accent="violet" />
      <Stat label="Est. Monthly Income" value={inr(monthly)} accent="gold" />
    </div>
  );
}

function Plans({ onRefresh }) {
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  useEffect(() => { investApi("/public/plans").then((d) => setPlans(d.plans)).catch(() => {}); }, []);
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{plans.map((p) => <PlanCard key={p.id} plan={p} onSubscribe={setSub} />)}</div>
      {sub && <SubscribeModal plan={sub} onClose={() => setSub(null)} onDone={() => { setSub(null); onRefresh(); }} />}
    </>
  );
}

function Investments({ subs }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {subs.map((s) => (
        <div key={s.id} className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-navy">{s.plan?.name}</h3>
            <Badge status={s.matured ? "MATURED" : s.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-400">Invested</span><div className="font-bold text-navy">{inr(s.amount)}</div></div>
            <div><span className="text-slate-400">Monthly Return</span><div className="font-bold text-gold-600">{inr(s.monthlyReturn)}</div></div>
            <div><span className="text-slate-400">Started</span><div>{dateStr(s.startDate)}</div></div>
            <div><span className="text-slate-400">Matures</span><div>{dateStr(s.maturityDate)} ({daysLeft(s.maturityDate)}d)</div></div>
          </div>
          <div className="mt-3 rounded bg-slate-50 p-2 text-sm">
            Projected maturity ({s.matured ? "compounded" : "simple"}): <b className="text-navy">{inr(s.projection.maturityValue)}</b>
          </div>
        </div>
      ))}
      {subs.length === 0 && <p className="text-slate-400">No investments yet. Subscribe to a plan to begin.</p>}
    </div>
  );
}

function WalletTab({ wallet }) {
  const [ledger, setLedger] = useState([]);
  useEffect(() => { investApi("/ledger").then((d) => setLedger(d.ledger)).catch(() => {}); }, []);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Available" value={inr(wallet?.available || 0)} accent="emerald" />
        <Stat label="Invested" value={inr(wallet?.invested || 0)} accent="blue" />
        <Stat label="Earnings" value={inr(wallet?.earnings || 0)} accent="violet" />
      </div>
      <h3 className="mt-6 mb-2 font-bold text-navy">Ledger</h3>
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Direction</th><th className="p-3">Amount</th><th className="p-3">Balance</th><th className="p-3">Note</th></tr></thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-slate-400">{dateStr(e.createdAt)}</td>
                <td className="p-3">{e.type}</td>
                <td className="p-3"><span className={e.direction === "CREDIT" ? "text-green-600" : "text-red-500"}>{e.direction}</span></td>
                <td className="p-3 font-medium">{inr(e.amount)}</td>
                <td className="p-3">{inr(e.balanceAfter)}</td>
                <td className="p-3 text-slate-400">{e.note}</td>
              </tr>
            ))}
            {ledger.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No transactions.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Deposit({ onRefresh }) {
  const [bank, setBank] = useState(null);
  const [method, setMethod] = useState("UPI");
  const [amount, setAmount] = useState(10000);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [deposits, setDeposits] = useState([]);

  const load = () => investApi("/deposits").then((d) => setDeposits(d.deposits)).catch(() => {});
  useEffect(() => { investApi("/public/bank-details").then(setBank).catch(() => {}); load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    const fd = new FormData();
    fd.append("amount", amount); fd.append("method", method); fd.append("reference", reference);
    if (file) fd.append("proofImage", file);
    try {
      const res = await fetch("/api/invest/deposits", { method: "POST", headers: { Authorization: `Bearer ${getToken("invest")}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.payment?.mock ? "Deposit submitted (mock gateway). Pending admin approval." : "Deposit submitted. Pending admin approval.");
      setReference(""); setFile(null); load(); onRefresh();
    } catch (e2) { setErr(e2.message); }
  };

  const manual = ["IMPS", "NEFT", "RTGS"].includes(method);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 font-bold text-navy">Add Funds to Wallet</h3>
        <form onSubmit={submit} className="space-y-3">
          {msg && <Alert type="success">{msg}</Alert>}
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Method">
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <optgroup label="Online Gateways">{["RAZORPAY", "CASHFREE", "PAYU", "JUSPAY", "EXIMPE", "UPI"].map((m) => <option key={m}>{m}</option>)}</optgroup>
              <optgroup label="Manual Bank Transfer">{["IMPS", "NEFT", "RTGS"].map((m) => <option key={m}>{m}</option>)}</optgroup>
            </select>
          </Field>
          <Field label="Amount (₹)"><input className="input" type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Reference / UTR (optional)"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          {manual && <Field label="Upload Payment Proof" hint="Required for manual transfers — admin will verify"><input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0])} /></Field>}
          <button className="btn-gold w-full">Submit Deposit</button>
        </form>
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-bold text-navy">Recent deposits</h4>
          {deposits.slice(0, 5).map((d) => <div key={d.id} className="flex justify-between border-t py-1 text-sm"><span>{inr(d.amount)} • {d.method}</span><Badge status={d.status} /></div>)}
        </div>
      </div>
      {bank && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-navy">Company Bank Details</h3>
          <div className="space-y-2">
            <Copyable label="Bank Name" value={bank.bank.name} />
            <Copyable label="Account Name" value={bank.bank.accountName} />
            <Copyable label="Account Number" value={bank.bank.accountNumber} />
            <Copyable label="IFSC Code" value={bank.bank.ifsc} />
            <Copyable label="MICR Code" value={bank.bank.micr} />
            <Copyable label="SWIFT Code" value={bank.bank.swift} />
            <Copyable label="UPI ID" value={bank.upi.vpa} />
          </div>
          <p className="mt-3 text-xs text-slate-400">For IMPS/NEFT/RTGS, transfer to the above and upload your payment proof. Admin will approve and credit your wallet.</p>
        </div>
      )}
    </div>
  );
}

function Withdraw({ wallet, onRefresh }) {
  const [amount, setAmount] = useState(1000);
  const [mode, setMode] = useState("UPI");
  const [payouts, setPayouts] = useState([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const load = () => investApi("/payouts").then((d) => setPayouts(d.payouts)).catch(() => {});
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    try { await investApi("/payouts", { method: "POST", body: { amount: Number(amount), mode } }); setMsg("Withdrawal requested. Admin will release to your account."); load(); onRefresh(); }
    catch (e2) { setErr(e2.message); }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-1 font-bold text-navy">Withdraw Funds</h3>
        <p className="mb-3 text-sm text-slate-500">Available: <b>{inr(wallet?.available || 0)}</b></p>
        <form onSubmit={submit} className="space-y-3">
          {msg && <Alert type="success">{msg}</Alert>}
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Amount (₹)"><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Payout to"><select className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="UPI">UPI</option><option value="BANK">Bank Account</option></select></Field>
          <button className="btn-gold w-full">Request Withdrawal</button>
          <p className="text-xs text-slate-400">Set your UPI / bank details under Profile first.</p>
        </form>
      </div>
      <div className="card p-5">
        <h3 className="mb-2 font-bold text-navy">Withdrawal History</h3>
        {payouts.map((p) => <div key={p.id} className="flex justify-between border-t py-2 text-sm"><span>{inr(p.amount)} • {p.mode}<div className="text-xs text-slate-400">{p.destination}</div></span><Badge status={p.status} /></div>)}
        {payouts.length === 0 && <p className="text-slate-400">No withdrawals yet.</p>}
      </div>
    </div>
  );
}

function Kyc({ kyc, onRefresh }) {
  const [form, setForm] = useState({ fullName: kyc?.fullName || "", panNumber: kyc?.panNumber || "", aadhaarNumber: kyc?.aadhaarNumber || "", dob: kyc?.dob || "", address: kyc?.address || "" });
  const [files, setFiles] = useState({});
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    Object.entries(files).forEach(([k, f]) => f && fd.append(k, f));
    try {
      const res = await fetch("/api/invest/kyc", { method: "POST", headers: { Authorization: `Bearer ${getToken("invest")}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("KYC submitted for review."); onRefresh();
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <div className="max-w-xl card p-6">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-navy">KYC Verification</h3><Badge status={kyc?.status || "NOT SUBMITTED"} /></div>
      {kyc?.remarks && <Alert type="info">Admin remarks: {kyc.remarks}</Alert>}
      <form onSubmit={submit} className="mt-3 space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Full Name (as per PAN)"><input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="PAN Number"><input className="input" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} /></Field>
          <Field label="Aadhaar Number"><input className="input" value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} /></Field>
        </div>
        <Field label="Date of Birth"><input className="input" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
        <Field label="Address"><textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="PAN Doc"><input type="file" onChange={(e) => setFiles({ ...files, panDocument: e.target.files[0] })} /></Field>
          <Field label="Aadhaar Doc"><input type="file" onChange={(e) => setFiles({ ...files, aadhaarDocument: e.target.files[0] })} /></Field>
          <Field label="Photo"><input type="file" onChange={(e) => setFiles({ ...files, photo: e.target.files[0] })} /></Field>
        </div>
        <button className="btn-gold w-full">Submit KYC</button>
      </form>
    </div>
  );
}

function Profile() {
  const { invest, refreshInvest } = useAuth();
  const [form, setForm] = useState({ name: invest?.name || "", phone: invest?.phone || "", upiId: invest?.upiId || "", bankName: invest?.bankName || "", accountNumber: invest?.accountNumber || "", ifsc: invest?.ifsc || "" });
  const [msg, setMsg] = useState("");
  const submit = async (e) => { e.preventDefault(); await investApi("/profile", { method: "PUT", body: form }); setMsg("Saved."); refreshInvest(); };
  return (
    <div className="max-w-xl card p-6">
      <h3 className="mb-3 font-bold text-navy">Profile & Payout Details</h3>
      <form onSubmit={submit} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="UPI ID (for withdrawals)"><input className="input" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bank Name"><input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>
          <Field label="Account Number"><input className="input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></Field>
          <Field label="IFSC"><input className="input" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></Field>
        </div>
        <button className="btn-gold w-full">Save</button>
      </form>
    </div>
  );
}
