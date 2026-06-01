import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Badge } from "../ui.jsx";
import KycDocumentViewer from "../shared/KycDocumentViewer.jsx";

export default function AdminKycPanel({ onUpdated }) {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("");
  const [viewDocs, setViewDocs] = useState(null);

  const load = () =>
    investApi(`/admin/kyc${filter ? `?status=${filter}` : ""}`)
      .then((d) => {
        setItems(d.kyc);
        onUpdated?.(d.kyc);
      })
      .catch(() => {});

  useEffect(() => { load(); }, [filter]);

  const counts = {
    pending: items.filter((k) => k.status === "PENDING").length,
    approved: items.filter((k) => k.status === "APPROVED").length,
    rejected: items.filter((k) => k.status === "REJECTED").length,
  };

  const decide = async (id, status) => {
    let remarks;
    if (status === "REJECTED") {
      remarks = window.prompt("Rejection reason (shown to investor):") || "";
      if (!remarks.trim()) return;
    }
    await investApi(`/admin/kyc/${id}/decision`, { method: "POST", body: { status, remarks } });
    load();
  };

  const hasDocs = (k) =>
    ["photo", "panDocument", "aadhaarFront", "aadhaarBack", "aadhaarDocument", "passportDocument", "addressProof", "selfie", "signature", "cancelledCheque"]
      .some((f) => k[f]);

  return (
    <div className="space-y-4">
      <KycDocumentViewer open={Boolean(viewDocs)} kyc={viewDocs} onClose={() => setViewDocs(null)} />

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <div className="card p-3 text-center"><div className="text-lg font-bold text-amber-600">{counts.pending}</div><div className="text-xs text-muted-foreground">Pending</div></div>
        <div className="card p-3 text-center"><div className="text-lg font-bold text-emerald-600">{counts.approved}</div><div className="text-xs text-muted-foreground">Approved</div></div>
        <div className="card p-3 text-center"><div className="text-lg font-bold text-rose-500">{counts.rejected}</div><div className="text-xs text-muted-foreground">Rejected</div></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[["", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([v, l]) => (
          <button key={l} type="button" onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === v ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      {items.map((k) => (
        <div key={k.id} className="card overflow-hidden">
          <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => setExpanded(expanded === k.id ? null : k.id)}>
            <div className="min-w-0">
              <div className="font-bold text-foreground">{k.fullName || k.investor?.name}</div>
              <div className="text-xs text-muted-foreground">
                {k.investor?.email} · PAN {k.panNumber || "—"} · Aadhaar {k.aadhaarNumber ? `****${k.aadhaarNumber.slice(-4)}` : "—"}
              </div>
            </div>
            <Badge status={k.status} />
          </button>
          {expanded === k.id && (
            <div className="border-t border-border p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[["Phone", k.phone], ["DOB", k.dob], ["Country", k.country], ["State", k.state], ["City", k.city], ["Address", k.address], ["ID Type", k.idType], ["ID Number", k.idNumber], ["PAN", k.panNumber], ["Aadhaar", k.aadhaarNumber], ["Bank", k.bankName], ["Account", k.bankAccount], ["IFSC", k.ifscCode], ["Branch", k.branchName], ["UPI", k.upiId]].map(([l, v]) => v && (
                  <div key={l}><span className="text-muted-foreground">{l}</span><div className="break-words font-medium">{v}</div></div>
                ))}
              </div>
              {hasDocs(k) && (
                <button type="button" className="btn-outline mt-4 text-xs" onClick={() => setViewDocs(k)}>
                  View uploaded documents
                </button>
              )}
              {k.remarks && <p className="mt-3 text-sm text-muted-foreground">Remarks: {k.remarks}</p>}
              {k.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => decide(k.id, "APPROVED")} className="btn-gold text-xs">Approve</button>
                  <button onClick={() => decide(k.id, "REJECTED")} className="btn-outline text-xs text-rose-500">Reject</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && <p className="text-center text-muted-foreground">No KYC submissions.</p>}
    </div>
  );
}
