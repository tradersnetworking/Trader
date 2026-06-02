import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr, dateStr, daysLeft } from "../../lib/format.js";
import { Badge, Field, Alert } from "../../components/ui.jsx";
import PlanCard from "../../components/PlanCard.jsx";
import SubscribeModal from "../../components/SubscribeModal.jsx";
import InvestDashboardShell from "../../components/invest/InvestDashboardShell.jsx";
import MaturityChoiceModal from "../../components/invest/MaturityChoiceModal.jsx";
import InvestorOverviewPanel from "../../components/invest/InvestorOverviewPanel.jsx";
import { TabPanel, DashboardTabFallback } from "../../components/invest/DashboardTabFallback.jsx";
import { INVESTOR_NAV, translateNavLabel } from "../../lib/invest-nav.js";
import { useI18n } from "../../lib/i18n/context.jsx";
import { PLAN_TYPES, LOCK_IN_SUB_CATEGORIES } from "../../lib/plan-types.js";
import { INVEST_STAT_GRID } from "../../lib/invest-dashboard-ui.js";
import WalletQuickActions from "../../components/invest/WalletQuickActions.jsx";
import MobileAppDownload from "../../components/invest/MobileAppDownload.jsx";
import ShareProfitButton from "../../components/invest/ShareProfitButton.jsx";
import AccountSecurityPanel from "../../components/shared/AccountSecurityPanel.jsx";
import KpiStatCard from "../../components/invest/InvestDashboardWidgets.jsx";
import {
  MoneyHubPanel,
  InvestmentDetailPanel,
  LedgerTable,
  KycPanel,
  TransactionsPanel,
  InvestorAgreementsPanel,
  ReferralPanel,
  SupportPanel,
  NotificationsPanel,
  SecuritySettingsPanel,
  PushNotificationsToggle,
} from "./lazyInvestorPanels.js";
import { investSecurityApi } from "../../lib/api.js";
import { useNavigate } from "react-router-dom";
import { investPath } from "../../lib/site.js";
import PendingInvestBanner from "../../components/invest/PendingInvestBanner.jsx";
import {
  savePendingInvest,
  loadPendingInvest,
  clearPendingInvest,
  canAffordPending,
} from "../../lib/pendingInvest.js";
import { emitInvestRefresh, useInvestRefresh } from "../../lib/investRefresh.js";

const INVESTOR_TAB_IDS = INVESTOR_NAV.filter((n) => n.id).map((n) => n.id);

export default function InvestorDashboard() {
  const { invest, logoutInvest, refreshInvest } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const rawTab = sp.get("tab") || "overview";
  const legacyMoney = { wallet: "overview", deposit: "deposit", withdraw: "withdraw" };
  const tab = legacyMoney[rawTab] ? "money" : rawTab;
  const moneySubTab = legacyMoney[rawTab] || sp.get("moneyTab") || "overview";
  const subId = sp.get("subId");
  const resumePlan = sp.get("resumePlan") === "1";
  const setTab = (id, extra = {}) => {
    const params = { tab: id, ...extra };
    if (id !== "investments") delete params.subId;
    setSp(params);
  };
  const clearResumePlan = () => setSp({ tab: "plans" }, { replace: true });
  useEffect(() => {
    if (!INVESTOR_TAB_IDS.includes(tab)) setSp({ tab: "overview" }, { replace: true });
  }, [tab, setSp]);
  const setSubDetail = (id) => setSp({ tab: "investments", subId: id });
  const clearSubDetail = () => setSp({ tab: "investments" });

  const [wallet, setWallet] = useState(null);
  const [subs, setSubs] = useState([]);
  const [kyc, setKyc] = useState(null);
  const [maturityChoices, setMaturityChoices] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingAgreementId, setPendingAgreementId] = useState(null);
  const [pendingInvest, setPendingInvest] = useState(() => loadPendingInvest());
  const [refreshing, setRefreshing] = useState(false);

  const syncPendingInvest = useCallback(() => {
    setPendingInvest(loadPendingInvest());
  }, []);

  const dismissPendingInvest = useCallback(() => {
    clearPendingInvest();
    setPendingInvest(null);
  }, []);

  const handleNeedDeposit = useCallback((payload) => {
    savePendingInvest(payload);
    setPendingInvest(payload);
    setTab("money", { moneyTab: "deposit", resumePlan: "1" });
  }, [setTab]);

  const fetchCore = useCallback(async () => {
    refreshInvest();
    await Promise.all([
      investApi("/wallet").then((d) => setWallet(d.wallet)).catch(() => {}),
      investApi("/subscriptions").then((d) => setSubs(d.subscriptions)).catch(() => {}),
      investApi("/kyc").then((d) => setKyc(d.kyc)).catch(() => {}),
      investApi("/maturity-choices").then((d) => setMaturityChoices(d.subscriptions || [])).catch(() => {}),
      Promise.all([
        investApi("/notifications").catch(() => ({ count: 0 })),
        investApi("/notifications/list").catch(() => ({ unreadCount: 0 })),
      ]).then(([maturity, inbox]) => setNotificationCount((maturity.count || 0) + (inbox.unreadCount || 0))),
    ]);
    syncPendingInvest();
  }, [refreshInvest, syncPendingInvest]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchCore();
      emitInvestRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCore, refreshing]);

  useEffect(() => { fetchCore(); }, [fetchCore]);

  useEffect(() => {
    if (!invest || invest.role !== "INVESTOR") return;
    investSecurityApi("/onboarding").then((d) => {
      if (!d.complete) navigate(investPath("/onboarding"), { replace: true });
    }).catch(() => {});
  }, [invest?.id]);

  return (
    <InvestDashboardShell
      user={invest}
      role="investor"
      navItems={INVESTOR_NAV}
      activeTab={tab}
      onTabChange={setTab}
      pageTitle={translateNavLabel(t, INVESTOR_NAV, tab)}
      pageSubtitle={`${invest?.name} • KYC: ${kyc?.status || "PENDING"}`}
      walletBalance={wallet?.available}
      notificationCount={notificationCount}
      onNotificationsClick={() => setTab("notifications")}
      onLogout={logoutInvest}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      headerActions={
        <>
          <WalletQuickActions compact layout="inline" onDeposit={() => setTab("money", { moneyTab: "deposit" })} onWithdraw={() => setTab("money", { moneyTab: "withdraw" })} />
          <MobileAppDownload compact />
        </>
      }
    >
      <MaturityChoiceModal subscriptions={maturityChoices} onDone={() => { fetchCore(); emitInvestRefresh(); }} />
      {kyc?.status !== "APPROVED" && tab !== "overview" && tab !== "kyc" && (
        <div className="mb-4"><Alert type="info">Complete your KYC and add funds before investing.</Alert></div>
      )}
      {tab === "overview" && (
        <InvestorOverviewPanel
          userName={invest?.name}
          profilePicture={invest?.profilePicture}
          kycStatus={kyc?.status}
          onNavigate={setTab}
          onOpenDetail={(id) => setSubDetail(id)}
        />
      )}
      {tab === "plans" && (
        <Plans
          wallet={wallet}
          pendingInvest={pendingInvest}
          autoResume={resumePlan}
          onResumeHandled={clearResumePlan}
          onRefresh={() => { fetchCore(); emitInvestRefresh(); }}
          onNeedDeposit={handleNeedDeposit}
          onDismissPending={dismissPendingInvest}
          onSignAgreement={(id) => { setPendingAgreementId(id); setTab("agreements"); }}
        />
      )}
      {tab === "investments" && !subId && <Investments subs={subs} onNavigate={setTab} onOpenDetail={setSubDetail} />}
      {tab === "investments" && subId && (
        <TabPanel><InvestmentDetailPanel subscriptionId={subId} onBack={clearSubDetail} /></TabPanel>
      )}
      {tab === "money" && (
        <TabPanel>
          <MoneyHubPanel
            wallet={wallet}
            onRefresh={() => { fetchCore(); emitInvestRefresh(); }}
            initialSubTab={moneySubTab}
            pendingInvest={pendingInvest}
            onContinuePending={() => setTab("plans", { resumePlan: "1" })}
            onDismissPending={dismissPendingInvest}
          />
        </TabPanel>
      )}
      {tab === "transactions" && <TabPanel><TransactionsPanel /></TabPanel>}
      {tab === "ledger" && (
        <TabPanel>
          <LedgerTable
            title="My Ledger"
            fetchLedger={(q) => investApi(`/ledger${q?.type ? `?type=${q.type}` : ""}`)}
          />
        </TabPanel>
      )}
      {tab === "referral" && <TabPanel><ReferralPanel /></TabPanel>}
      {tab === "support" && <TabPanel><SupportPanel /></TabPanel>}
      {tab === "notifications" && (
        <TabPanel><NotificationsPanel onRead={fetchCore} /></TabPanel>
      )}
      {tab === "kyc" && <TabPanel><KycPanel kyc={kyc} onRefresh={fetchCore} /></TabPanel>}
      {tab === "agreements" && (
        <TabPanel>
          <InvestorAgreementsPanel
            pendingAgreementId={pendingAgreementId}
            onPendingHandled={() => setPendingAgreementId(null)}
          />
        </TabPanel>
      )}
      {tab === "profile" && (
        <div className="mt-6">
          <Profile />
        </div>
      )}
      {tab === "account" && (
        <div className="mt-6 space-y-6">
          <TabPanel><AccountSecurityPanel portal="invest" /></TabPanel>
          <TabPanel><SecuritySettingsPanel /></TabPanel>
          <TabPanel><PushNotificationsToggle /></TabPanel>
        </div>
      )}
      {!INVESTOR_TAB_IDS.includes(tab) && (
        <DashboardTabFallback title="Dashboard" onGoOverview={() => setTab("overview")} />
      )}
    </InvestDashboardShell>
  );
}

function Plans({ wallet, pendingInvest, autoResume, onResumeHandled, onRefresh, onNeedDeposit, onDismissPending, onSignAgreement }) {
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [resume, setResume] = useState(null);
  const [filterTier, setFilterTier] = useState("");
  const [filterLockIn, setFilterLockIn] = useState("");

  const loadPlans = useCallback(() => {
    investApi("/public/plans").then((d) => setPlans(d.plans)).catch(() => {});
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useInvestRefresh(loadPlans);

  const openPlan = useCallback((plan, opts = {}) => {
    if (wallet && wallet.available < plan.minInvestment && !opts.forceWizard) {
      onNeedDeposit?.({
        planId: plan.id,
        planName: plan.name,
        amount: plan.minInvestment,
        settlementCycle: (plan.settlementCycles || "MONTHLY").split(",")[0]?.trim() || "MONTHLY",
        step: 1,
      });
      return;
    }
    setResume(opts.resume || null);
    setSub(plan);
  }, [wallet, onNeedDeposit]);

  useEffect(() => {
    if (!autoResume || !pendingInvest || !plans.length || !wallet) return;
    const plan = plans.find((p) => p.id === pendingInvest.planId);
    if (!plan) return;
    if (canAffordPending(pendingInvest, wallet.available)) {
      openPlan(plan, {
        forceWizard: true,
        resume: {
          amount: pendingInvest.amount,
          step: pendingInvest.step ?? 6,
          cycle: pendingInvest.settlementCycle,
        },
      });
    }
    onResumeHandled?.();
  }, [autoResume, pendingInvest, plans, wallet, openPlan, onResumeHandled]);

  const shown = plans.filter((p) => {
    if (filterTier && p.planType !== filterTier) return false;
    if (filterLockIn && Math.round(p.lockInDays / 30) !== Number(filterLockIn)) return false;
    return true;
  });

  const handleSubscribeDone = (agreement, signNow, anotherPlan) => {
    clearPendingInvest();
    setSub(null);
    setResume(null);
    onRefresh();
    if (anotherPlan) return;
    if (signNow && agreement?.id) onSignAgreement?.(agreement.id);
  };

  return (
    <>
      {pendingInvest && (
        <div className="mb-4">
          <PendingInvestBanner
            pending={pendingInvest}
            walletAvailable={wallet?.available}
            onContinue={() => {
              const plan = plans.find((p) => p.id === pendingInvest.planId);
              if (plan) {
                openPlan(plan, {
                  forceWizard: true,
                  resume: {
                    amount: pendingInvest.amount,
                    step: canAffordPending(pendingInvest, wallet?.available) ? (pendingInvest.step ?? 6) : 1,
                    cycle: pendingInvest.settlementCycle,
                  },
                });
              } else {
                onNeedDeposit?.(pendingInvest);
              }
            }}
            onDismiss={onDismissPending}
          />
        </div>
      )}
      <p className="mb-4 text-sm text-muted-foreground">Subscribe to as many plans as you like — each investment is tracked separately.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilterTier("")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!filterTier ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}>All tiers</button>
        {PLAN_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => setFilterTier(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filterTier === t ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilterLockIn("")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!filterLockIn ? "bg-gold/15 text-gold-700" : "bg-muted text-muted-foreground"}`}>All lock-ins</button>
        {LOCK_IN_SUB_CATEGORIES.map((m) => (
          <button key={m} type="button" onClick={() => setFilterLockIn(String(m))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filterLockIn === String(m) ? "bg-gold/15 text-gold-700" : "bg-muted text-muted-foreground"}`}>{m}mo</button>
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map((p) => <PlanCard key={p.id} plan={p} onSubscribe={(plan) => openPlan(plan)} />)}</div>
      {sub && (
        <SubscribeModal
          plan={sub}
          onClose={() => { setSub(null); setResume(null); }}
          onNeedDeposit={onNeedDeposit}
          initialAmount={resume?.amount}
          initialStep={resume?.step}
          initialCycle={resume?.cycle}
          onDone={handleSubscribeDone}
        />
      )}
    </>
  );
}

function Investments({ subs, onNavigate, onOpenDetail }) {
  return (
    <div>
      <div className={`${INVEST_STAT_GRID} mb-6`}>
        <KpiStatCard tone="blue" icon="📈" label="Total Subscriptions" value={subs.length} />
        <KpiStatCard tone="emerald" icon="✅" label="Active" value={subs.filter((s) => s.status === "ACTIVE").length} />
        <KpiStatCard tone="amber" icon="💰" label="Invested" value={inr(subs.filter((s) => s.status === "ACTIVE").reduce((n, s) => n + s.amount, 0))} />
        <KpiStatCard tone="violet" icon="📅" label="Matured" value={subs.filter((s) => s.matured).length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      {subs.map((s) => (
        <div
          key={s.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetail?.(s.id)}
          onKeyDown={(e) => e.key === "Enter" && onOpenDetail?.(s.id)}
          className="card cursor-pointer p-5 text-left transition hover:ring-2 hover:ring-primary/30"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-navy">{s.plan?.name}</h3>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <ShareProfitButton
                type="investment"
                amount={inr(s.amount)}
                plan={s.plan}
                monthlyRoiPct={s.monthlyRoiPct}
                lockInDays={s.lockInDays}
              />
              <Badge status={s.matured ? "MATURED" : s.status} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-400">Invested</span><div className="font-bold text-navy">{inr(s.amount)}</div></div>
            <div><span className="text-slate-400">Monthly Return</span><div className="font-bold text-gold-600">{inr(s.monthlyReturn)}</div></div>
            <div><span className="text-slate-400">Started</span><div>{dateStr(s.startDate)}</div></div>
            <div><span className="text-slate-400">Matures</span><div>{dateStr(s.maturityDate)} ({daysLeft(s.maturityDate)}d)</div></div>
          </div>
          <div className="mt-3 rounded bg-slate-50 p-2 text-sm dark:bg-white/5">
            Projected maturity ({s.matured ? "compounded" : "simple"}): <b className="text-navy dark:text-white">{inr(s.projection.maturityValue)}</b>
          </div>
          <p className="mt-2 text-xs font-semibold text-primary">View details →</p>
        </div>
      ))}
      {subs.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-slate-400">No investments yet.</p>
          <button type="button" className="btn-gold mt-4" onClick={() => onNavigate?.("plans")}>Browse Plans</button>
        </div>
      )}
      </div>
    </div>
  );
}

function Profile() {
  const { invest, refreshInvest } = useAuth();
  const [form, setForm] = useState({ name: invest?.name || "", phone: invest?.phone || "", upiId: invest?.upiId || "", bankName: invest?.bankName || "", accountNumber: invest?.accountNumber || "", ifsc: invest?.ifsc || "" });
  const [msg, setMsg] = useState("");
  const submit = async (e) => { e.preventDefault(); await investApi("/profile", { method: "PUT", body: form }); setMsg("Saved."); refreshInvest(); };
  return (
    <div className="max-w-xl card p-6">
      <h3 className="mb-3 font-bold text-navy">Profile & Payout Details</h3>
      <form onSubmit={submit} className="space-y-3">
        {msg && <Alert type="success">{msg}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="UPI ID (for withdrawals)"><input className="input" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bank Name"><input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>
          <Field label="Account Number"><input className="input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></Field>
          <Field label="IFSC"><input className="input" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></Field>
        </div>
        <button className="btn-gold w-full">Save</button>
      </form>
    </div>
  );
}
