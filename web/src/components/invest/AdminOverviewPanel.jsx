import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { Badge } from "../ui.jsx";
import {
  INVEST_STAT_GRID,
  INVEST_DASHBOARD_SPLIT,
  INVEST_DASHBOARD_MAIN,
  INVEST_DASHBOARD_SIDE,
} from "../../lib/invest-dashboard-ui.js";
import KpiStatCard, {
  WelcomeBanner,
  QuickActionGrid,
  PlanBreakdownChart,
  RecentActivityList,
} from "./InvestDashboardWidgets.jsx";

import CalendarPeriodFilter from "./CalendarPeriodFilter.jsx";
import { HeroKpi } from "./HeroKpi.jsx";
import AdminOverviewActionBar from "./AdminOverviewActionBar.jsx";
import { buildStatsQuery, periodMetricLabel } from "../../lib/finance-period.js";

export default function AdminOverviewPanel({ onNavigate, userName, isSuper, canManagePlans, onStatsLoaded, profilePicture }) {
  const [data, setData] = useState(null);
  const [loginSessions, setLoginSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const load = (p = period, from = customFrom, to = customTo) => {
    setLoading(true);
    const qs = buildStatsQuery(p, from, to);
    investApi(`/admin/dashboard?${qs}`).then((d) => {
      setData(d);
      onStatsLoaded?.(d);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    investApi("/admin/login-sessions").then((d) => setLoginSessions(d.sessions || [])).catch(() => {});
  }, []);

  const handlePeriod = (p) => {
    setPeriod(p);
    if (p !== "custom") load(p, customFrom, customTo);
  };

  const s = data?.stats;
  const pl = data?.periodLabel || "All time";

  const actions = [
    { icon: "payments", color: "amber", label: "Today's Payments", onClick: () => onNavigate("pending-payments") },
    { icon: "calendar", color: "violet", label: "Upcoming", onClick: () => onNavigate("upcoming-payments") },
    { icon: "deposit", color: "cyan", label: "Deposits", onClick: () => onNavigate("deposits") },
    { icon: "kyc", color: "violet", label: "KYC Review", onClick: () => onNavigate("kyc") },
    { icon: "payouts", color: "pink", label: "Payouts", onClick: () => onNavigate("payouts") },
    { icon: "investors", color: "emerald", label: "Investors", onClick: () => onNavigate("investors") },
    { icon: "support", color: "cyan", label: "Support Tickets", onClick: () => onNavigate("tickets") },
    { icon: "support", color: "indigo", label: "Mail Desk", onClick: () => onNavigate("support-mail") },
  ];
  if (canManagePlans) actions.push({ icon: "plans", color: "gold", label: "Plans", onClick: () => onNavigate("plans") });
  if (isSuper) {
    actions.push(
      { icon: "support", color: "emerald", label: "WhatsApp & Telegram", onClick: () => onNavigate("support-links") },
      { icon: "settings", color: "slate", label: "Site Settings", onClick: () => onNavigate("settings") },
      { icon: "plans", color: "gold", label: "Content Settings", onClick: () => onNavigate("homepage-cms") },
      { icon: "support", color: "cyan", label: "Mail Settings", onClick: () => onNavigate("communication") },
    );
  }

  return (
    <div className="page-stack">
      <WelcomeBanner
        name={userName}
        profilePicture={profilePicture}
        subtitle={`${isSuper ? "Super Admin" : "Admin"} • ${pl}`}
      />

      <AdminOverviewActionBar onNavigate={onNavigate} />

      <CalendarPeriodFilter
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onPeriodChange={handlePeriod}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onApplyCustom={() => load("custom", customFrom, customTo)}
        periodLabel={pl}
      />

      {/* Platform funds hero strip */}
      <div className="invest-surface-panel overflow-hidden border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-card to-violet-500/5 p-4 dark:from-amber-500/15 dark:via-card dark:to-violet-500/10 sm:p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{pl} · Platform Overview</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <HeroKpi label="Total Platform AUM" value={inr(s?.totalPortfolio || 0)} loading={loading} tone="blue" sub="Available + Invested + Earnings" />
          <HeroKpi label="Maturity Due Today" value={inr(s?.todayMaturityTotal || 0)} loading={loading} tone="amber" sub={`${s?.todayMaturityCount || 0} profit payments to release`} />
          <HeroKpi label="Total Invested" value={inr(s?.totalInvested || 0)} loading={loading} tone="emerald" sub={`${s?.activeSubs || 0} active subscriptions`} />
          <HeroKpi label="Monthly Payout Est." value={inr(s?.monthlyPayoutEstimate || 0)} loading={loading} tone="violet" sub="Returns due to investors" />
        </div>
      </div>

      <QuickActionGrid actions={actions} />

      <div className={INVEST_STAT_GRID}>
        <KpiStatCard tone="amber" icon="💰" label="Due Today" value={inr(s?.todayMaturityTotal || 0)} loading={loading} subValue={`${s?.todayMaturityCount || 0} maturities`} onClick={() => onNavigate("pending-payments")} />
        <KpiStatCard tone="blue" icon="👥" label="Investors" value={s?.investors ?? "—"} loading={loading} onClick={() => onNavigate("investors")} />
        <KpiStatCard tone="amber" icon="💎" label="Total Invested" value={inr(s?.totalInvested || 0)} loading={loading} subValue={`${s?.activeSubs || 0} active`} onClick={() => onNavigate("investors")} />
        <KpiStatCard tone="emerald" icon="✅" label={periodMetricLabel(pl, "Deposits")} value={inr(s?.approvedDeposits || 0)} loading={loading} onClick={() => onNavigate("deposits")} />
        <KpiStatCard tone="violet" icon="📤" label={periodMetricLabel(pl, "Withdrawals")} value={inr(s?.successPayouts || 0)} loading={loading} onClick={() => onNavigate("payouts")} />
        <KpiStatCard tone="cyan" icon="📈" label={periodMetricLabel(pl, "New Investments")} value={inr(s?.periodSubscriptions || 0)} loading={loading} onClick={() => onNavigate("investors")} />
        <KpiStatCard tone="cyan" icon="🪪" label="Pending KYC" value={s?.pendingKyc ?? "—"} loading={loading} onClick={() => onNavigate("kyc")} />
        <KpiStatCard tone="pink" icon="⏳" label="Pending Deposits" value={s?.pendingDeposits ?? "—"} loading={loading} onClick={() => onNavigate("deposits")} />
        <KpiStatCard tone="rose" icon="🏦" label="Pending Payouts" value={s?.pendingPayouts ?? "—"} loading={loading} onClick={() => onNavigate("payouts")} />
        <KpiStatCard tone="indigo" icon="📋" label="Investment Plans" value={s?.plans ?? "—"} loading={loading} onClick={() => onNavigate("plans")} />
      </div>

      <div className={INVEST_DASHBOARD_SPLIT}>
        <div className={INVEST_DASHBOARD_MAIN}>
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-navy dark:text-white">Investments by Plan Tier</h3>
              {canManagePlans && <button type="button" className="text-xs font-semibold text-gold-600" onClick={() => onNavigate("plans")}>Manage plans →</button>}
            </div>
            <PlanBreakdownChart plans={data?.planBreakdown || []} formatValue={inr} />
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-navy dark:text-white">Platform Ledger Activity</h3>
              <button type="button" className="text-xs font-semibold text-gold-600" onClick={() => onNavigate("ledger")}>Full ledger →</button>
            </div>
            <RecentActivityList
              items={(data?.recentLedger || []).map((e) => ({
                id: e.id,
                kind: "ledger",
                type: e.type,
                direction: e.direction,
                amount: e.amount,
                note: `${e.investor?.name || "Investor"} • ${e.note || ""}`,
                createdAt: e.createdAt,
              }))}
              formatAmount={inr}
              formatDate={(d) => dateStr(d, true)}
            />
          </div>
        </div>

        <div className={INVEST_DASHBOARD_SIDE}>
          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy dark:text-white">Ledger Summary</h3>
            <div className="space-y-2">
              {(data?.ledgerSummary || []).map((row) => (
                <div key={row.type} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
                  <span className="font-semibold text-navy dark:text-white">{row.type}</span>
                  <span className="text-slate-400">{row.count} txns • {inr(row.volume)}</span>
                </div>
              ))}
              {(data?.ledgerSummary || []).length === 0 && <p className="text-sm text-slate-400">No ledger data yet.</p>}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy dark:text-white">Pending Actions</h3>
            <div className="space-y-2">
              <PendingRow label="Maturity payments today" count={s?.todayMaturityCount} onClick={() => onNavigate("pending-payments")} />
              <PendingRow label="KYC to review" count={s?.pendingKyc} onClick={() => onNavigate("kyc")} />
              <PendingRow label="Deposits to approve" count={s?.pendingDeposits} onClick={() => onNavigate("deposits")} />
              <PendingRow label="Payouts to release" count={s?.pendingPayouts} onClick={() => onNavigate("payouts")} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy dark:text-white">Recent Subscriptions</h3>
            <div className="space-y-2">
              {(data?.recentSubscriptions || []).slice(0, 5).map((sub) => (
                <div key={sub.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                  <div className="flex justify-between">
                    <b className="text-navy dark:text-white">{sub.investor?.name}</b>
                    <Badge status={sub.status} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>{sub.plan?.name}</span>
                    <span>{inr(sub.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy dark:text-white">Recent logins (IP & geo)</h3>
            <p className="mb-2 text-xs text-muted-foreground">One device per user — new login ends other sessions.</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {loginSessions.slice(0, 8).map((s) => (
                <div key={s.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-white/5">
                  <div className="font-medium text-navy dark:text-white">{s.investor?.name || "—"}</div>
                  <div className="text-slate-500">
                    {dateStr(s.createdAt, true)} · {s.ipAddress || "—"} · {[s.city, s.country].filter(Boolean).join(", ") || "—"} · {s.deviceLabel}
                    {s.isCurrent ? " · active" : ""}
                  </div>
                </div>
              ))}
              {loginSessions.length === 0 && <p className="text-xs text-muted-foreground">No login records yet.</p>}
            </div>
            <button type="button" className="mt-2 text-xs font-semibold text-primary underline" onClick={() => onNavigate("investors")}>
              Manage investors →
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy dark:text-white">Recent Deposits</h3>
            <div className="space-y-2">
              {(data?.recentDeposits || []).slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
                  <div>
                    <div className="font-medium text-navy dark:text-white">{d.investor?.name}</div>
                    <div className="text-xs text-slate-400">{d.method}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{inr(d.amount)}</div>
                    <Badge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingRow({ label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm transition hover:border-gold/30 hover:bg-gold/5 dark:border-slate-800"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${count > 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
        {count ?? 0}
      </span>
    </button>
  );
}
