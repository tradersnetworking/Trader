import { useEffect, useState } from "react";
import { mainApi } from "../../lib/api.js";
import { Badge } from "../ui.jsx";
import KycDocumentViewer from "../shared/KycDocumentViewer.jsx";
import { isIndiaCountry } from "../../lib/country-codes.js";

export default function MainTradeKycAdminPanel() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [viewDocs, setViewDocs] = useState(null);

  const load = () => mainApi(`/admin/trade-kyc${filter ? `?status=${filter}` : ""}`).then((d) => setItems(d.kyc || [])).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  const decide = async (id, status) => {
    let remarks = "";
    if (status === "REJECTED") {
      remarks = window.prompt("Rejection reason:") || "";
      if (!remarks.trim()) return;
    }
    await mainApi(`/admin/trade-kyc/${id}/decision`, { method: "POST", body: { status, remarks } });
    load();
  };

  return (
    <div className="space-y-4">
      <KycDocumentViewer open={Boolean(viewDocs)} kyc={viewDocs} onClose={() => setViewDocs(null)} />
      <p className="text-sm text-muted-foreground">Review KYC for purchasers and suppliers — India and international documents.</p>
      <div className="flex flex-wrap gap-2">
        {[["", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([v, l]) => (
          <button key={l} type="button" onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === v ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      {items.map((k) => (
        <div key={k.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-bold">{k.fullName || k.user?.name}</div>
              <div className="text-xs text-muted-foreground">{k.user?.email} · {k.partnerType} · {isIndiaCountry(k.country) ? "India" : k.country}</div>
            </div>
            <Badge status={k.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-outline text-xs" onClick={() => setViewDocs(k)}>View documents</button>
            {k.status === "PENDING" && (
              <>
                <button type="button" className="btn-gold text-xs" onClick={() => decide(k.id, "APPROVED")}>Approve</button>
                <button type="button" className="btn-outline text-xs text-rose-500" onClick={() => decide(k.id, "REJECTED")}>Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
      {!items.length && <p className="text-center text-muted-foreground">No KYC submissions.</p>}
    </div>
  );
}
