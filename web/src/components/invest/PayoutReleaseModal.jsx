import { useState } from "react";
import { Modal, Badge, Alert } from "../ui.jsx";
import { inr } from "../../lib/format.js";

const GATEWAY_STYLES = {
  RAZORPAYX: "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20",
  CASHFREE: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
  PAYU: "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20",
  EASEBUZZ: "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20",
  HDFC: "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20",
  AXIS: "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20",
  ICICI: "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20",
  YESBANK: "border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20",
};

/** Admin picks a payout gateway (payment or bank API) before releasing a withdrawal. */
export default function PayoutReleaseModal({ open, payout, gateways, onClose, onRelease, busy }) {
  const [selected, setSelected] = useState("");
  const [err, setErr] = useState("");

  if (!open || !payout) return null;

  const paymentGateways = (gateways || []).filter((g) => g.category === "payment" || !g.category);
  const bankGateways = (gateways || []).filter((g) => g.category === "bank");

  const handleRelease = async () => {
    if (!selected) {
      setErr("Select a payout channel to release this withdrawal.");
      return;
    }
    setErr("");
    try {
      await onRelease(payout.id, selected);
      setSelected("");
      onClose();
    } catch (e) {
      setErr(e.message || "Release failed");
    }
  };

  const handleClose = () => {
    setSelected("");
    setErr("");
    onClose();
  };

  const GatewayOption = ({ g }) => (
    <button
      type="button"
      onClick={() => setSelected(g.name)}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        selected === g.name ? "ring-2 ring-amber-500" : ""
      } ${GATEWAY_STYLES[g.name] || "border-border bg-muted/30 hover:bg-muted/50"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{g.label || g.name}</span>
        <Badge status={g.configured ? "ACTIVE" : "PENDING"} />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {g.configured ? "Live API credentials configured" : "Mock mode — no API keys yet"}
      </p>
    </button>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Approve & release withdrawal" wide>
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Withdrawal request</p>
          <p className="mt-1 text-lg font-bold text-heading">{inr(payout.amount)}</p>
          <p className="text-sm text-foreground">{payout.investor?.name}</p>
          <p className="text-xs text-muted-foreground">{payout.investor?.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge status={payout.mode} />
            <span className="font-mono text-xs text-muted-foreground">{payout.destination}</span>
          </div>
          {payout.mode === "BANK" && payout.investor?.bankName && (
            <p className="mt-1 text-xs text-muted-foreground">
              {payout.investor.bankName} · {payout.investor.accountNumber} · {payout.investor.ifsc}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Choose how to send this payout. Funds will be transferred to the investor&apos;s saved {payout.mode === "UPI" ? "UPI ID" : "bank account"}.
        </p>

        {err && <Alert type="error">{err}</Alert>}

        {paymentGateways.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment gateways</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {paymentGateways.map((g) => (
                <GatewayOption key={g.name} g={g} />
              ))}
            </div>
          </section>
        )}

        {bankGateways.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Bank APIs (HDFC · Axis · ICICI · Yes Bank)</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {bankGateways.map((g) => (
                <GatewayOption key={g.name} g={g} />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button type="button" onClick={handleClose} className="btn-outline px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !selected}
            onClick={handleRelease}
            className="btn-gold px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? "Processing…" : "Release payout"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
