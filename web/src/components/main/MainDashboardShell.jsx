import { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, UserAvatar, Logo } from "../ui.jsx";
import BrandMark from "../BrandMark.jsx";
import { ThemeToggle } from "../../lib/theme.jsx";
import { navIconBg, navIconFg } from "../../lib/invest-nav.js";
import { NavIcon } from "../invest/NavIcons.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import LanguageSelector from "../invest/LanguageSelector.jsx";
import { investUrl } from "../../lib/site.js";

export default function MainDashboardShell({
  user,
  mode = "user",
  navItems,
  activeTab,
  onTabChange,
  pageTitle,
  pageSubtitle,
  mobilePrimaryIds = [],
  onLogout,
  onRefresh,
  refreshing = false,
  children,
}) {
  const nav = useNavigate();
  const storageKey = "main-sidebar-collapsed";
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === "1");
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
    localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const links = navItems.filter((n) => n.id);
  const mobilePrimary = mobilePrimaryIds.length
    ? links.filter((n) => mobilePrimaryIds.includes(n.id))
    : links.slice(0, 4);

  const NavButton = ({ item, mobile }) => {
    const active = activeTab === item.id;
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
        </span>
        {(!collapsed || mobile) && <span className="truncate text-left">{item.label}</span>}
      </button>
    );
  };

  const renderSidebarInner = (mobile, onClose, navRef) => (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        className={`flex shrink-0 items-center border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-brand-blue/5 px-4 py-4 ${
          collapsed && !mobile ? "justify-center" : "justify-between gap-3"
        }`}
      >
        {collapsed && !mobile ? (
          <Link to="/" className="block">
            <Logo variant="mark" className="h-10 w-10" />
          </Link>
        ) : (
          <>
            <BrandMark
              to="/"
              subtitle={mode === "admin" ? "Trade · Admin Portal" : "Trade · My Account"}
              compact={mobile}
              className="min-w-0 flex-1"
            />
            {mobile && onClose && (
              <button type="button" onClick={onClose} className="icon-btn icon-btn-md shrink-0 border-0 bg-sidebar-accent/80" aria-label="Close menu">
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
                className="pointer-events-none mb-1 mt-4 border-t border-sidebar-border/60 px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground first:mt-1 first:border-t-0 first:pt-0"
              >
                {item.section}
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
            {collapsed ? "→ Expand" : "← Collapse"}
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
          <Link
            to={mode === "admin" ? "/admin" : "/dashboard"}
            className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setUserOpen(false)}
          >
            Marketplace Dashboard
          </Link>
          {mode === "user" && ["ADMIN", "SUPERADMIN", "STAFF"].includes(user?.role) && (
            <Link to="/admin" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={() => setUserOpen(false)}>
              Admin Portal
            </Link>
          )}
          {mode === "admin" && (
            <Link to="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={() => setUserOpen(false)}>
              User Dashboard
            </Link>
          )}
          {["ADMIN", "SUPERADMIN"].includes(user?.role) && (
            <a
              href={investUrl("/admin")}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => setUserOpen(false)}
            >
              Investment Dashboard
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setUserOpen(false);
              onLogout();
              nav("/");
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      </>
    );

  return (
    <div className="invest-shell site-main flex h-[100dvh] max-w-[100vw] overflow-hidden overflow-x-clip bg-background">
      <aside className={`invest-sidebar hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r shadow-sm backdrop-blur-xl md:flex ${collapsed ? "w-[4.75rem]" : "w-64 lg:w-72"}`}>
        {renderSidebarInner(false, null, desktopSidebarNavRef)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="invest-sidebar absolute bottom-0 left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col overflow-hidden shadow-2xl">
            {renderSidebarInner(true, () => setMobileOpen(false), mobileSidebarNavRef)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="invest-header sticky top-0 z-30 shrink-0 overflow-x-clip border-b backdrop-blur-md">
          <div className="border-b border-border/50 px-3 py-2 md:hidden">
            <BrandMark to="/" subtitle={pageTitle} compact className="min-w-0 max-w-full" />
            {pageSubtitle && <p className="mt-0.5 truncate pl-9 text-[10px] text-muted-foreground">{pageSubtitle}</p>}
          </div>

          <div className="flex min-w-0 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4 sm:py-3">
            <div className="hidden min-w-0 flex-1 overflow-hidden md:block">
              <h1 className="page-title truncate">{pageTitle}</h1>
              {pageSubtitle && <p className="page-subtitle truncate">{pageSubtitle}</p>}
            </div>

            <div className="ml-auto flex max-w-full shrink-0 items-center gap-0.5 sm:gap-1.5">
              {user?.role && mode === "admin" && (
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
                  aria-label={refreshing ? "Refreshing" : "Refresh"}
                >
                  <NavIcon name="refresh" className={`h-3.5 w-3.5 text-muted-foreground md:h-4 md:w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              )}
              <ThemeToggle compact className="md:hidden" />
              <ThemeToggle className="hidden md:inline-flex" />
              <LanguageSelector compact className="hidden min-[480px]:inline-flex" />
              <div className="relative">
                <button type="button" onClick={() => setUserOpen((v) => !v)} aria-label="Account">
                  <UserAvatar user={user} size={36} />
                </button>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="invest-main-scroll flex-1 overflow-y-auto">
          <div className="invest-page-main">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
          <footer className="hidden border-t border-border px-4 py-3 text-center text-[10px] text-muted-foreground md:block">
            © {new Date().getFullYear()} Akshaya Exim Traders · <Link to="/privacy" className="hover:text-primary">Privacy</Link> · <Link to="/contact" className="hover:text-primary">Support</Link>
          </footer>
        </main>
      </div>

      <nav className="invest-mobile-nav fixed bottom-0 left-0 right-0 z-40 flex border-t backdrop-blur-xl md:hidden">
        {mobilePrimary.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${navIconBg(item.color)} ${active ? "ring-2 ring-primary/35" : ""}`}>
                <NavIcon name={item.icon} className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${navIconFg(item.color)}`} />
              </span>
              <span className="max-w-[4.5rem] truncate">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${mobileOpen ? "text-primary" : "text-muted-foreground"}`}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${mobileOpen ? "bg-primary/15 ring-2 ring-primary/35" : "bg-muted/60"}`}>
            <NavIcon name="more" className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${mobileOpen ? "text-primary" : ""}`} />
          </span>
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
