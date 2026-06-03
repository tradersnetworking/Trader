import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Badge } from "../ui.jsx";
import KycFullViewModal from "./KycFullViewModal.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";

function PayoutChangeCard({ change, onDecide }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <div className="font-bold">{change.investor?.name}</div>
          <div className="text-xs text-muted-foreground">{change.investor?.email}</div>
        </div>
        <Badge status={change.status} />
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div><span className="text-muted-foreground">UPI:</span> {change.upiId || "—"}</div>
        <div><span className="text-muted-foreground">Bank:</span> {change.bankName || "—"}</div>
        <div><span className="text-muted-foreground">Account:</span> {change.bankAccount || "—"}</div>
        <div><span className="text-muted-foreground">IFSC:</span> {change.ifscCode || "—"}</div>
      </div>
      <KycDocumentsList
        kyc={{
          cancelledCheque: change.cancelledCheque,
          passbookDocument: change.passbookDocument,
          bankStatementDocument: change.bankStatementDocument,
        }}
        fields={[
          { key: "cancelledCheque", label: "Cancelled Cheque" },
          { key: "passbookDocument", label: "Passbook" },
          { key: "bankStatementDocument", label: "Statement" },
        ]}
        scope="invest"
      />
      {change.status === "PENDING" && (
        <div className="flex gap-2">
          <button type="button" className="btn-gold text-xs" onClick={() => onDecide(change.id, "APPROVED")}>Approve</button>
          <button type="button" className="btn-outline text-xs text-rose-600" onClick={() => onDecide(change.id, "REJECTED")}>Reject</button>
        </div>
      )}
      {change.remarks && <p className="text-xs text-muted-foreground">Remarks: {change.remarks}</p>}
    </div>
  );
}

export default function AdminProfileApprovalsPanel() {
  const [subTab, setSubTab] = useState("payout");
  const [payoutChanges, setPayoutChanges] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [viewRevision, setViewRevision] = useState(null);

  const load = () => {
    investApi("/admin/payout-changes?status=PENDING").then((d) => setPayoutChanges(d.changes || [])).catch(() => {});
    investApi("/admin/kyc-revisions?status=PENDING").then((d) => setRevisions(d.revisions || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const decidePayout = async (id, status) => {
    let remarks = "";
    if (status === "REJECTED") {
      remarks = window.prompt("Rejection reason for investor:") || "";
      if (!remarks.trim()) return;
    }
    await investApi(`/admin/payout-changes/${id}/decision`, { method: "POST", body: { status, remarks } });
    load();
  };

  const decideRevision = async (id, status) => {
    let remarks = "";
    if (status === "REJECTED") {
      remarks = window.prompt("Rejection reason:") || "";
      if (!remarks.trim()) return;
    }
    await investApi(`/admin/kyc-revisions/${id}/decision`, { method: "POST", body: { status, remarks } });
    setViewRevision(null);
    load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review pending bank/UPI and KYC document updates before they replace approved investor records used for payouts.
      </p>
      <div className="flex gap-2">
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${subTab === "payout" ? "bg-primary/15 text-accent-tone" : "bg-muted"}`} onClick={() => setSubTab("payout")}>
          Bank / UPI ({payoutChanges.length})
        </button>
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${subTab === "kyc" ? "bg-primary/15 text-accent-tone" : "bg-muted"}`} onClick={() => setSubTab("kyc")}>
          KYC updates ({revisions.length})
        </button>
      </div>

      {subTab === "payout" && (
        payoutChanges.length ? payoutChanges.map((c) => (
          <PayoutChangeCard key={c.id} change={c} onDecide={decidePayout} />
        )) : <p className="text-center text-muted-foreground">No pending payout changes.</p>
      )}

      {subTab === "kyc" && (
        <>
          {revisions.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-bold">{r.fullName || r.investor?.name}</div>
                  <div className="text-xs text-muted-foreground">{r.investor?.email}</div>
                </div>
                <Badge status={r.status} />
              </div>
              <button type="button" className="btn-outline mt-3 text-xs" onClick={() => setViewRevision(r)}>Review update</button>
            </div>
          ))}
          {!revisions.length && <p className="text-center text-muted-foreground">No pending KYC revisions.</p>}
        </>
      )}

      {viewRevision && (
        <KycFullViewModal
          open
          kyc={{ ...viewRevision, investor: viewRevision.investor, status: "PENDING" }}
          onClose={() => setViewRevision(null)}
          onApprove={() => decideRevision(viewRevision.id, "APPROVED")}
          onReject={() => decideRevision(viewRevision.id, "REJECTED")}
        />
      )}
    </div>
  );
}
