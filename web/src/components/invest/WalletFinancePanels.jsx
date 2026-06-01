import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getToken, investApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Alert, Badge, Field } from "../ui.jsx";
import { APP_PAGE_STACK, APP_TABLE_WRAP } from "../../lib/ui-system.js";
import { useAuth } from "../../lib/store.jsx";
import { investPath } from "../../lib/site.js";
import {
  FinanceFieldLabel,
  MethodCategorySelect,
  MethodSelect,
  StepBanner,
} from "./PaymentMethodField.jsx";
import { CredentialRow, CompanyBankDetails } from "./WalletFinancePanels.shared.jsx";
import ShareProfitButton from "./ShareProfitButton.jsx";
import { handleGatewayCheckout, capturePayPalReturnIfNeeded } from "../../lib/onlineCheckout.js";
import { BANK_API_PROVIDERS, gatewayOptionLabel, providerLabel } from "../../lib/payment-providers.js";
import UpiQrDisplay from "../shared/UpiQrDisplay.jsx";

const DEPOSIT_METHODS = [
  { value: "upi", label: "UPI", icon: "📱", tone: "upi" },
  { value: "bank", label: "Bank Transfer", icon: "🏦", tone: "bank" },
  { value: "gateway", label: "Payment Gateway", icon: "💳", tone: "gateway" },
];

const WITHDRAW_METHODS = [
  { value: "UPI", label: "UPI", icon: "📱", tone: "upi" },
  { value: "BANK", label: "Bank Account", icon: "🏦", tone: "bank" },
];

const BANK_TRANSFER_TYPES = [
  { value: "IMPS", label: "IMPS (instant)" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS (high value)" },
];

function buildUpiPayUri(vpa, payeeName, amount) {
  if (!vpa) return null;
  const params = new URLSearchParams({ pa: vpa, pn: payeeName || "Akshaya Exim", cu: "INR" });
  if (amount && Number(amount) > 0) params.set("am", String(Number(amount)));
  return `upi://pay?${params.toString()}`;
}

function PayoutDestinationCard({ mode, investor }) {
  if (!investor) return null;
  const isUpi = mode === "UPI";
  const hasUpi = Boolean(investor.upiId);
  const hasBank = Boolean(investor.bankName && investor.accountNumber && investor.ifsc);

  if (isUpi && !hasUpi) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300">No UPI ID saved</p>
        <p className="mt-1 text-xs text-muted-foreground">Add your UPI ID under Profile before requesting a UPI withdrawal.</p>
        <Link to={investPath("/dashboard?tab=profile")} className="mt-2 inline-block text-xs font-semibold text-primary underline">
          Go to Profile →
        </Link>
      </div>
    );
  }
  if (!isUpi && !hasBank) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300">No bank account saved</p>
        <p className="mt-1 text-xs text-muted-foreground">Add bank name, account number & IFSC under Profile.</p>
        <Link to={investPath("/dashboard?tab=profile")} className="mt-2 inline-block text-xs font-semibold text-primary underline">
          Go to Profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Payout destination
      </p>
      {isUpi ? (
        <>
          <CredentialRow label="UPI ID" value={investor.upiId} />
          <CredentialRow label="Account holder" value={investor.name} mono={false} />
        </>
      ) : (
        <>
          <CredentialRow label="Account holder" value={investor.name} mono={false} />
          <CredentialRow label="Bank" value={investor.bankName} mono={false} />
          <CredentialRow label="Account No." value={investor.accountNumber} />
          <CredentialRow label="IFSC" value={investor.ifsc} />
        </>
      )}
    </div>
  );
}

export function DepositPanel({ onRefresh, suggestedAmount, pendingInvest, walletAvailable, onDepositSubmitted }) {
  const [bank, setBank] = useState(null);
  const [depositAccounts, setDepositAccounts] = useState({ upi: [], bank: [], online: [] });
  const [selectedUpiId, setSelectedUpiId] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [method, setMethod] = useState("upi");
  const [bankMethod, setBankMethod] = useState("IMPS");
  const [gateway, setGateway] = useState("");
  const [amount, setAmount] = useState(() => Math.max(1000, Number(suggestedAmount) || 10000));
  const [reference, setReference] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [deposits, setDeposits] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoBonus, setPromoBonus] = useState(null);
  const [promoErr, setPromoErr] = useState("");
  const [bankVa, setBankVa] = useState(null);

  useEffect(() => {
    if (suggestedAmount && Number(suggestedAmount) > 0) {
      setAmount(Math.max(1000, Math.ceil(Number(suggestedAmount))));
    }
  }, [suggestedAmount]);

  const notifyDepositDone = () => {
    onDepositSubmitted?.();
    onRefresh?.();
  };

  const load = () => investApi("/deposits").then((d) => setDeposits(d.deposits)).catch(() => {});

  useEffect(() => {
    investApi("/public/bank-details").then(setBank).catch(() => {});
    investApi("/public/deposit-accounts").then((d) => {
      const accounts = d.accounts || { upi: [], bank: [], online: [] };
      setDepositAccounts(accounts);
      if (accounts.upi?.[0]) setSelectedUpiId(accounts.upi[0].id);
      if (accounts.bank?.[0]) setSelectedBankId(accounts.bank[0].id);
    }).catch(() => {});
    investApi("/public/gateways").then((d) => {
      const list = d.gateways || [];
      setGateways(list);
      const defaultGw = String(d.defaultDepositGateway || "RAZORPAY").toUpperCase();
      const match = list.find((g) => g.name.toUpperCase() === defaultGw);
      setGateway(match ? defaultGw : list[0]?.name?.toUpperCase() || "RAZORPAY");
    }).catch(() => {});
    capturePayPalReturnIfNeeded(investApi).then(() => load());
  }, []);

  useEffect(() => {
    setReference("");
    setFile(null);
    setBankVa(null);
  }, [method]);

  const isGateway = method === "gateway";
  const needsProof = !isGateway;
  const selectedUpi = depositAccounts.upi.find((u) => u.id === selectedUpiId) || depositAccounts.upi[0];
  const selectedBank = depositAccounts.bank.find((b) => b.id === selectedBankId) || depositAccounts.bank[0];
  const upi = selectedUpi
    ? { vpa: selectedUpi.upiId, payeeName: selectedUpi.accountHolder || bank?.upi?.payeeName, qrCodeUrl: selectedUpi.qrCodeUrl }
    : bank?.upi;
  const upiPayLink = buildUpiPayUri(upi?.vpa, upi?.payeeName || bank?.bank?.accountName, amount);

  const resolveMethod = () => {
    if (method === "upi") return "UPI";
    if (method === "bank") return bankMethod;
    return gateway || "RAZORPAY";
  };

  const validatePromo = async () => {
    setPromoErr("");
    setPromoBonus(null);
    if (!promoCode.trim()) return;
    try {
      const d = await investApi("/promo/validate", {
        method: "POST",
        body: { code: promoCode.trim(), amount: Number(amount), appliesTo: "DEPOSIT" },
      });
      setPromoBonus(d.bonus);
    } catch (e) {
      setPromoErr(e.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (needsProof && !file) {
      setErr("Please upload payment proof (screenshot or PDF). Required for UPI and bank transfers.");
      return;
    }
    if (needsProof && !reference.trim()) {
      setErr("Please enter UTR / transaction reference.");
      return;
    }
    if (method === "upi" && !selectedUpi) {
      setErr("No company UPI account available. Contact support.");
      return;
    }
    if (method === "bank" && !selectedBank) {
      setErr("No company bank account available. Contact support.");
      return;
    }
    const fd = new FormData();
    fd.append("amount", amount);
    fd.append("method", resolveMethod());
    fd.append("reference", reference);
    if (method === "upi" && selectedUpi?.id) fd.append("paymentAccountId", selectedUpi.id);
    if (method === "bank" && selectedBank?.id) fd.append("paymentAccountId", selectedBank.id);
    if (promoCode.trim()) fd.append("promoCode", promoCode.trim());
    if (file) fd.append("proofImage", file);
    try {
      const res = await fetch("/api/invest/deposits", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken("invest")}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.payment?.virtualAccount) {
        setBankVa(data.payment.virtualAccount);
        if (data.payment.orderId) setReference(data.payment.orderId);
        setMsg(`Transfer ${inr(Number(amount))} to the virtual account below. Use reference ${data.payment.virtualAccount.reference || data.payment.orderId} when paying.`);
        load();
        notifyDepositDone();
        return;
      }
      if (isGateway && (await handleGatewayCheckout(data.payment, data.deposit))) return;
      const vaRaw = sessionStorage.getItem("bank_deposit_va");
      if (vaRaw) {
        try {
          const va = JSON.parse(vaRaw);
          sessionStorage.removeItem("bank_deposit_va");
          setMsg(
            `Transfer ${inr(Number(amount))} to virtual account: ${va.bank} · A/C ${va.accountNumber} · IFSC ${va.ifsc} · Ref ${va.reference}. Admin will credit after confirmation.`
          );
          setReference(va.reference || "");
          load();
          notifyDepositDone();
          return;
        } catch {
          sessionStorage.removeItem("bank_deposit_va");
        }
      }
      setMsg(
        data.autoApproved
          ? "Payment simulated — funds credited to your wallet instantly (mock gateway)."
          : data.payment?.mock
          ? "Deposit submitted (mock gateway). Pending admin approval."
          : pendingInvest
          ? "Deposit submitted. Once approved, return to Plans to complete your investment."
          : "Deposit submitted successfully. Admin will verify and credit your wallet."
      );
      setReference("");
      setFile(null);
      load();
      notifyDepositDone();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const paymentGateways = gateways.filter((g) => !BANK_API_PROVIDERS.has(g.name.toLowerCase()));
  const bankApiGateways = gateways.filter((g) => BANK_API_PROVIDERS.has(g.name.toLowerCase()));
  const gatewayOptionGroups = [
    paymentGateways.length
      ? {
          label: "Payment gateways",
          options: paymentGateways.map((g) => ({
            value: g.name.toUpperCase(),
            label: gatewayOptionLabel(g.name, g.configured),
          })),
        }
      : null,
    bankApiGateways.length
      ? {
          label: "Bank APIs (HDFC · Axis · ICICI · Yes Bank)",
          options: bankApiGateways.map((g) => ({
            value: g.name.toUpperCase(),
            label: gatewayOptionLabel(g.name, g.configured),
          })),
        }
      : null,
  ].filter(Boolean);

  const gatewayOptions = gateways.length
    ? gateways.map((g) => ({
        value: g.name.toUpperCase(),
        label: gatewayOptionLabel(g.name, g.configured),
      }))
    : [{ value: "RAZORPAY", label: "Razorpay (mock)" }];

  return (
    <div className={`${APP_PAGE_STACK} max-w-5xl`}>
      {pendingInvest && (
        <Alert type="info">
          Depositing for <b>{pendingInvest.planName}</b> ({inr(pendingInvest.amount)} investment).
          {walletAvailable != null && Number(walletAvailable) < Number(pendingInvest.amount) && (
            <> Add at least <b>{inr(Math.max(0, Number(pendingInvest.amount) - Number(walletAvailable)))}</b>.</>
          )}
        </Alert>
      )}
      <StepBanner
        tone="emerald"
        title="Add funds to your wallet"
        description="Pay via UPI, bank transfer (IMPS/NEFT/RTGS), or payment gateway. Upload proof for manual transfers — admin approves within 24 hours."
      />

      {bankVa && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 sm:p-5">
          <p className="text-sm font-bold text-sky-900 dark:text-sky-200">Bank virtual account — transfer here</p>
          <p className="mt-1 text-xs text-muted-foreground">Send the exact deposit amount via NEFT/IMPS/RTGS to this account. Admin credits your wallet after confirmation.</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Bank</span><p className="font-semibold">{bankVa.bank}</p></div>
            <div><span className="text-muted-foreground">Beneficiary</span><p className="font-semibold">{bankVa.beneficiary}</p></div>
            <div><span className="text-muted-foreground">Account number</span><p className="font-mono font-semibold">{bankVa.accountNumber}</p></div>
            <div><span className="text-muted-foreground">IFSC</span><p className="font-mono font-semibold">{bankVa.ifsc}</p></div>
            <div className="sm:col-span-2"><span className="text-muted-foreground">Payment reference</span><p className="font-mono font-semibold">{bankVa.reference}</p></div>
          </div>
        </div>
      )}

      <div className="invest-dashboard-split gap-4 lg:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="card min-w-0 space-y-4 p-4 sm:p-5">
            <StepBanner
              tone="sky"
              title="Step 1 — Choose deposit method"
              description="Select how you want to pay, then transfer to the company account shown."
            />

            <MethodCategorySelect
              label="Deposit method"
              tone="step"
              value={method}
              onChange={setMethod}
              options={DEPOSIT_METHODS}
            />

            {method === "bank" && (
              <MethodSelect
                tone="bank"
                label="Transfer type"
                value={bankMethod}
                onChange={setBankMethod}
                options={BANK_TRANSFER_TYPES}
              />
            )}

            {method === "gateway" && (
              <MethodSelect
                tone="gateway"
                label="Select payment gateway"
                value={gateway}
                onChange={setGateway}
                options={gatewayOptionGroups.length ? undefined : gatewayOptions}
                optionGroups={gatewayOptionGroups.length ? gatewayOptionGroups : undefined}
                placeholder="Choose gateway"
              />
            )}
            {method === "gateway" && gateway && (
              <p className="text-xs text-muted-foreground">
                Default gateway pre-selected by admin — change above if you prefer another.
              </p>
            )}

            {method === "upi" && upi?.vpa && (
              <div className="space-y-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-4">
                <FinanceFieldLabel tone="upi">Company UPI account</FinanceFieldLabel>
                {depositAccounts.upi.length > 0 && (
                  <MethodSelect
                    tone="upi"
                    label="Select UPI account to pay"
                    value={selectedUpiId || depositAccounts.upi[0]?.id}
                    onChange={setSelectedUpiId}
                    options={depositAccounts.upi.map((u) => ({ value: u.id, label: `${u.name} (${u.upiId})` }))}
                  />
                )}
                <CredentialRow label="UPI ID" value={upi.vpa} />
                {upi.payeeName && <CredentialRow label="Payee name" value={upi.payeeName} mono={false} />}
                <UpiQrDisplay vpa={upi.vpa} payeeName={upi.payeeName} amount={amount} storedQrUrl={upi.qrCodeUrl} className="py-2" />
                {upiPayLink && (
                  <a
                    href={upiPayLink}
                    className="btn-gold flex w-full items-center justify-center py-2.5 text-sm"
                  >
                    Open GPay / PhonePe / Paytm / BHIM
                  </a>
                )}
                <p className="text-[11px] text-sky-700 dark:text-sky-400/90">
                  After paying, enter amount & UTR in Step 2 and upload your payment screenshot.
                </p>
              </div>
            )}

            {method === "bank" && selectedBank && (
              <div className="space-y-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
                <FinanceFieldLabel tone="bank">Company bank account</FinanceFieldLabel>
                {depositAccounts.bank.length > 0 && (
                  <MethodSelect
                    tone="bank"
                    label="Select bank account to transfer to"
                    value={selectedBankId || depositAccounts.bank[0]?.id}
                    onChange={setSelectedBankId}
                    options={depositAccounts.bank.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.bankName} · ${b.accountNumber?.slice(-4) ? `****${b.accountNumber.slice(-4)}` : b.accountNumber})`,
                    }))}
                  />
                )}
                <CredentialRow label="Account holder" value={selectedBank.accountHolder} mono={false} />
                <CredentialRow label="Bank" value={selectedBank.bankName} mono={false} />
                <CredentialRow label="Account No." value={selectedBank.accountNumber} />
                <CredentialRow label="IFSC" value={selectedBank.ifsc} />
                {selectedBank.branchName && <CredentialRow label="Branch" value={selectedBank.branchName} mono={false} />}
                <p className="text-[11px] text-blue-700 dark:text-blue-400/90">
                  Transfer via {bankMethod} to the account above. Include your registered name in the reference, then upload proof in Step 2.
                </p>
              </div>
            )}

            {method === "bank" && !selectedBank && (
              <Alert type="info">No company bank accounts are enabled. Contact support or try UPI / payment gateway.</Alert>
            )}

            {method === "gateway" && (
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-violet-800 dark:text-violet-300">Online checkout</p>
                <p className="mt-1 text-xs">
                  Pay with cards or net banking via {gateway || "the selected gateway"}. No manual proof needed when payment succeeds.
                </p>
              </div>
            )}

            {needsProof ? (
              <form onSubmit={submit} className="space-y-4 border-t border-border pt-4">
                <StepBanner
                  tone="emerald"
                  title="Step 2 — Amount & proof"
                  description="Enter the amount you paid, UTR/reference, and upload payment proof for admin verification."
                />

                {msg && <Alert type="success">{msg}</Alert>}
                {err && <Alert type="error">{err}</Alert>}

                <Field label="Amount (₹)">
                  <input className="input" type="number" min={1000} step={100} value={amount} onChange={(e) => { setAmount(e.target.value); setPromoBonus(null); }} required />
                </Field>

                <Field label="Promo code (optional)" hint="Bonus credited when deposit is approved">
                  <div className="flex gap-2">
                    <input className="input flex-1 font-mono uppercase" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="WELCOME5" />
                    <button type="button" className="btn-outline shrink-0 text-xs" onClick={validatePromo}>Apply</button>
                  </div>
                  {promoErr && <p className="mt-1 text-xs text-rose-500">{promoErr}</p>}
                  {promoBonus != null && <p className="mt-1 text-xs text-emerald-600">Bonus on approval: {inr(promoBonus)}</p>}
                </Field>

                <Field label="UTR / Reference" hint="UPI transaction ID or bank UTR number — required">
                  <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UTR1234567890" required />
                </Field>

                <Field label="Payment proof" hint="Screenshot or PDF — required for verification">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    required
                    className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </Field>

                <button type="submit" className="btn-gold w-full">Submit deposit for verification</button>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-4 border-t border-border pt-4">
                <StepBanner
                  tone="emerald"
                  title="Step 2 — Amount"
                  description="Enter amount and proceed with gateway checkout."
                />
                {msg && <Alert type="success">{msg}</Alert>}
                {err && <Alert type="error">{err}</Alert>}
                <Field label="Amount (₹)">
                  <input className="input" type="number" min={1000} step={100} value={amount} onChange={(e) => { setAmount(e.target.value); setPromoBonus(null); }} required />
                </Field>
                <Field label="Promo code (optional)">
                  <div className="flex gap-2">
                    <input className="input flex-1 font-mono uppercase" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
                    <button type="button" className="btn-outline shrink-0 text-xs" onClick={validatePromo}>Apply</button>
                  </div>
                  {promoErr && <p className="mt-1 text-xs text-rose-500">{promoErr}</p>}
                  {promoBonus != null && <p className="mt-1 text-xs text-emerald-600">Bonus: {inr(promoBonus)}</p>}
                </Field>
                <button type="submit" className="btn-gold w-full">Pay with {gateway || "gateway"}</button>
              </form>
            )}
          </div>

          <div className="card min-w-0 p-4 sm:p-5">
            <h4 className="text-heading mb-3 text-sm font-bold">Recent Deposits</h4>
            {deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deposits yet.</p>
            ) : (
              <div className={APP_TABLE_WRAP}>
                <table className="w-full min-w-[16rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2 pr-2">Amount</th>
                      <th className="pb-2 pr-2">Method</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.slice(0, 8).map((d) => (
                      <tr key={d.id} className="border-b border-border/60">
                        <td className="py-2 pr-2 font-medium">{inr(d.amount)}</td>
                        <td className="py-2 pr-2 text-muted-foreground">{d.method}</td>
                        <td className="py-2"><Badge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {method === "upi" && (
            <CompanyBankDetails bank={bank} showUpi compact />
          )}
          {method === "bank" && selectedBank && (
            <CompanyBankDetails account={selectedBank} transferType={bankMethod} />
          )}
          {method === "bank" && !selectedBank && (
            <CompanyBankDetails bank={bank} showUpi={false} />
          )}
          {method === "gateway" && (
            <div className="surface-panel p-5">
              <h3 className="text-heading mb-2 text-base font-bold">Gateway payment</h3>
              <p className="text-sm text-muted-foreground">
                Supported: Razorpay, Cashfree, PayU, Easebuzz & more. UPI, cards, net banking. Instant wallet credit when payment succeeds.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WithdrawPanel({ wallet, onRefresh }) {
  const { invest } = useAuth();
  const [mode, setMode] = useState("UPI");
  const [amount, setAmount] = useState(1000);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [confirmationToken, setConfirmationToken] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [step, setStep] = useState("form"); // form | otp
  const [confirmed, setConfirmed] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [msg, setMsg] = useState("");
  const [lastWithdrawAmount, setLastWithdrawAmount] = useState(null);
  const [err, setErr] = useState("");

  const load = () => investApi("/payouts").then((d) => setPayouts(d.payouts)).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setConfirmed(false);
  }, [mode]);

  const canPayout =
    mode === "UPI"
      ? Boolean(invest?.upiId)
      : Boolean(invest?.bankName && invest?.accountNumber && invest?.ifsc);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!canPayout) {
      setErr(`Please add your ${mode === "UPI" ? "UPI ID" : "bank account"} under Profile first.`);
      return;
    }
    if (!confirmed) {
      setErr("Please confirm your payout details before submitting.");
      return;
    }
    try {
      if (step === "form") {
        const destination = mode === "UPI" ? invest.upiId : invest.accountNumber;
        const r = await investApi("/payouts/initiate", {
          method: "POST",
          body: { amount: Number(amount), mode, password, totpCode, destination },
        });
        setConfirmationToken(r.confirmationToken);
        setStep("otp");
        setMsg(r.message || "Check your email for the OTP.");
        return;
      }
      const destination = mode === "UPI" ? invest.upiId : invest.accountNumber;
      await investApi("/payouts/confirm", {
        method: "POST",
        body: { confirmationToken, emailOtp, amount: Number(amount), mode, destination },
      });
      setLastWithdrawAmount(Number(amount));
      setMsg("Withdrawal requested. Admin will release funds to your saved account.");
      setStep("form");
      setConfirmed(false);
      setPassword("");
      setTotpCode("");
      setEmailOtp("");
      load();
      onRefresh?.();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div className={`${APP_PAGE_STACK} max-w-5xl`}>
      <StepBanner
        tone="amber"
        title="Withdraw to your personal account"
        description={`Available balance: ${inr(wallet?.available || 0)} — payouts go to your saved UPI or bank details after admin approval.`}
      />

      <div className="invest-dashboard-split gap-4 lg:gap-6">
        <div className="card min-w-0 space-y-4 p-4 sm:p-5">
          <StepBanner
            tone="sky"
            title="Step 1 — Choose withdrawal method"
            description="Withdraw to your saved UPI ID or bank account. Admin releases funds via RazorpayX, Cashfree, PayU, or Easebuzz after approval."
          />

          <MethodCategorySelect
            label="Withdrawal method"
            tone="step"
            value={mode}
            onChange={setMode}
            options={WITHDRAW_METHODS}
          />

          <PayoutDestinationCard mode={mode} investor={invest} />

          {canPayout && (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span className="text-muted-foreground">
                I confirm the payout details above are correct. Wrong details may delay or fail the transfer.
              </span>
            </label>
          )}

          <form onSubmit={submit} className="space-y-4 border-t border-border pt-4">
            <StepBanner
              tone="emerald"
              title="Step 2 — Withdrawal amount"
              description="Enter the amount to withdraw from your available wallet balance."
            />

            {msg && (
              <Alert type="success">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{msg}</span>
                  {lastWithdrawAmount != null && (
                    <ShareProfitButton type="withdrawal" amount={inr(lastWithdrawAmount)} label="Share" />
                  )}
                </div>
              </Alert>
            )}
            {err && <Alert type="error">{err}</Alert>}

            <Field label={`Amount (₹)`}>
              <input
                className="input"
                type="number"
                min={100}
                max={wallet?.available || undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={step === "otp"}
              />
            </Field>

            {step === "form" && (
              <>
                <Field label="Account password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
                <Field label="Authenticator code (if 2FA enabled)"><input className="input" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="6-digit code" /></Field>
              </>
            )}
            {step === "otp" && (
              <Field label="Email OTP"><input className="input" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} required placeholder="6-digit code from email" /></Field>
            )}

            <p className="text-xs text-muted-foreground">
              {mode === "UPI"
                ? "Funds will be sent to your registered UPI ID via UPI after admin approval."
                : "Funds will be sent to your registered bank account via NEFT/IMPS after admin approval."}
            </p>

            <button type="submit" className="btn-gold w-full" disabled={!canPayout}>
              {step === "otp" ? "Confirm with email OTP" : "Send verification email"}
            </button>
          </form>
        </div>

        <div className="card min-w-0 p-4 sm:p-5">
          <h4 className="text-heading mb-3 text-sm font-bold">Withdrawal History</h4>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex min-w-0 items-start justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium">{inr(p.amount)} · {p.mode}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.destination}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.status === "COMPLETED" && (
                      <ShareProfitButton type="withdrawal" amount={inr(p.amount)} label="Share" />
                    )}
                    <Badge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Re-export shared components for other imports
export { CredentialRow, CompanyBankDetails } from "./WalletFinancePanels.shared.jsx";
