import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Modal, Alert } from "../ui.jsx";

export default function MaturityChoiceModal({ subscriptions, onDone }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("WALLET");
  const [current, setCurrent] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (subscriptions?.length) setOpen(true);
  }, [subscriptions]);

  if (!subscriptions?.length) return null;
  const sub = subscriptions[current];

  const submit = async () => {
    setErr("");
    try {
      await investApi(`/maturity/${sub.id}/choice`, { method: "POST", body: { choice } });
      setMsg("Choice saved.");
      if (current + 1 < subscriptions.length) {
        setCurrent((c) => c + 1);
        setChoice("WALLET");
        setMsg("");
      } else {
        setOpen(false);
        onDone?.();
      }
    } catch (e) { setErr(e.message); }
  };

  return (
    <Modal open={open} onClose={() => { setOpen(false); onDone?.(); }} title="Maturity Payout — Choose Option" wide>
      <Alert type="info">Your investment matures soon. Choose how to receive your profit (like KuberQuant).</Alert>
      {err && <div className="mt-2"><Alert type="error">{err}</Alert></div>}
      {msg && <div className="mt-2"><Alert type="success">{msg}</Alert></div>}
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="font-bold text-navy dark:text-white">{sub.plan?.name}</div>
        <div className="text-sm text-slate-500">Invested {inr(sub.amount)} • Matures {dateStr(sub.maturityDate)}</div>
      </div>
      <div className="mt-4 space-y-2">
        {[
          ["WALLET", "Keep in Wallet", "Credit profit to your invest wallet balance"],
          ["WITHDRAW", "Withdraw to Account", "Transfer profit to your UPI/bank after admin approval"],
          ["REINVEST", "Reinvest", "Add profit to wallet for new plan subscriptions"],
        ].map(([v, t, d]) => (
          <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${choice === v ? "border-gold bg-gold/10" : "border-slate-200 dark:border-slate-700"}`}>
            <input type="radio" name="choice" value={v} checked={choice === v} onChange={() => setChoice(v)} />
            <div><div className="font-semibold text-navy dark:text-white">{t}</div><div className="text-xs text-slate-500">{d}</div></div>
          </label>
        ))}
      </div>
      <button onClick={submit} className="btn-gold mt-4 w-full">Confirm Choice</button>
      {subscriptions.length > 1 && <p className="mt-2 text-center text-xs text-slate-400">{current + 1} of {subscriptions.length}</p>}
    </Modal>
  );
}
