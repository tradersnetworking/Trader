import { Modal, Badge } from "../ui.jsx";
import { inr, dateStr } from "../../lib/format.js";
import SecureUploadLink from "../invest/SecureUploadLink.jsx";

function accountLabel(acct) {
  if (!acct) return "—";
  if (acct.type === "upi") return `${acct.name} (${acct.upiId})`;
  return `${acct.name} — ${acct.bankName} · ${acct.accountNumber}`;
}

/** Admin popup to review deposit proof before approve/reject. */
export default function DepositProofViewer({ open, deposit, onClose, onApprove, onReject, busy, scope = "invest" }) {
  if (!deposit) return null;
  const proof = deposit.proofImage;

  return (
    <Modal open={open} onClose={onClose} title={`Deposit review — ${deposit.investor?.name || "Investor"}`} wide>
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Amount (INR credit)</span><p className="font-bold text-heading">{inr(deposit.inrEquivalent || deposit.amount)}</p></div>
          <div><span className="text-muted-foreground">Method</span><p className="font-medium">{deposit.method}</p></div>
          {deposit.cryptoAmount != null && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Crypto sent</span>
              <p className="font-medium">
                {deposit.cryptoAmount} {deposit.cryptoSymbol} ({deposit.cryptoNetwork})
              </p>
            </div>
          )}
          <div><span className="text-muted-foreground">{deposit.method === "CRYPTO" ? "TX hash" : "UTR / Reference"}</span><p className="font-mono text-xs">{deposit.txHash || deposit.reference || "—"}</p></div>
          <div><span className="text-muted-foreground">Submitted</span><p>{dateStr(deposit.createdAt, true)}</p></div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Paid to account</span><p className="font-medium">{accountLabel(deposit.paymentAccount)}</p></div>
          <div><span className="text-muted-foreground">Investor</span><p>{deposit.investor?.email}</p></div>
          <div><span className="text-muted-foreground">Status</span><p><Badge status={deposit.status} /></p></div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment proof</p>
          {!proof && <p className="text-sm text-rose-500">No proof uploaded.</p>}
          {proof && (
            <SecureUploadLink url={proof} previewTitle="Deposit payment proof" scope={scope} className="btn-gold text-sm">
              View payment proof
            </SecureUploadLink>
          )}
        </div>

        {deposit.status === "PENDING" && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button type="button" className="btn-outline text-sm" onClick={onClose}>Close</button>
            <button type="button" disabled={busy} className="rounded-lg px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10" onClick={() => onReject?.(deposit.id)}>
              Reject
            </button>
            <button type="button" disabled={busy || !proof} className="btn-gold text-sm disabled:opacity-50" onClick={() => onApprove?.(deposit.id)}>
              {busy ? "Processing…" : "Approve & credit wallet"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
