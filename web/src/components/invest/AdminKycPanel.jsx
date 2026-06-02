import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Badge } from "../ui.jsx";
import KycFullViewModal from "./KycFullViewModal.jsx";

export default function AdminKycPanel({ onUpdated }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [viewKyc, setViewKyc] = useState(null);

  const load = () =>
    investApi(`/admin/kyc${filter ? `?status=${filter}` : ""}`)
      .then((d) => {
        setItems(d.kyc);
        onUpdated?.(d.kyc);
      })
      .catch(() => {});

  useEffect(() => {
    load();
  }, [filter]);

  const counts = {
    pending: items.filter((k) => k.status === "PENDING").length,
    approved: items.filter((k) => k.status === "APPROVED").length,
    rejected: items.filter((k) => k.status === "REJECTED").length,
  };

  const decide = async (id, status) => {
    let remarks;
    if (status === "REJECTED") {
      const preset = window.prompt(
        "Rejection reason (shown to investor):\n\nExamples:\n- Document blurry — upload clear JPG/PNG/PDF\n- Signature unclear — redraw or upload sharp signature\n- PAN/Aadhaar mismatch\n- Other (type your reason)"
      );
      remarks = preset || "";
      if (!remarks.trim()) return;
    }
    await investApi(`/admin/kyc/${id}/decision`, { method: "POST", body: { status, remarks } });
    setViewKyc(null);
    load();
  };

  return (
    <div className="space-y-4">
      <KycFullViewModal
        open={Boolean(viewKyc)}
        kyc={viewKyc}
        onClose={() => setViewKyc(null)}
        onApprove={(k) => decide(k.id, "APPROVED")}
        onReject={(k) => decide(k.id, "REJECTED")}
      />

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-amber-600">{counts.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-emerald-600">{counts.approved}</div>
          <div className="text-xs text-muted-foreground">Approved</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-rose-500">{counts.rejected}</div>
          <div className="text-xs text-muted-foreground">Rejected</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[["", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([v, l]) => (
          <button
            key={l}
            type="button"
            onClick={() => setFilter(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === v ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="app-table-wrap card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Investor</th>
              <th className="p-3">PAN / Aadhaar</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium text-foreground">{k.fullName || k.investor?.name}</div>
                  <div className="text-xs text-muted-foreground">{k.investor?.email}</div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  PAN {k.panNumber || "—"}
                  <br />
                  Aadhaar {k.aadhaarNumber ? `****${k.aadhaarNumber.slice(-4)}` : "—"}
                </td>
                <td className="p-3">
                  <Badge status={k.status} />
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => setViewKyc(k)}>
                      View
                    </button>
                    {k.status === "PENDING" && (
                      <>
                        <button type="button" className="btn-gold px-3 py-1 text-xs" onClick={() => decide(k.id, "APPROVED")}>
                          Approve
                        </button>
                        <button type="button" className="btn-outline px-3 py-1 text-xs text-rose-600" onClick={() => decide(k.id, "REJECTED")}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && <p className="text-center text-muted-foreground">No KYC submissions.</p>}
    </div>
  );
}
