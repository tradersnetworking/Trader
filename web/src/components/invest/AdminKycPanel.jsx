import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { investPath } from "../../lib/site.js";
import { Badge } from "../ui.jsx";
import KycFullViewModal from "./KycFullViewModal.jsx";
import { parseSectionReviews } from "../../lib/kyc-sections.js";

export default function AdminKycPanel({ onUpdated }) {
  const [items, setItems] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [filter, setFilter] = useState("");
  const [viewKyc, setViewKyc] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadRegistered = () =>
    investApi("/admin/investors")
      .then((d) => {
        const inv = (d.investors || []).filter((i) => i.role === "INVESTOR");
        setRegistered(inv.filter((i) => !i.kyc || i.kyc?.status === "NOT_SUBMITTED"));
      })
      .catch(() => setRegistered([]));

  const load = async () => {
    setLoadErr("");
    try {
      const d = await investApi(`/admin/kyc${filter ? `?status=${filter}` : ""}`);
      setItems(d.kyc || []);
      onUpdated?.(d.kyc);
      if (viewKyc) {
        const fresh = (d.kyc || []).find((k) => k.id === viewKyc.id);
        if (fresh) setViewKyc(fresh);
      }
    } catch (e) {
      setLoadErr(e.message || "Could not load KYC list.");
      setItems([]);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadRegistered()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    loadRegistered();
  }, [filter]);

  const counts = {
    pending: items.filter((k) => k.status === "PENDING").length,
    approved: items.filter((k) => k.status === "APPROVED").length,
    rejected: items.filter((k) => k.status === "REJECTED").length,
  };

  const withBusy = useCallback(async (fn) => {
    setReviewBusy(true);
    try {
      await fn();
      await load();
    } finally {
      setReviewBusy(false);
    }
  }, []);

  const decideSection = (id, section, status, remarks) =>
    withBusy(() =>
      investApi(`/admin/kyc/${id}/section`, { method: "POST", body: { section, status, remarks } })
    );

  const decideFinal = (id, status, remarks) =>
    withBusy(() =>
      investApi(`/admin/kyc/${id}/final`, { method: "POST", body: { status, remarks } })
    );

  const handleFinalApprove = (k) => {
    if (!window.confirm("Final approve this KYC? Investor gets full dashboard access.")) return;
    decideFinal(k.id, "APPROVED");
    setViewKyc(null);
  };

  const handleFinalReject = (k, remarks) => {
    if (!remarks?.trim()) return;
    decideFinal(k.id, "REJECTED", remarks.trim());
    setViewKyc(null);
  };

  const sectionSummary = (k) => {
    const r = parseSectionReviews(k);
    if (!r) return "—";
    const parts = [];
    if (Object.values(r).some((s) => s.status === "REJECTED")) parts.push("needs fix");
    if (Object.values(r).every((s) => s.status === "APPROVED")) parts.push("sections OK");
    return parts.join(", ") || "review";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground">User KYC review</h3>
        <p className="text-sm text-muted-foreground">
          Review each investor&apos;s submission — approve or reject by section and per document.
        </p>
      </div>
      <KycFullViewModal
        open={Boolean(viewKyc)}
        kyc={viewKyc}
        onClose={() => setViewKyc(null)}
        reviewBusy={reviewBusy}
        onSectionDecision={decideSection}
        onFinalApprove={handleFinalApprove}
        onFinalReject={handleFinalReject}
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

      {loadErr && <p className="text-sm text-rose-600">{loadErr}</p>}

      <div className="flex flex-wrap items-center gap-2">
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
        <button type="button" className="btn-outline ml-auto text-xs" disabled={refreshing} onClick={refreshAll}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="app-table-wrap card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Investor</th>
              <th className="p-3">PAN / Aadhaar</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sections</th>
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
                <td className="p-3 text-xs text-muted-foreground">{sectionSummary(k)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn-gold px-3 py-1.5 text-xs" onClick={() => setViewKyc(k)}>
                      Review KYC
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && <p className="text-center text-muted-foreground">No KYC submissions.</p>}

      {registered.length > 0 && (
        <div className="space-y-2 border-t border-border pt-6">
          <h4 className="text-sm font-bold text-foreground">Registered users without KYC ({registered.length})</h4>
          <p className="text-xs text-muted-foreground">
            These accounts signed up (Google or email) but have not submitted KYC yet — they will not appear in the table above.
          </p>
          <div className="app-table-wrap card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Sign-in</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registered.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-xs">{i.hasGoogle ? (i.hasPassword ? "Google + Email" : "Google") : "Email"}</td>
                    <td className="p-3 text-muted-foreground">{i.email}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {i.createdAt ? new Date(i.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Link to={investPath(`/admin?tab=investors&manage=${i.id}`)} className="btn-gold inline-block px-2 py-1 text-xs">
                        Complete KYC
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
