import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr, daysLeft } from "../../lib/format.js";
import { Badge, Alert } from "../ui.jsx";
import PlanShareIcons from "./PlanShareIcons.jsx";
import InvestmentCertificate from "./InvestmentCertificate.jsx";
import { INVEST_STAT_GRID } from "../../lib/invest-dashboard-ui.js";
import KpiStatCard from "./InvestDashboardWidgets.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";

export default function InvestmentDetailPanel({ subscriptionId, onBack }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cert, setCert] = useState(null);
  const [certBusy, setCertBusy] = useState(false);
  const [exitPreview, setExitPreview] = useState(null);
  const [exitBusy, setExitBusy] = useState(false);
  const [exitMsg, setExitMsg] = useState("");

  useEffect(() => {
    if (!subscriptionId) return;
    setLoading(true);
    investApi(`/subscriptions/${subscriptionId}`)
      .then((d) => {
        setData(d);
        const sub = d?.subscription;
        if (sub?.status === "ACTIVE" && !sub?.matured) {
          investApi(`/subscriptions/${subscriptionId}/early-exit/preview`)
            .then(setExitPreview)
            .catch(() => setExitPreview(null));
        } else {
          setExitPreview(null);
        }
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  if (!subscriptionId) return null;
  if (loading) return <p className="text-sm text-muted-foreground">Loading investment…</p>;
  if (err) return <Alert type="error">{err}</Alert>;

  const s = data?.subscription;
  if (!s) return <Alert type="error">Investment not found.</Alert>;

  const loadCertificate = async () => {
    setCertBusy(true);
    try {
      const d = await investApi(`/subscriptions/${subscriptionId}/certificate`);
      setCert(d.certificate);
    } catch (e) {
      setErr(e.message);
    } finally {
      setCertBusy(false);
    }
  };

  const confirmEarlyExit = async () => {
    if (!exitPreview?.ok) return;
    const msg = t("earlyExit.confirmMsg")
      .replace("{penalty}", inr(exitPreview.penalty))
      .replace("{net}", inr(exitPreview.netCredit));
    if (!window.confirm(msg)) return;
    setExitBusy(true);
    setExitMsg("");
    try {
      const r = await investApi(`/subscriptions/${subscriptionId}/early-exit`, { method: "POST", body: {} });
      setExitMsg(r.message);
      setExitPreview(null);
      const d = await investApi(`/subscriptions/${subscriptionId}`);
      setData(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setExitBusy(false);
    }
  };

  return (
    <div className="page-stack max-w-4xl">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-primary hover:underline w-fit">
        ← Back to Portfolio
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{s.plan?.name || "Investment"}</h2>
            <Badge status={s.matured ? "MATURED" : s.status} />
          </div>
          <p className="text-sm text-muted-foreground">{s.plan?.planType} • {Math.round(s.lockInDays / 30)} month lock-in</p>
        </div>
        <PlanShareIcons plan={s.plan} amount={inr(s.amount)} className="justify-end" />
        <button type="button" className="btn-outline text-xs" disabled={certBusy} onClick={loadCertificate}>
          {certBusy ? t("common.loading") : t("certificate.download")}
        </button>
      </div>

      <div className={INVEST_STAT_GRID}>
        <KpiStatCard tone="blue" icon="💎" label="Principal" value={inr(s.amount)} />
        <KpiStatCard tone="emerald" icon="📈" label="Monthly Return" value={inr(s.monthlyReturn)} subValue={`${s.monthlyRoiPct}% ROI`} />
        <KpiStatCard tone="violet" icon="💰" label="ROI Paid Out" value={inr(s.totalRoiPaid || 0)} />
        <KpiStatCard tone="amber" icon="🎯" label="Maturity Value" value={inr(s.projection?.maturityValue || 0)} subValue={s.matured ? "Compounded" : "Projected (simple)"} />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-foreground">Investment Details</h3>
        <dl className="divide-y divide-border text-sm">
          {[
            ["Investment ID", s.id.slice(-8).toUpperCase()],
            ["Started", dateStr(s.startDate)],
            ["Matures", `${dateStr(s.maturityDate)} (${daysLeft(s.maturityDate)} days)`],
            ["Settlement", s.settlementCycle],
            ["Compounding", s.compounding ? "Enabled (post lock-in)" : "At maturity only"],
            ["Annual ROI", `${(s.monthlyRoiPct * 12).toFixed(1)}%`],
            ["Status", s.matured ? "Matured" : s.status],
            ["Maturity Action", s.maturityAction || "Not chosen yet"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {exitMsg && <Alert type="success">{exitMsg}</Alert>}

      {exitPreview?.ok && s.status === "ACTIVE" && !s.matured && (
        <div className="card border border-rose-500/30 bg-rose-500/5 p-5">
          <h3 className="font-bold text-rose-800 dark:text-rose-300">{t("earlyExit.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("earlyExit.subtitle")}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("earlyExit.principal")}</dt><dd className="font-medium">{inr(exitPreview.principal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("earlyExit.penalty")} ({exitPreview.penaltyPct}%)</dt><dd className="font-medium text-rose-600">−{inr(exitPreview.penalty)}</dd></div>
            {exitPreview.roiClawback > 0 && (
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("earlyExit.roiForfeit")}</dt><dd className="font-medium text-rose-600">−{inr(exitPreview.roiClawback)}</dd></div>
            )}
            <div className="flex justify-between border-t border-border pt-2"><dt className="font-semibold">{t("earlyExit.netCredit")}</dt><dd className="font-bold text-emerald-600">{inr(exitPreview.netCredit)}</dd></div>
          </dl>
          <button type="button" className="btn-outline mt-4 w-full border-rose-500/40 text-rose-700 dark:text-rose-400" disabled={exitBusy} onClick={confirmEarlyExit}>
            {exitBusy ? t("common.loading") : t("earlyExit.request")}
          </button>
        </div>
      )}

      {s.roiPayouts?.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-foreground">ROI Payout History</h3>
          <div className="space-y-2">
            {s.roiPayouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span>{dateStr(p.periodEnd)} • {p.cycle}</span>
                <span className="font-semibold text-emerald-600">{inr(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.ledger?.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-foreground">Related Ledger</h3>
          <div className="space-y-2 text-sm">
            {data.ledger.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
                <span className="text-muted-foreground">{e.note || e.type}</span>
                <span className={e.direction === "CREDIT" ? "text-emerald-600" : "text-rose-600"}>{e.direction === "CREDIT" ? "+" : "−"}{inr(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {cert && <InvestmentCertificate data={cert} onClose={() => setCert(null)} />}
    </div>
  );
}
