import { useEffect, useState, useCallback, useRef } from "react";
import { investApi } from "../../lib/api.js";
import { inr, dateStr } from "../../lib/format.js";
import { useInvestRefresh } from "../../lib/investRefresh.js";
import {
  INVEST_STAT_GRID,
  INVEST_DASHBOARD_SPLIT,
  INVEST_DASHBOARD_MAIN,
  INVEST_DASHBOARD_SIDE,
} from "../../lib/invest-dashboard-ui.js";
import KpiStatCard, {
  WelcomeBanner,
  QuickActionGrid,
  AllocationBars,
  PlanBreakdownChart,
  RecentActivityList,
  UpcomingDashboardBoxes,
  UpcomingScheduleList,
} from "./InvestDashboardWidgets.jsx";
import ActivePlansPanel from "./ActivePlansPanel.jsx";
import ShareProfitButton from "./ShareProfitButton.jsx";
import OverviewActionBar from "./OverviewActionBar.jsx";
import CalendarPeriodFilter from "./CalendarPeriodFilter.jsx";
import InvestorDashboardChartsBlock from "./InvestorDashboardChartsBlock.jsx";
import AchievementBadgesPanel from "./AchievementBadgesPanel.jsx";
import KycCompleteNotice from "./KycCompleteNotice.jsx";
import { HeroKpi } from "./HeroKpi.jsx";
import { buildStatsQuery } from "../../lib/finance-period.js";
import { useAuth } from "../../lib/store.jsx";
import { investEligibility } from "../../lib/investCompliance.js";

export default function InvestorOverviewPanel({
  onNavigate,
  onOpenDetail,
  userName,
  kycStatus,
  profilePicture,
  investor,
  kyc,
  dashboardPreview = false,
}) {
  const { invest: authInvest } = useAuth();
  const profile = investor || authInvest;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const hasLoadedRef = useRef(false);

  const load = useCallback((p = period, from = customFrom, to = customTo, { silent = false } = {}) => {
    const showSkeleton = !silent && !hasLoadedRef.current;
    if (showSkeleton) setLoading(true);
    const qs = buildStatsQuery(p, from, to);
    investApi(`/dashboard${qs}`)
      .then((d) => {
        setData(d);
        hasLoadedRef.current = true;
      })
      .catch(() => {})
      .finally(() => {
        if (showSkeleton) setLoading(false);
      });
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  useInvestRefresh(useCallback(() => load(period, customFrom, customTo, { silent: true }), [load, period, customFrom, customTo]));

  const handlePeriod = (p) => {
    setPeriod(p);
    if (p !== "custom") load(p, customFrom, customTo);
  };

  const s = data?.summary;
  const allocation = (data?.allocation || []).map((a) => ({ ...a, display: inr(a.value) }));

  const { canInvest } = investEligibility(profile, kyc);

  const actions = [
    { icon: "deposit", color: "cyan", label: "Add Funds", onClick: () => onNavigate("money", { moneyTab: "deposit" }) },
    {
      icon: "plans",
      color: "gold",
      label: "Invest",
      onClick: () => (canInvest ? onNavigate("plans") : onNavigate("kyc")),
    },
    { icon: "referral", color: "amber", label: "Refer & Earn", onClick: () => onNavigate("referral") },
    { icon: "withdraw", color: "pink", label: "Withdraw", onClick: () => onNavigate("money", { moneyTab: "withdraw" }) },
  ];

  const pl = data?.periodLabel || "All time";

  if (dashboardPreview) {
    return (
      <div className="page-stack">
        <WelcomeBanner
          name={userName}
          profilePicture={profilePicture}
          subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        />
        <p className="text-sm text-muted-foreground">
          Portfolio charts, investments, and wallet actions unlock after your KYC is approved. Use{" "}
          <strong className="text-foreground">KYC</strong> or <strong className="text-foreground">Help</strong> in the menu meanwhile.
        </p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <WelcomeBanner
        name={userName}
        profilePicture={profilePicture}
        subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      />

      <KycCompleteNotice investor={profile} kyc={kyc} onCompleteKyc={() => onNavigate("kyc")} />

      <OverviewActionBar
        onDeposit={() => onNavigate("money", { moneyTab: "deposit" })}
        onWithdraw={() => onNavigate("money", { moneyTab: "withdraw" })}
        onRefer={() => onNavigate("referral")}
      />

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

      {/* Hero KPI strip — Kuber style */}
      <div className="card overflow-hidden border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-card to-yellow-500/5 p-4 dark:from-amber-500/15 dark:via-card dark:to-yellow-500/10 sm:p-5">
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 xl:grid-cols-4">
          <HeroKpi icon="💼" label="Total Portfolio" value={inr(s?.totalPortfolio || 0)} loading={loading} tone="amber" sub={`Available ${inr(s?.available || 0)} + Invested ${inr(s?.totalInvested || 0)}`} />
          <HeroKpi icon="📈" label="Total Earnings" value={inr(s?.totalEarnings || 0)} loading={loading} tone="emerald" action={!loading && s?.totalEarnings > 0 ? <ShareProfitButton type="profit" amount={inr(s.totalEarnings)} label="Share" /> : null} />
          <HeroKpi icon="💎" label="Active Invested" value={inr(s?.totalInvested || 0)} loading={loading} tone="blue" sub={`${s?.activeInvestments || 0} active plans`} onClick={() => onNavigate("investments")} />
          <HeroKpi icon="📅" label="Est. Monthly Income" value={inr(s?.monthlyIncome || 0)} loading={loading} tone="violet" sub={data?.upcomingMaturity ? `Next maturity profit ${inr(data.upcomingMaturity.profitAmount)} · ${dateStr(data.upcomingMaturity.maturityDate)} (${data.upcomingMaturity.daysLeft}d)` : "No active maturities"} />
        </div>
      </div>

      <QuickActionGrid actions={actions} />

      <InvestorDashboardChartsBlock
        loading={loading}
        chartData={data?.charts?.portfolioHistory || []}
        portfolioPie={data?.charts?.portfolioPie || []}
        monthlyReturns={data?.charts?.monthlyReturns || []}
        hasPortfolioData={(s?.totalPortfolio || 0) > 0}
        onViewPlans={() => onNavigate("plans")}
      />

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">Upcoming & Latest</h3>
        </div>
        <UpcomingDashboardBoxes
          data={data}
          loading={loading}
          formatAmount={inr}
          formatDate={dateStr}
          onNavigate={onNavigate}
        />
      </div>

      <div className={INVEST_STAT_GRID}>
        <KpiStatCard tone="emerald" icon="👛" label="Available Balance" value={inr(s?.available || 0)} loading={loading} onClick={() => onNavigate("money", { moneyTab: "overview" })} />
        <KpiStatCard tone="blue" icon="📊" label="Invested" value={inr(s?.totalInvested || 0)} loading={loading} onClick={() => onNavigate("investments")} />
        <KpiStatCard tone="violet" icon="✨" label="Earnings" value={inr(s?.totalEarnings || 0)} loading={loading} />
        <KpiStatCard tone="amber" icon="🔁" label="Monthly Returns" value={inr(s?.monthlyIncome || 0)} loading={loading} subValue="Based on active plans" />
      </div>

      <div className={INVEST_DASHBOARD_SPLIT}>
        <div className={INVEST_DASHBOARD_MAIN}>
          <ActivePlansPanel subscriptions={data?.subscriptions || []} loading={loading} onNavigate={onNavigate} onOpenDetail={onOpenDetail} />

          <div className="card p-5">
            <h3 className="mb-4 font-bold text-heading">Portfolio Allocation</h3>
            {loading ? <div className="h-20 animate-pulse rounded bg-slate-100 dark:bg-white/5" /> : (
              <AllocationBars items={allocation.length ? allocation : [{ label: "Empty", value: 1, color: "#94a3b8", display: inr(0) }]} totalLabel={`Total portfolio ${inr(s?.totalPortfolio || 0)}`} />
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-heading">Recent Activity</h3>
              <button type="button" className="text-xs font-semibold text-gold-600" onClick={() => onNavigate("ledger")}>View ledger →</button>
            </div>
            <RecentActivityList
              items={data?.recentActivity || []}
              formatAmount={inr}
              formatDate={(d) => dateStr(d, true)}
            />
          </div>
        </div>

        <div className={INVEST_DASHBOARD_SIDE}>
          <div className="card p-5">
            <h3 className="mb-4 font-bold text-heading">By Plan Tier</h3>
            <PlanBreakdownChart
              plans={(data?.planAllocation || []).map((p) => ({ ...p, planId: p.planType, name: p.name, amount: p.amount, count: p.count }))}
              formatValue={inr}
            />
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-heading">Upcoming Schedule</h3>
              <button type="button" className="text-xs font-semibold text-gold-600" onClick={() => onNavigate("investments")}>All investments →</button>
            </div>
            <UpcomingScheduleList
              items={data?.upcomingSchedule || []}
              formatAmount={inr}
              formatDate={dateStr}
              loading={loading}
            />
          </div>

          {data?.upcomingMaturity && (
            <div className="card border border-amber-500/30 bg-amber-500/5 p-5">
              <h3 className="mb-2 font-bold text-amber-700 dark:text-amber-400">Next Maturity Profit</h3>
              <p className="text-2xl font-extrabold text-heading">{inr(data.upcomingMaturity.profitAmount)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{data.upcomingMaturity.planName} · Principal {inr(data.upcomingMaturity.principal)}</p>
              <p className="mt-2 text-xs font-semibold text-amber-600">
                {dateStr(data.upcomingMaturity.maturityDate)} • {data.upcomingMaturity.daysLeft} days left
              </p>
              {data.upcomingMaturity.maturityAction && (
                <p className="mt-1 text-xs text-muted-foreground">Payout choice: {data.upcomingMaturity.maturityAction}</p>
              )}
              <button type="button" className="btn-gold mt-3 w-full text-sm" onClick={() => onNavigate("investments")}>View Investments</button>
            </div>
          )}

          <AchievementBadgesPanel />

          <div className="card overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-heading">Referral Program</h3>
                <p className="mt-1 text-sm text-muted-foreground">Invite friends and earn when they invest.</p>
                {profile?.referralCode && (
                  <p className="mt-2 font-mono text-xs text-amber-700 dark:text-amber-400">{profile.referralCode}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <ShareProfitButton type="referral" label="Share link" referralCode={profile?.referralCode || data?.referralCode} />
                <button type="button" className="btn-gold text-xs" onClick={() => onNavigate("referral")}>
                  Open referral →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
