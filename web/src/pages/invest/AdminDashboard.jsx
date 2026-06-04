import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import InvestDashboardShell from "../../components/invest/InvestDashboardShell.jsx";
import { getAdminNav, translateNavLabel } from "../../lib/invest-nav.js";
import { useI18n } from "../../lib/i18n/context.jsx";
import { filterAdminNav, DEFAULT_ADMIN_PERMISSIONS, ALL_ADMIN_PERMISSIONS, ADMIN_TAB_PERMISSIONS } from "../../lib/adminPermissions.js";
import { TabPanel, DashboardTabFallback, PermissionGate, AdminLoadingPermissions } from "../../components/invest/DashboardTabFallback.jsx";
import SuperAdminGatewaysHub from "../../components/shared/SuperAdminGatewaysHub.jsx";
import {
  AdminOverviewPanel,
  LedgerTable,
  DepositPaymentAccountsPanel,
  InvestSettingsPanel,
  SupportLinksPanel,
  WhatsAppBusinessPanel,
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
  NotInvestedInvestorsPanel,
  KycPendingInvestorsPanel,
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
  ProfileApprovalsAdmin,
  StaffAdmin,
  AccountSecurityPanel,
  PlatformUpdatePanel,
} from "./lazyAdminPanels.js";

export default function InvestAdminDashboard() {
  const { invest, logoutInvest, refreshInvest } = useAuth();
  const { t } = useI18n();
  const isSuper = invest?.role === "SUPERADMIN";
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const setTab = (id, extra = {}) => setSp({ tab: id, ...extra });
  const [permissions, setPermissions] = useState(isSuper ? ALL_ADMIN_PERMISSIONS : null);
  const hasPerm = (key) => isSuper || (permissions || []).includes(key);
  const canViewTab = (id) => isSuper || !ADMIN_TAB_PERMISSIONS[id] || hasPerm(ADMIN_TAB_PERMISSIONS[id]);
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

  useEffect(() => {
    refreshInvest();
    loadHeaderStats();
    investApi("/admin/permissions")
      .then((d) => {
        const p = d.permissions || [];
        setPermissions(isSuper ? ALL_ADMIN_PERMISSIONS : (p.length ? p : DEFAULT_ADMIN_PERMISSIONS));
      })
      .catch(() => setPermissions(isSuper ? ALL_ADMIN_PERMISSIONS : DEFAULT_ADMIN_PERMISSIONS));
  }, [isSuper]);

  const allowedTabIds = navItems.filter((n) => n.id).map((n) => n.id);
  useEffect(() => {
    if (permissions === null) return;
    if (allowedTabIds.length && !allowedTabIds.includes(tab)) {
      setSp({ tab: allowedTabIds[0] }, { replace: true });
    }
  }, [permissions, tab, allowedTabIds.join(","), setSp]);

  const activeTab = allowedTabIds.includes(tab) ? tab : allowedTabIds[0] || "overview";

  const tabContent = useMemo(() => {
    if (permissions === null) return null;

    const gate = (permKey, title, node) => (
      <PermissionGate allowed={hasPerm(permKey)} title={title}>{node}</PermissionGate>
    );

    switch (activeTab) {
      case "overview":
        return (
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
        );
      case "pending-payments":
        return gate("view_dashboard", "Today's Payments", <TabPanel><TodayPendingPayments onUpdated={loadHeaderStats} /></TabPanel>);
      case "upcoming-payments":
        return gate("view_dashboard", "Upcoming Payments", <TabPanel><UpcomingPayments /></TabPanel>);
      case "plans":
        return gate("manage_plans", "Investment Plans", <TabPanel><PlansAdmin canManage={hasPerm("manage_plans")} /></TabPanel>);
      case "deposits":
        return gate("approve_deposits", "Deposits", (
          <TabPanel>
            <DepositsAdmin onUpdated={(list) => setNavBadges((b) => ({ ...b, deposits: (list || []).filter((d) => d.status === "PENDING").length }))} />
          </TabPanel>
        ));
      case "kyc":
        return gate("review_kyc", "User KYC & Accounts", (
          <TabPanel>
            <div className="space-y-8">
              <KycAdmin onUpdated={(list) => setNavBadges((b) => ({ ...b, kyc: (list || []).filter((k) => k.status === "PENDING").length }))} />
              <ProfileApprovalsAdmin />
            </div>
          </TabPanel>
        ));
      case "agreements":
        return gate("view_dashboard", "Agreements", <TabPanel><AdminAgreementsPanel isSuper={isSuper} /></TabPanel>);
      case "payouts":
        return gate("approve_withdrawals", "Withdrawals", (
          <TabPanel>
            <PayoutsAdmin onUpdated={(list) => setNavBadges((b) => ({ ...b, payouts: (list || []).filter((p) => p.status === "PENDING").length }))} />
          </TabPanel>
        ));
      case "ledger":
        return gate("view_dashboard", "Platform Ledger", (
          <TabPanel>
            <LedgerTable title="Platform Ledger" showInvestor fetchLedger={(q) => investApi(`/admin/ledger${q?.type ? `?type=${q.type}` : ""}`)} />
          </TabPanel>
        ));
      case "investors":
        return gate("manage_investors", "Investor Management", <TabPanel><UsersManagementPanel /></TabPanel>);
      case "not-invested":
        return gate("manage_investors", "Not Yet Invested", <TabPanel><NotInvestedInvestorsPanel /></TabPanel>);
      case "kyc-pending":
        return gate("manage_investors", "KYC Not Yet Done", <TabPanel><KycPendingInvestorsPanel /></TabPanel>);
      case "platform-investments":
        return gate("manage_investors", "Platform Investments", <TabPanel><PlatformInvestmentsPanel /></TabPanel>);
      case "wallet-ops":
        return gate("manage_investors", "Wallet Operations", <TabPanel><WalletOperationsPanel /></TabPanel>);
      case "homepage-cms":
        return gate("manage_settings", "Content Settings", <TabPanel><HomepageCmsPanel /></TabPanel>);
      case "notifications-admin":
        return gate("broadcast_notifications", "Notifications", <TabPanel><NotificationManagementPanel /></TabPanel>);
      case "backup":
        return gate("view_dashboard", "Backup & Export", <TabPanel><BackupExportPanel canImport={hasPerm("manage_settings")} /></TabPanel>);
      case "tickets":
        return gate("support_tickets", "Support Tickets", <TabPanel><SupportTicketsAdmin /></TabPanel>);
      case "referrals-admin":
        return gate("view_dashboard", "Referral Payouts", <TabPanel><ReferralEarningsAdmin /></TabPanel>);
      case "account":
        return <TabPanel><AccountSecurityPanel portal="invest" /></TabPanel>;
      case "broadcast":
        return gate("broadcast_notifications", "Broadcast", <TabPanel><BroadcastNotificationsPanel /></TabPanel>);
      case "promos":
        return gate("manage_settings", "Promo Codes", <TabPanel><PromoCodesAdmin /></TabPanel>);
      case "partners":
        return gate("manage_settings", "Partners", <TabPanel><PartnersCmsPanel /></TabPanel>);
      case "audit":
        return gate("view_audit", "Audit Log", <TabPanel><AuditLogPanel /></TabPanel>);
      case "treasury":
        return gate("treasury", "Treasury", <TabPanel><TreasuryPanel /></TabPanel>);
      case "analytics":
        return gate("analytics", "Cohort Analytics", <TabPanel><CohortAnalyticsPanel /></TabPanel>);
      case "rbac":
        return gate("manage_rbac", "Permissions", <TabPanel><RbacPanel /></TabPanel>);
      case "support-mail":
        return gate("support_tickets", "Mail Desk", <TabPanel><SupportMailPanel /></TabPanel>);
      case "gateways":
        return isSuper ? (
          <TabPanel><SuperAdminGatewaysHub api={investApi} showDepositAccounts /></TabPanel>
        ) : (
          <DashboardTabFallback title="Payment Gateways" message="Only Super Admin can manage payment gateways." onGoOverview={() => setTab("overview")} />
        );
      case "support-links":
        return gate("manage_settings", "WhatsApp & Telegram", <TabPanel><SupportLinksPanel /></TabPanel>);
      case "whatsapp-business":
        return gate(
          "manage_settings",
          "WhatsApp Business API",
          <TabPanel>
            <WhatsAppBusinessPanel readOnly={!isSuper} />
          </TabPanel>
        );
      case "communication":
        return gate(
          "manage_settings",
          "Mail Settings",
          <TabPanel>
            <CommunicationSettingsPanel readOnly={!isSuper} />
          </TabPanel>
        );
      case "settings":
        return gate("manage_settings", "Site Settings", <TabPanel><InvestSettingsPanel /></TabPanel>);
      case "staff":
        return gate("manage_staff", "Admin Accounts", <TabPanel><StaffAdmin /></TabPanel>);
      case "platform-update":
        return isSuper ? (
          <TabPanel>
            <PlatformUpdatePanel api={investApi} />
          </TabPanel>
        ) : (
          <DashboardTabFallback
            title="Platform Update"
            message="Only Super Admin can run platform updates."
            onGoOverview={() => setTab("overview")}
          />
        );
      default:
        return (
          <DashboardTabFallback
            title={translateNavLabel(t, navItems, activeTab)}
            message="This admin section is not configured yet."
            onGoOverview={() => setTab("overview")}
          />
        );
    }
  }, [activeTab, permissions, isSuper, invest?.name, invest?.profilePicture, t, navItems]);

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
      {permissions === null ? <AdminLoadingPermissions /> : (
        canViewTab(activeTab) ? tabContent : (
          <DashboardTabFallback
            title={translateNavLabel(t, navItems, activeTab)}
            message="You do not have permission to view this section."
            onGoOverview={() => setTab("overview")}
          />
        )
      )}
    </InvestDashboardShell>
  );
}
