import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Modal, Field, Alert } from "../ui.jsx";
import { investPath } from "../../lib/site.js";
import { lockInCategoryLabel } from "../../lib/plan-types.js";
import { planCalcPreview, parseSettlementCycles } from "../../lib/plan-calc.js";

const STEPS = [
  { id: "plan", label: "Plan" },
  { id: "amount", label: "Amount" },
  { id: "compound", label: "Compounding" },
  { id: "summary", label: "Summary" },
  { id: "agreement", label: "Agreement" },
  { id: "pay", label: "Payment" },
];

function validateAmount(amount, plan) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return "Enter a valid investment amount.";
  if (amt < plan.minInvestment) return `Minimum investment is ${inr(plan.minInvestment)}.`;
  if (amt > plan.maxInvestment) return `Maximum investment is ${inr(plan.maxInvestment)}.`;
  return "";
}

function StepDots({ step }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1">
      {STEPS.map((s, i) => (
        <div
          key={s.id}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            i === step ? "bg-gold text-black" : i < step ? "bg-emerald-500/20 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, accent }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-semibold ${accent || ""}`}>{value}</span>
    </div>
  );
}

export default function InvestSubscribeWizard({
  plan,
  onClose,
  onDone,
  onNeedDeposit,
  initialAmount,
  initialStep = 0,
  initialCycle,
}) {
  const [step, setStep] = useState(initialStep);
  const [amount, setAmount] = useState(String(initialAmount ?? plan.minInvestment));
  const cycle = useMemo(
    () => parseSettlementCycles(plan.settlementCycles)[0] || "MONTHLY",
    [plan.settlementCycles]
  );
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [calc, setCalc] = useState(null);
  const [amountErr, setAmountErr] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAgreement, setPendingAgreement] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [needFunds, setNeedFunds] = useState(false);

  const annualPct = plan.annualRoiPct ?? Number(plan.monthlyRoiPct) * 12;

  const refreshWallet = () => investApi("/wallet").then((d) => setWallet(d.wallet)).catch(() => {});

  useEffect(() => {
    refreshWallet();
  }, []);

  const goDepositForFunds = (amt = Number(amount)) => {
    const payload = {
      planId: plan.id,
      planName: plan.name,
      amount: amt,
      settlementCycle: cycle,
      step,
    };
    if (onNeedDeposit) {
      onNeedDeposit(payload);
      onClose();
      return;
    }
    setNeedFunds(true);
  };

  useEffect(() => {
    const validation = validateAmount(amount, plan);
    setAmountErr(validation);
    if (validation) {
      setCalc(null);
      return;
    }
    const local = planCalcPreview(Number(amount), plan, cycle);
    setCalc(local);
    investApi(`/public/plans/${plan.id}/calc?amount=${Number(amount)}&settlementCycle=${cycle}`)
      .then(setCalc)
      .catch(() => setCalc(local));
  }, [amount, plan, cycle]);

  const subscribe = async () => {
    const validation = validateAmount(amount, plan);
    if (validation) {
      setAmountErr(validation);
      return;
    }
    if (!acceptTerms || !acceptRisk) {
      setErr("Please accept the terms and risk disclosure.");
      return;
    }
    setErr("");
    try {
      const elig = await investApi("/kyc");
      if (elig.eligibility && !elig.eligibility.canInvest) {
        setErr(elig.eligibility.message || "Complete KYC and bank details before investing.");
        return;
      }
    } catch {
      /* server will reject if not eligible */
    }
    const amt = Number(amount);
    if (wallet && wallet.available < amt) {
      goDepositForFunds(amt);
      return;
    }
    setLoading(true);
    try {
      const data = await investApi("/subscribe", {
        method: "POST",
        body: { planId: plan.id, amount: amt, settlementCycle: cycle },
      });
      if (data.agreementError) {
        setErr(`Investment created but agreement failed: ${data.agreementError}. Open Agreements tab or contact support.`);
      }
      if (data.agreement) setPendingAgreement(data.agreement);
      else if (!data.agreementError) onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  if (needFunds) {
    const shortfall = Number(amount) - (wallet?.available || 0);
    return (
      <Modal open onClose={() => setNeedFunds(false)} title="Insufficient Wallet Balance">
        <Alert type="info">You need {inr(Number(amount))} but only have {inr(wallet?.available || 0)} available.</Alert>
        <p className="mt-3 text-sm text-muted-foreground">Add at least {inr(Math.max(shortfall, 0))} — we will bring you back to this plan after deposit.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={() => setNeedFunds(false)}>Adjust Amount</button>
          <button type="button" className="btn-gold flex-1" onClick={() => goDepositForFunds(Number(amount))}>Add Funds & Continue</button>
        </div>
      </Modal>
    );
  }

  if (pendingAgreement) {
    return (
      <Modal open onClose={() => { setPendingAgreement(null); onDone(pendingAgreement); }} title="Investment Agreement Created">
        <Alert type="success">Investment successful! Your agreement is ready for e-signature.</Alert>
        <p className="mt-3 text-sm"><b>{pendingAgreement.title}</b></p>
        <p className="text-xs text-muted-foreground">Ref: {pendingAgreement.agreementUid || pendingAgreement.id}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-outline flex-1" onClick={() => { setPendingAgreement(null); onDone(pendingAgreement); }}>Sign Later</button>
          <button type="button" className="btn-gold flex-1" onClick={() => { const ag = pendingAgreement; setPendingAgreement(null); onDone(ag, true); }}>Sign Now</button>
          <button type="button" className="btn-outline flex-1" onClick={() => { setPendingAgreement(null); onDone(pendingAgreement, false, true); }}>Invest in Another Plan</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={`Invest • ${plan.name}`} wide>
      <StepDots step={step} />

      {step === 0 && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` }}>
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">{plan.planType} Plan</div>
            <h2 className="mt-1 text-2xl font-extrabold">{plan.name}</h2>
            <p className="mt-2 text-sm opacity-90">{plan.description}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryRow label="Lock-in period" value={lockInCategoryLabel(plan.lockInDays)} />
            <SummaryRow label="Monthly ROI" value={`${plan.monthlyRoiPct}%`} accent="text-emerald-600" />
            <SummaryRow label="Annual ROI (linear)" value={`${annualPct}%`} />
            <SummaryRow label="Investment range" value={`${inr(plan.minInvestment)} – ${inr(plan.maxInvestment)}`} />
            <SummaryRow label="Settlement" value={calc?.settlementLabel || cycle} />
            <SummaryRow label="Compounding" value="At maturity only" />
          </div>
          <button type="button" className="btn-gold w-full" onClick={next}>Continue</button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label={`Investment amount (${inr(plan.minInvestment)} – ${inr(plan.maxInvestment)})`}>
            <input
              className="input text-lg font-semibold"
              type="number"
              min={plan.minInvestment}
              max={plan.maxInvestment}
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          {amountErr && <Alert type="error">{amountErr}</Alert>}
          {wallet && !amountErr && Number(amount) > wallet.available && (
            <Alert type="info">
              Wallet balance {inr(wallet.available)} is less than {inr(Number(amount))}.{" "}
              <button type="button" className="font-semibold text-gold-600 underline" onClick={() => goDepositForFunds(Number(amount))}>
                Add funds first
              </button>
            </Alert>
          )}
          {calc && !amountErr && (
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <SummaryRow label="Monthly return" value={inr(calc.monthlyReturn)} accent="text-emerald-600" />
              <SummaryRow label="Annual ROI amount" value={inr(calc.monthlyReturn * 12)} />
              <SummaryRow label="Lock-in profit" value={inr(calc.totalSimpleProfit)} />
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={back}>Back</button>
            <button type="button" className="btn-gold flex-1" disabled={Boolean(amountErr)} onClick={next}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Alert type="info">
            Compounding is available <b>only after your lock-in period completes</b>. There is no monthly compounding during lock-in.
          </Alert>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-semibold">After maturity you may:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Withdraw capital + accumulated ROI to wallet</li>
              <li>Reinvest with compounding on a new subscription</li>
              <li>Choose reinvest at maturity (Maturity Choice prompt)</li>
            </ul>
          </div>
          {calc && (
            <SummaryRow label="Compounded maturity projection*" value={inr(calc.compounded?.maturityValue || 0)} accent="text-gold-600" />
          )}
          <p className="text-xs text-muted-foreground">*If you reinvest after lock-in with compounding enabled.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={back}>Back</button>
            <button type="button" className="btn-gold flex-1" onClick={next}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && calc && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4">
            <SummaryRow label="Plan" value={plan.name} />
            <SummaryRow label="Investment amount" value={inr(calc.amount)} />
            <SummaryRow label="Lock-in" value={`${calc.lockInMonths} months (${calc.lockInDays} days)`} />
            <SummaryRow label="Monthly ROI %" value={`${calc.monthlyRoiPct}%`} />
            <SummaryRow label="Annual ROI %" value={`${calc.annualRoiPct}%`} />
            <SummaryRow label="Settlement" value={calc.settlementLabel} />
            <SummaryRow label="Per-cycle payout" value={inr(calc.settlementPayout)} accent="text-emerald-600" />
            <SummaryRow label="Maturity date" value={dateStr(calc.maturityDate)} />
            <SummaryRow label="Total ROI till maturity" value={inr(calc.totalRoiTillMaturity)} accent="text-emerald-600" />
            <SummaryRow label="Capital returned" value={inr(calc.capitalReturned)} />
            <SummaryRow label="Total estimated return" value={inr(calc.expectedTotalReturn)} accent="font-bold text-foreground" />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={back}>Back</button>
            <button type="button" className="btn-gold flex-1" onClick={next}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1" />
            <span>I accept the <Link to={investPath("/terms")} className="text-gold-600 underline" target="_blank">Terms of Service</Link> and <Link to={investPath("/privacy")} className="text-gold-600 underline" target="_blank">Privacy Policy</Link>.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={acceptRisk} onChange={(e) => setAcceptRisk(e.target.checked)} className="mt-1" />
            <span>I have read the <Link to={investPath("/risk-disclosure")} className="text-gold-600 underline" target="_blank">Risk Disclosure</Link> and understand investment risks. All amounts are in INR.</span>
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={back}>Back</button>
            <button type="button" className="btn-gold flex-1" disabled={!acceptTerms || !acceptRisk} onClick={next}>Proceed to Payment</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          {err && <Alert type="error">{err}</Alert>}
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            <SummaryRow label="Debit from wallet" value={inr(Number(amount))} accent="font-bold" />
            <SummaryRow label="Wallet available" value={inr(wallet?.available || 0)} />
            <SummaryRow label="After investment" value={inr(Math.max(0, (wallet?.available || 0) - Number(amount)))} />
          </div>
          {wallet && wallet.available < Number(amount) && (
            <Alert type="info">
              Insufficient balance. Deposit at least {inr(Number(amount) - wallet.available)} to complete this investment.
            </Alert>
          )}
          <p className="text-center text-xs text-muted-foreground">KYC must be approved. Funds are debited instantly from your wallet balance. You can subscribe to multiple plans.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={back}>Back</button>
            {wallet && wallet.available < Number(amount) ? (
              <button type="button" className="btn-gold flex-1" onClick={() => goDepositForFunds(Number(amount))}>
                Add Funds & Continue
              </button>
            ) : (
              <button type="button" className="btn-gold flex-1" disabled={loading || Boolean(amountErr)} onClick={subscribe}>
                {loading ? "Processing…" : "Confirm & Invest from Wallet"}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
