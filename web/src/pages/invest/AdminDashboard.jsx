import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import InvestDashboardShell from "../../components/invest/InvestDashboardShell.jsx";
import PanelSkeleton from "../../components/invest/PanelSkeleton.jsx";
import { getAdminNav, translateNavLabel } from "../../lib/invest-nav.js";
import { useI18n } from "../../lib/i18n/context.jsx";
import { filterAdminNav } from "../../lib/adminPermissions.js";
import {
  AdminOverviewPanel,
  LedgerTable,
  DepositPaymentAccountsPanel,
  InvestSettingsPanel,
  CommunicationSettingsPanel,
  TodayPendingPayments,
  UpcomingPayments,
  AdminAgreementsPanel,
  PromoCodesAdmin,
  AuditLogPanel,
  PartnersCmsPanel,
  BroadcastNotificationsPanel,
  SupportTicketsAdmin,
  ReferralEarningsAdmin,
  TreasuryPanel,
  CohortAnalyticsPanel,
  RbacPanel,
  SupportMailPanel,
  PlatformInvestmentsPanel,
  UsersManagementPanel,
  WalletOperationsPanel,
  HomepageCmsPanel,
  NotificationManagementPanel,
  BackupExportPanel,
  PayoutsAdmin,
  PlansAdmin,
  DepositsAdmin,
  KycAdmin,
  StaffAdmin,
} from "./lazyAdminPanels.js";

function TabPanel({ children }) {
  return <Suspense fallback={<PanelSkeleton />}>{children}</Suspense>;
}

export default function InvestAdminDashboard() {
  const { invest, logoutInvest, refreshInvest } = useAuth();
  const { t } = useI18n();
  const isSuper = invest?.role === "SUPERADMIN";
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const setTab = (id, extra = {}) => setSp({ tab: id, ...extra });
  const [permissions, setPermissions] = useState(null);
  const hasPerm = (key) => isSuper || (permissions || []).includes(key);
  const baseNav = getAdminNav(isSuper);
  const navItems = permissions ? filterAdminNav(baseNav, permissions, isSuper) : baseNav;
  const [platformInvested, setPlatformInvested] = useState(null);
  const [todayMaturityTotal, setTodayMaturityTotal] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [navBadges, setNavBadges] = useState({});

  const loadHeaderStats = () => {
    investApi("/admin/dashboard").then((d) => {
      setPlatformInvested(d.stats?.totalInvested);
      setTodayMaturityTotal(d.stats?.todayMaturityTotal ?? 0);
      setNavBadges({
        payouts: d.stats?.pendingPayouts || 0,
        deposits: d.stats?.pendingDeposits || 0,
        kyc: d.stats?.pendingKyc || 0,
        "pending-payments": d.stats?.todayMaturityCount || 0,
      });
    }).catch(() => {});
    investApi("/admin/notifications").then((d) => setNotificationCount(d.count || 0)).catch(() => {});
  };

  useEffect(() => { refreshInvest(); loadHeaderStats(); investApi("/admin/permissions").then((d) => setPermissions(d.permissions || [])).catch(() => setPermissions([])); }, []);

  const allowedTabIds = navItems.filter((n) => n.id).map((n) => n.id);
  useEffect(() => {
    if (permissions === null) return;
    if (allowedTabIds.length && !allowedTabIds.includes(tab)) {
      setSp({ tab: allowedTabIds[0] });
    }
  }, [permissions, tab, allowedTabIds.join(",")]);

  const activeTab = allowedTabIds.includes(tab) ? tab : allowedTabIds[0] || "overview";

  return (
    <InvestDashboardShell
      user={invest}
      role="admin"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setTab}
      pageTitle={translateNavLabel(t, navItems, activeTab)}
      pageSubtitle={`${isSuper ? t("dashboard.superAdmin") : t("dashboard.adminRole")} • invest.akshayaexim.com`}
      platformInvested={platformInvested}
      todayMaturityTotal={todayMaturityTotal}
      notificationCount={notificationCount}
      navBadges={navBadges}
      onNotificationsClick={() => setTab("tickets")}
      onLogout={logoutInvest}
    >
      {activeTab === "overview" && (
        <TabPanel>
          <AdminOverviewPanel
            userName={invest?.name}
            profilePicture={invest?.profilePicture}
            isSuper={isSuper}
            canManagePlans={hasPerm("manage_plans")}
            onNavigate={setTab}
            onStatsLoaded={(d) => {
              setPlatformInvested(d.stats?.totalInvested);
              setTodayMaturityTotal(d.stats?.todayMaturityTotal ?? 0);
              setNavBadges({
                payouts: d.stats?.pendingPayouts || 0,
                deposits: d.stats?.pendingDeposits || 0,
                kyc: d.stats?.pendingKyc || 0,
                "pending-payments": d.stats?.todayMaturityCount || 0,
              });
            }}
          />
        </TabPanel>
      )}
      {activeTab === "pending-payments" && <TabPanel><TodayPendingPayments onUpdated={loadHeaderStats} /></TabPanel>}
      {activeTab === "upcoming-payments" && <TabPanel><UpcomingPayments /></TabPanel>}
      {activeTab === "plans" && (
        <TabPanel>
          <PlansAdmin canManage={hasPerm("manage_plans")} />
        </TabPanel>
      )}
      {activeTab === "deposits" && (
        <TabPanel>
          <DepositsAdmin
            onUpdated={(list) => setNavBadges((b) => ({ ...b, deposits: (list || []).filter((d) => d.status === "PENDING").length }))}
          />
        </TabPanel>
      )}
      {activeTab === "kyc" && (
        <TabPanel>
          <KycAdmin
            onUpdated={(list) => setNavBadges((b) => ({ ...b, kyc: (list || []).filter((k) => k.status === "PENDING").length }))}
          />
        </TabPanel>
      )}
      {activeTab === "agreements" && <TabPanel><AdminAgreementsPanel isSuper={hasPerm("manage_settings")} /></TabPanel>}
      {activeTab === "payouts" && (
        <TabPanel>
          <PayoutsAdmin
            onUpdated={(list) => setNavBadges((b) => ({ ...b, payouts: (list || []).filter((p) => p.status === "PENDING").length }))}
          />
        </TabPanel>
      )}
      {activeTab === "ledger" && (
        <TabPanel>
          <LedgerTable
            title="Platform Ledger"
            showInvestor
            fetchLedger={(q) => investApi(`/admin/ledger${q?.type ? `?type=${q.type}` : ""}`)}
          />
        </TabPanel>
      )}
      {activeTab === "investors" && <TabPanel><UsersManagementPanel /></TabPanel>}
      {activeTab === "platform-investments" && <TabPanel><PlatformInvestmentsPanel /></TabPanel>}
      {activeTab === "wallet-ops" && <TabPanel><WalletOperationsPanel /></TabPanel>}
      {activeTab === "homepage-cms" && <TabPanel><HomepageCmsPanel /></TabPanel>}
      {activeTab === "notifications-admin" && <TabPanel><NotificationManagementPanel /></TabPanel>}
      {activeTab === "backup" && <TabPanel><BackupExportPanel /></TabPanel>}
      {activeTab === "tickets" && <TabPanel><SupportTicketsAdmin /></TabPanel>}
      {activeTab === "referrals-admin" && <TabPanel><ReferralEarningsAdmin /></TabPanel>}
      {activeTab === "broadcast" && <TabPanel><BroadcastNotificationsPanel /></TabPanel>}
      {activeTab === "promos" && <TabPanel><PromoCodesAdmin /></TabPanel>}
      {activeTab === "partners" && <TabPanel><PartnersCmsPanel /></TabPanel>}
      {activeTab === "audit" && <TabPanel><AuditLogPanel /></TabPanel>}
      {activeTab === "treasury" && <TabPanel><TreasuryPanel /></TabPanel>}
      {activeTab === "analytics" && <TabPanel><CohortAnalyticsPanel /></TabPanel>}
      {activeTab === "rbac" && isSuper && <TabPanel><RbacPanel /></TabPanel>}
      {activeTab === "support-mail" && <TabPanel><SupportMailPanel /></TabPanel>}
      {activeTab === "gateways" && <TabPanel><DepositPaymentAccountsPanel editable={hasPerm("manage_gateways")} /></TabPanel>}
      {activeTab === "communication" && isSuper && <TabPanel><CommunicationSettingsPanel /></TabPanel>}
      {activeTab === "settings" && <TabPanel><InvestSettingsPanel /></TabPanel>}
      {activeTab === "staff" && isSuper && (
        <TabPanel>
          <StaffAdmin />
        </TabPanel>
      )}
    </InvestDashboardShell>
  );
}
