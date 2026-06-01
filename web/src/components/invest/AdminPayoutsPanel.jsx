import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Badge, Modal, Field, Alert } from "../ui.jsx";
import PayoutReleaseModal from "./PayoutReleaseModal.jsx";

export default function AdminPayoutsPanel({ onUpdated }) {
  const [sp] = useSearchParams();
  const [payouts, setPayouts] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [showDirect, setShowDirect] = useState(false);
  const [directForm, setDirectForm] = useState({ investorId: "", amount: "", mode: "UPI", remarks: "" });
  const [directErr, setDirectErr] = useState("");

  const load = () =>
    investApi("/admin/payouts")
      .then((d) => {
        setPayouts(d.payouts);
        setGateways(d.gateways || []);
        onUpdated?.(d.payouts);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    investApi("/admin/investors")
      .then((d) => setInvestors((d.investors || []).filter((i) => i.role === "INVESTOR")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const releaseId = sp.get("release");
    if (!releaseId || !payouts.length) return;
    const target = payouts.find((p) => p.id === releaseId && p.status === "PENDING");
    if (target) setReleaseTarget(target);
  }, [sp, payouts]);

  const release = async (id, gateway) => {
    setBusy(true);
    try {
      await investApi(`/admin/payouts/${id}/release`, { method: "POST", body: { gateway } });
      load();
    } finally {
      setBusy(false);
    }
  };
  const reject = async (id) => {
    await investApi(`/admin/payouts/${id}/reject`, { method: "POST", body: {} });
    load();
  };

  const createDirect = async (e) => {
    e.preventDefault();
    setDirectErr("");
    setBusy(true);
    try {
      const d = await investApi("/admin/payouts/direct", {
        method: "POST",
        body: { ...directForm, amount: Number(directForm.amount) },
      });
      setDirectForm({ investorId: "", amount: "", mode: "UPI", remarks: "" });
      setShowDirect(false);
      await load();
      setReleaseTarget(d.payout);
    } catch (err) {
      setDirectErr(err.message || "Failed to create payout");
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = payouts.filter((p) => p.status === "PENDING").length;

  return (
    <div className="page-stack">
      <PayoutReleaseModal
        open={Boolean(releaseTarget)}
        payout={releaseTarget}
        gateways={gateways}
        busy={busy}
        onClose={() => setReleaseTarget(null)}
        onRelease={release}
      />
      <div className="card border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-heading">Release withdrawals to investors</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong>SCHEDULED</strong> payouts had a prior notice sent — click <em>Mark payout done</em> to update ledger & wallet.
              Pending withdrawals can be released via gateway.
              {pendingCount > 0 && (
                <span className="mt-1 block font-semibold text-amber-700 dark:text-amber-300">
                  {pendingCount} pending withdrawal{pendingCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => setShowDirect(true)} className="btn-outline shrink-0 px-3 py-2 text-xs">
            + Direct payout
          </button>
        </div>
      </div>
      <Modal open={showDirect} onClose={() => setShowDirect(false)} title="Create direct withdrawal">
        <form onSubmit={createDirect} className="space-y-3">
          {directErr && <Alert type="error">{directErr}</Alert>}
          <Field label="Investor">
            <select className="input" required value={directForm.investorId} onChange={(e) => setDirectForm({ ...directForm, investorId: e.target.value })}>
              <option value="">Select investor…</option>
              {investors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.email}) — {inr(i.wallet?.available || 0)} avail
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₹)">
            <input className="input" type="number" required min="1" value={directForm.amount} onChange={(e) => setDirectForm({ ...directForm, amount: e.target.value })} />
          </Field>
          <Field label="Payout mode">
            <select className="input" value={directForm.mode} onChange={(e) => setDirectForm({ ...directForm, mode: e.target.value })}>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank account</option>
            </select>
          </Field>
          <Field label="Note (optional)">
            <input className="input" value={directForm.remarks} onChange={(e) => setDirectForm({ ...directForm, remarks: e.target.value })} placeholder="Reason for direct payout" />
          </Field>
          <p className="text-xs text-muted-foreground">After creating, you will choose a gateway to release the payout.</p>
          <button type="submit" disabled={busy} className="btn-gold w-full disabled:opacity-50">
            {busy ? "Creating…" : "Create & choose gateway"}
          </button>
        </form>
      </Modal>
      <div className="app-table-wrap card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Investor</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Mode</th>
              <th className="p-3">UPI / Bank destination</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  {p.investor?.name}
                  <div className="text-xs text-muted-foreground">{p.investor?.email}</div>
                  {p.mode === "UPI" && p.investor?.upiId && (
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">Profile UPI: {p.investor.upiId}</div>
                  )}
                  {p.mode === "BANK" && p.investor?.accountNumber && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {p.investor.bankName} · {p.investor.accountNumber} · {p.investor.ifsc}
                    </div>
                  )}
                </td>
                <td className="p-3 font-bold text-heading">{inr(p.amount)}</td>
                <td className="p-3"><Badge status={p.mode} /></td>
                <td className="p-3 font-mono text-xs">{p.destination}</td>
                <td className="p-3">
                  <Badge status={p.status} />
                  {p.payoutKind && p.payoutKind !== "WITHDRAWAL" && <div className="text-[10px] text-muted-foreground">{p.payoutKind}</div>}
                  {p.noticeSentAt && <div className="text-[10px] text-emerald-600">Notice sent {new Date(p.noticeSentAt).toLocaleDateString()}</div>}
                  {p.gatewayRef && <div className="text-[10px] text-muted-foreground">{p.gateway}: {p.gatewayRef}</div>}
                </td>
                <td className="p-3 text-right">
                  {p.status === "SCHEDULED" && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <button type="button" onClick={async () => { await investApi(`/admin/payouts/${p.id}/mark-done`, { method: "POST" }); load(); }} className="btn-gold px-3 py-1.5 text-xs">
                        Mark payout done
                      </button>
                      <button type="button" onClick={async () => { await investApi(`/admin/payouts/${p.id}/cancel-scheduled`, { method: "POST" }); load(); }} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10">
                        Cancel
                      </button>
                    </div>
                  )}
                  {p.status === "PENDING" && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <button type="button" onClick={() => setReleaseTarget(p)} className="btn-gold px-3 py-1.5 text-xs">
                        Approve & Pay Out
                      </button>
                      <button type="button" onClick={() => reject(p.id)} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-muted-foreground">No payout requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
