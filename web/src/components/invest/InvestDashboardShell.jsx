import { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo, Badge, UserAvatar } from "../ui.jsx";
import BrandMark from "../BrandMark.jsx";
import { ThemeToggle } from "../../lib/theme.jsx";
import { getAdminNav, getNavLabel, navShortLabel, navIconBg, navIconFg, translateNavItem, translateNavShort } from "../../lib/invest-nav.js";
import { INVESTOR_KYC_NAV_TAB_IDS, INVESTOR_KYC_RESTRICTED_NAV_LABELS } from "../../lib/investCompliance.js";
import { sessionGet, sessionSet } from "../../lib/browserStorage.js";
import { useI18n } from "../../lib/i18n/context.jsx";
import { NavIcon } from "./NavIcons.jsx";
import { inr } from "../../lib/format.js";
import { investPath } from "../../lib/site.js";
import { openStaffPortal, showCrossPortalSwitch } from "../../lib/staffPortal.js";
import ErrorBoundary from "../ErrorBoundary.jsx";
import LanguageSelector from "./LanguageSelector.jsx";
import SupportWidget from "./SupportWidget.jsx";
import InvestShareWidget from "./InvestShareWidget.jsx";
import KycUnderReviewCard from "./KycUnderReviewCard.jsx";

export default function InvestDashboardShell({
  user,
  role,
  navItems,
  activeTab,
  onTabChange,
  pageTitle,
  pageSubtitle,
  walletBalance,
  platformInvested,
  todayMaturityTotal,
  notificationCount = 0,
  navBadges = {},
  onNotificationsClick,
  onLogout,
  onRefresh,
  refreshing = false,
  headerActions,
  kycOnlyMode = false,
  kycRestricted = false,
  dashboardLocked = false,
  kycReview = null,
  children,
}) {
  const { t } = useI18n();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(() => sessionGet("invest-sidebar-collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const desktopSidebarNavRef = useRef(null);
  const mobileSidebarNavRef = useRef(null);
  const sidebarScrollTop = useRef(0);

  const saveSidebarScroll = useCallback(() => {
    const el = mobileSidebarNavRef.current || desktopSidebarNavRef.current;
    if (el) sidebarScrollTop.current = el.scrollTop;
  }, []);

  const handleSidebarScroll = useCallback((e) => {
    sidebarScrollTop.current = e.currentTarget.scrollTop;
  }, []);

  const handleTabChange = useCallback(
    (id) => {
      saveSidebarScroll();
      onTabChange(id);
    },
    [onTabChange, saveSidebarScroll]
  );

  useLayoutEffect(() => {
    const top = sidebarScrollTop.current;
    if (desktopSidebarNavRef.current) desktopSidebarNavRef.current.scrollTop = top;
    if (mobileSidebarNavRef.current) mobileSidebarNavRef.current.scrollTop = top;
  }, [activeTab]);

  useEffect(() => {
    sessionSet("invest-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const links = navItems.filter((n) => n.id);
  const mobilePrimary = role === "admin"
    ? links.filter((n) => ["overview", "pending-payments", "deposits", "kyc"].includes(n.id))
    : kycRestricted
      ? links.filter((n) => INVESTOR_KYC_NAV_TAB_IDS.includes(n.id))
      : links.filter((n) => ["overview", "money", "investments", "referral", "plans"].includes(n.id));
  const mobileMore = links.filter((n) => !mobilePrimary.some((m) => m.id === n.id));

  const sectionLabel = (section) => {
    const map = {
      Operations: "nav.sectionOperations",
      "Daily Operations": "nav.sectionDailyOps",
      "Users & Plans": "nav.sectionUsersPlans",
      "Support & CMS": "nav.sectionSupport",
      Platform: "nav.sectionPlatform",
      "Platform Settings": "nav.sectionPlatformSettings",
      Investing: "nav.sectionInvesting",
      "Account & Records": "nav.sectionAccount",
      "Help & Rewards": "nav.sectionHelp",
    };
    const key = map[section];
    if (!key) return section;
    const translated = t(key);
    return translated !== key ? translated : section;
  };

  const NavButton = ({ item, mobile }) => {
    const active = activeTab === item.id;
    const restrictedLabel = kycRestricted && INVESTOR_KYC_RESTRICTED_NAV_LABELS[item.id];
    const label = restrictedLabel || translateNavItem(t, item);
    const badge = navBadges[item.id];
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleTabChange(item.id)}
        title={collapsed && !mobile ? item.label : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        } ${collapsed && !mobile ? "justify-center px-2" : ""}`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-gold-400 to-gold shadow-sm" />
        )}
        <span
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.06] dark:ring-white/10 ${navIconBg(item.color)} ${active ? "ring-gold/30" : ""}`}
        >
          <NavIcon name={item.icon} className={`h-[18px] w-[18px] ${navIconFg(item.color)}`} />
          {badge > 0 && collapsed && !mobile && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        {(!collapsed || mobile) && (
          <>
            <span className="truncate text-left">{label}</span>
            {badge > 0 && (
              <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500/90 px-1.5 text-[10px] font-bold text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const renderSidebarInner = (mobile, onClose, navRef) => (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={`flex shrink-0 items-center border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-brand-blue/5 px-4 ${
          mobile ? "py-2.5" : "py-4"
        } ${collapsed && !mobile ? "justify-center" : "justify-between gap-3"}`}
      >
        {collapsed && !mobile ? (
          <Link to={role === "admin" ? investPath("/admin") : investPath("/dashboard")} className="block">
            <Logo brand="invest" variant="mark" className="h-10 w-10" />
          </Link>
        ) : (
          <>
            <BrandMark
              to={role === "admin" ? investPath("/admin") : investPath("/dashboard")}
              investSiteTitle
              showLogoImage
              brandSize={mobile ? "lg" : "md"}
              subtitle={role === "admin" ? "Admin Portal" : "Investor Portal"}
              className="min-w-0 flex-1 overflow-hidden"
            />
            {mobile && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="icon-btn icon-btn-md shrink-0 border-0 bg-sidebar-accent/80"
                aria-label="Close menu"
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>

      <nav
        ref={navRef}
        onScroll={handleSidebarScroll}
        className="invest-sidebar-scroll min-h-0 flex-1 touch-pan-y space-y-0.5 overflow-y-auto overscroll-contain p-3"
      >
        {navItems.map((item, i) =>
          item.section ? (
            (!collapsed || mobile) && (
              <div
                key={`section-${i}`}
                role="presentation"
                aria-hidden="true"
                className="pointer-events-none mb-1 mt-4 select-none border-t border-sidebar-border/60 px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 first:mt-1 first:border-t-0 first:pt-0"
              >
                {sectionLabel(item.section)}
              </div>
            )
          ) : (
            <NavButton key={item.id} item={item} mobile={mobile} />
          )
        )}
      </nav>

      {(!collapsed || mobile) && user && (
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/80 p-2.5">
            <UserAvatar user={user} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{user.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </div>
      )}

      {!mobile && (
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? `→ ${t("dashboard.expandSidebar")}` : `← ${t("dashboard.collapseSidebar")}`}
          </button>
        </div>
      )}
    </div>
  );

  const UserMenu = () =>
    userOpen && (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-card p-2 shadow-xl">
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <UserAvatar user={user} size={44} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">{user?.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          {role === "admin" && user?.role === "SUPERADMIN" && (
            <Link
              to={investPath("/dashboard?preview=investor")}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => setUserOpen(false)}
            >
              Investor View
            </Link>
          )}
          {role === "investor" && ["ADMIN", "SUPERADMIN"].includes(user?.role) && (
            <Link
              to={investPath("/admin")}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => setUserOpen(false)}
            >
              Admin Portal
            </Link>
          )}
          {showCrossPortalSwitch() && ["ADMIN", "SUPERADMIN"].includes(user?.role) && (
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => {
                setUserOpen(false);
                openStaffPortal({ fromPortal: "invest", toPortal: "main", next: "/admin" }).catch((e) =>
                  alert(e.message || "Could not open marketplace dashboard")
                );
              }}
            >
              Marketplace Dashboard
            </button>
          )}
          {kycRestricted && role === "investor" && (
            <>
              {kycReview?.onViewSubmission && (
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setUserOpen(false);
                    kycReview.onViewSubmission();
                  }}
                >
                  View submitted KYC
                </button>
              )}
              {kycReview?.onOpenProfile && (
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setUserOpen(false);
                    kycReview.onOpenProfile();
                  }}
                >
                  My Account
                </button>
              )}
              {kycReview?.onOpenAccount && (
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setUserOpen(false);
                    kycReview.onOpenAccount();
                  }}
                >
                  Security
                </button>
              )}
              {kycReview?.onOpenSupport && (
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setUserOpen(false);
                    kycReview.onOpenSupport();
                  }}
                >
                  Help
                </button>
              )}
              {kycReview?.onEditKyc && (
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setUserOpen(false);
                    kycReview.onEditKyc();
                  }}
                >
                  View / edit KYC
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setUserOpen(false);
              onLogout();
              nav(investPath("/login"));
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            {t("dashboard.logout")}
          </button>
        </div>
      </>
    );

  return (
    <div
      className={`invest-shell relative flex h-[100dvh] max-w-[100vw] overflow-hidden overflow-x-clip bg-background ${kycOnlyMode ? "invest-shell-kyc-only" : ""}`}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      {!kycOnlyMode && (
      <aside
        className={`invest-sidebar hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r shadow-sm backdrop-blur-xl md:flex ${
          collapsed ? "w-[4.75rem]" : "w-64 lg:w-72"
        }`}
      >
        {renderSidebarInner(false, null, desktopSidebarNavRef)}
      </aside>
      )}

      {!kycOnlyMode && mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="invest-sidebar absolute bottom-0 left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col overflow-hidden shadow-2xl">
            {renderSidebarInner(true, () => setMobileOpen(false), mobileSidebarNavRef)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="invest-header sticky top-0 z-30 shrink-0 overflow-x-clip border-b backdrop-blur-md">
          <div className="border-b border-border/60 px-2 py-1.5 md:hidden">
            <BrandMark
              to={role === "admin" ? investPath("/admin") : investPath("/dashboard")}
              investSiteTitle
              showLogoImage
              brandSize="lg"
              mobileBarFill
              className="w-full"
            />
          </div>
          <div className="flex min-w-0 items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2.5">
            {!kycOnlyMode && (
            <button
              type="button"
              className="icon-btn icon-btn-sm shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            )}
            <BrandMark
              to={role === "admin" ? investPath("/admin") : investPath("/dashboard")}
              investSiteTitle
              showLogoImage
              brandSize="md"
              className="hidden min-w-0 shrink-0 md:flex"
            />
            <div className="hidden min-w-0 flex-1 overflow-hidden xl:block">
              <h1 className="page-title truncate">{pageTitle}</h1>
              {pageSubtitle && <p className="page-subtitle truncate">{pageSubtitle}</p>}
            </div>
            <div className="min-w-0 flex-1 truncate md:block xl:hidden">
              <h1 className="truncate text-sm font-bold leading-tight text-foreground sm:text-base">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex max-w-full shrink-0 items-center gap-0.5 sm:gap-1.5">
              {headerActions && role === "investor" && (
                <div className="hidden xs:flex items-center gap-1 sm:flex">{headerActions}</div>
              )}
              {walletBalance != null && role === "investor" && !kycOnlyMode && (
                <div className="hidden rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 px-2 py-1 text-right sm:block sm:px-3 sm:py-1.5 ring-1 ring-emerald-500/20">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("dashboard.balance")}</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 sm:text-sm">{inr(walletBalance)}</div>
                </div>
              )}
              {todayMaturityTotal != null && role === "admin" && (
                <div className="hidden rounded-xl bg-gradient-to-r from-gold/15 to-gold-400/10 px-3 py-1.5 text-right lg:block ring-1 ring-gold/25">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("dashboard.dueToday")}</div>
                  <div className="text-sm font-bold text-accent-tone">{inr(todayMaturityTotal)}</div>
                </div>
              )}
              {platformInvested != null && role === "admin" && (
                <div className="hidden rounded-xl bg-gradient-to-r from-blue-500/15 to-indigo-500/10 px-3 py-1.5 text-right sm:block ring-1 ring-blue-500/20">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("dashboard.invested")}</div>
                  <div className="text-sm font-bold text-info-tone">{inr(platformInvested)}</div>
                </div>
              )}
              {role === "admin" && user?.role && (
                <span className="hidden sm:inline-flex">
                  <Badge status={user.role} />
                </span>
              )}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="icon-btn icon-btn-sm relative md:icon-btn-md md:inline-flex"
                  aria-label={refreshing ? t("dashboard.refreshing") : t("dashboard.refresh")}
                  title={refreshing ? t("dashboard.refreshing") : t("dashboard.refresh")}
                >
                  <NavIcon
                    name="refresh"
                    className={`h-3.5 w-3.5 text-muted-foreground md:h-4 md:w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              {onNotificationsClick && !kycOnlyMode && (
              <button
                type="button"
                onClick={onNotificationsClick}
                className="icon-btn icon-btn-sm relative md:icon-btn-md md:inline-flex"
                aria-label={t("dashboard.notifications")}
              >
                <NavIcon name="bell" className="h-3.5 w-3.5 text-muted-foreground md:h-4 md:w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white md:h-4 md:min-w-4 md:text-[9px]">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>
              )}
              <ThemeToggle compact className="md:hidden" />
              <ThemeToggle className="hidden md:inline-flex" />
              <span className="hidden min-[480px]:inline-flex">
                <LanguageSelector compact />
              </span>
              <div className="relative">
                <button type="button" onClick={() => setUserOpen((v) => !v)} aria-label="Account">
                  <UserAvatar user={user} size={36} />
                </button>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main
          className={`invest-main-scroll flex-1 overflow-y-auto ${
            dashboardLocked
              ? "pointer-events-none select-none blur-[4px] brightness-[0.9] saturate-[0.88]"
              : ""
          }`}
          aria-hidden={dashboardLocked ? true : undefined}
        >
          <div className="invest-page-main">
            <ErrorBoundary key={activeTab}>{children}</ErrorBoundary>
          </div>
          <footer className="hidden border-t border-border px-4 py-3 text-center text-[10px] text-muted-foreground md:block">
            © {new Date().getFullYear()} AKSHYA INVESTMENTS ·{" "}
            <Link to={investPath("/privacy")} className="hover:text-primary">Privacy</Link> ·{" "}
            <Link to={investPath("/cookie-policy")} className="hover:text-primary">Cookies</Link> ·{" "}
            <Link to={`${investPath("/dashboard")}?tab=support`} className="hover:text-primary">Support</Link>
          </footer>
        </main>
      </div>
      </div>
      </div>

      <InvestShareWidget />
      <SupportWidget />

      {!kycOnlyMode && (
      <nav className="invest-mobile-nav fixed bottom-0 left-0 right-0 z-40 flex border-t backdrop-blur-xl md:hidden">
        {mobilePrimary.map((item) => {
          const active = activeTab === item.id;
          const itemLabel =
            (kycRestricted && INVESTOR_KYC_RESTRICTED_NAV_LABELS[item.id]) || translateNavItem(t, item);
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${navIconBg(item.color)} ${active ? "ring-2 ring-primary/35" : ""}`}
              >
                <NavIcon name={item.icon} className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${navIconFg(item.color)}`} />
              </span>
              <span className="max-w-[4.5rem] truncate">
                {kycRestricted && INVESTOR_KYC_RESTRICTED_NAV_LABELS[item.id]
                  ? INVESTOR_KYC_RESTRICTED_NAV_LABELS[item.id]
                  : translateNavShort(t, item)}
              </span>
            </button>
          );
        })}
        {mobileMore.length > 0 && (
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${mobileOpen ? "text-primary" : "text-muted-foreground"}`}
          aria-expanded={mobileOpen}
          aria-label={t("nav.more")}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${mobileOpen ? "bg-primary/15 ring-2 ring-primary/35" : "bg-muted/60"}`}>
            <NavIcon name="more" className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${mobileOpen ? "text-primary" : ""}`} />
          </span>
          <span>{t("nav.more")}</span>
        </button>
        )}
      </nav>
      )}

      {dashboardLocked && kycReview && (
        <div className="pointer-events-none absolute inset-0 z-[45] flex items-start justify-center overflow-y-auto bg-background/45 p-4 pt-6 backdrop-blur-[1px] sm:items-center sm:p-6">
          <div className="pointer-events-auto w-full max-w-lg">
            <KycUnderReviewCard
              kyc={kycReview.kyc}
              onRefresh={kycReview.onRefresh}
              onOpenProfile={kycReview.onOpenProfile}
              onOpenAccount={kycReview.onOpenAccount}
              onOpenSupport={kycReview.onOpenSupport}
              onEditKyc={kycReview.onEditKyc}
              onViewSubmission={kycReview.onViewSubmission}
              onLogout={kycReview.onLogout}
              onClose={kycReview.onCloseOverlay}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}
