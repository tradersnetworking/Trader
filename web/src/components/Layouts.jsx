import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "./BrandMark.jsx";
import { useAuth } from "../lib/store.jsx";
import { ThemeToggle } from "../lib/theme.jsx";
import LanguageSelector from "./invest/LanguageSelector.jsx";
import SupportWidget from "./invest/SupportWidget.jsx";
import CookieConsent from "./invest/CookieConsent.jsx";
import InvestFooter from "./invest/InvestFooter.jsx";
import PwaInstallBanner from "./invest/PwaInstallBanner.jsx";
import { Logo } from "./ui.jsx";
import { investHash, investPath, investUrl, mainUrl } from "../lib/site.js";
import { useI18n } from "../lib/i18n/context.jsx";

function Shell({ homeTo, brandLine1, brandLine2, brandSub, links, actions }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="hero-gradient sticky top-0 z-50 overflow-x-clip text-white shadow-md [&_a]:text-inherit">
      {/* Mobile — compact single bar: menu · logo+title · actions */}
      <div className="md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-md border border-white/30 bg-white/10 p-1.5"
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <BrandMark
            to={homeTo}
            line1={brandLine1}
            line2={brandLine2}
            subtitle={brandSub}
            onDark
            compact
            fullLogo={false}
            titleBesideLogo
            grow
            className="min-w-0 flex-1"
          />
          <ThemeToggle compact />
          <LanguageSelector compact variant="onDark" />
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        </div>
        {open && (
          <div className="border-t border-white/10 px-2 pb-2 pt-1">
            <nav className="flex flex-col gap-0.5 py-1" onClick={() => setOpen(false)}>
              {links}
            </nav>
          </div>
        )}
      </div>

      {/* Desktop — single row */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 px-4 py-3 md:flex lg:px-6">
        <BrandMark
          to={homeTo}
          line1={brandLine1}
          line2={brandLine2}
          subtitle={brandSub}
          onDark
          className="shrink-0 max-w-[min(100%,14rem)] lg:max-w-xs"
        />
        <nav className="flex items-center gap-5">{links}</nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LanguageSelector compact variant="onDark" />
          {actions}
        </div>
      </div>
    </header>
  );
}

export function MarketplaceLayout({ children }) {
  const { main, logoutMain } = useAuth();
  const nav = useNavigate();
  const dashHref = main && ["ADMIN", "SUPERADMIN", "STAFF"].includes(main.role) ? "/admin" : "/dashboard";

  const links = (
    <>
      <Link to="/categories" className="text-sm font-medium text-slate-200 hover:text-gold">
        Categories
      </Link>
      <Link to="/products?listingType=EXPORT" className="text-sm font-medium text-slate-200 hover:text-gold">
        Export
      </Link>
      <Link to="/products?listingType=IMPORT" className="text-sm font-medium text-slate-200 hover:text-gold">
        Import
      </Link>
      <Link to="/products" className="text-sm font-medium text-slate-200 hover:text-gold">
        Products
      </Link>
      <Link to="/sell" className="text-sm font-medium text-slate-200 hover:text-gold">
        Supply / Sell
      </Link>
    </>
  );

  const actions = main ? (
    <>
      <Link to={dashHref} className="btn-gold px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
        Dashboard
      </Link>
      <button
        type="button"
        onClick={() => {
          logoutMain();
          nav("/");
        }}
        className="btn-outline border-white/30 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <Link
        to="/login"
        className="btn-outline border-white/30 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
      >
        Login
      </Link>
      <Link to="/register" className="btn-gold px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
        Register
      </Link>
    </>
  );

  return (
    <div className="app-shell site-main-shell overflow-x-clip">
      <Shell
        homeTo="/"
        brandLine1="AKSHAYA Exim"
        brandLine2="Traders"
        brandSub="Global Export & Import"
        links={links}
        actions={actions}
      />
      <main className="app-content">{children}</main>
      <MarketplaceFooter />
    </div>
  );
}

export function InvestLayout({ children }) {
  const { invest, logoutInvest } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const home = investPath("");
  const dashHref = invest && ["ADMIN", "SUPERADMIN"].includes(invest.role) ? investPath("/admin") : investPath("/dashboard");

  const links = (
    <>
      <a href={investHash("plans")} className="text-sm font-medium text-slate-200 hover:text-gold">
        {t("layout.plans")}
      </a>
      <a href={investHash("calculator")} className="text-sm font-medium text-slate-200 hover:text-gold">
        {t("layout.calculator")}
      </a>
    </>
  );

  const actions = invest ? (
    <>
      <Link to={dashHref} className="btn-gold px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
        {t("layout.dashboard")}
      </Link>
      <button
        type="button"
        onClick={() => {
          logoutInvest();
          nav(home);
        }}
        className="btn-outline border-white/30 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
      >
        {t("layout.logout")}
      </button>
    </>
  ) : (
    <>
      <Link
        to={investPath("/login")}
        className="btn-outline border-white/30 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
      >
        {t("layout.login")}
      </Link>
      <Link to={investPath("/register")} className="btn-gold px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
        {t("layout.investNow")}
      </Link>
    </>
  );

  return (
    <div className="app-shell site-invest-shell">
      <Shell
        homeTo={home}
        brandLine1="AKSHAYA Exim"
        brandLine2="Invest"
        brandSub=""
        links={links}
        actions={actions}
      />
      <main className="app-content">{children}</main>
      <PwaInstallBanner />
      <SupportWidget />
      <InvestFooter />
      <CookieConsent />
    </div>
  );
}

function MarketplaceFooter() {
  return (
    <footer className="hero-gradient mt-12 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo className="h-16 w-auto max-w-[9rem] sm:h-20 sm:max-w-[11rem]" variant="full" />
          <p className="mt-3 text-sm">
            Global export & import of agricultural products, FMCG, chemicals, machinery, metals, medical supplies,
            textiles & more. B2B & B2C trade across India and abroad.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Trade</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/categories" className="hover:text-gold">
                Product Categories
              </Link>
            </li>
            <li>
              <Link to="/products?listingType=EXPORT" className="hover:text-gold">
                Export Products
              </Link>
            </li>
            <li>
              <Link to="/products?listingType=IMPORT" className="hover:text-gold">
                Import Requirements
              </Link>
            </li>
            <li>
              <Link to="/sell" className="hover:text-gold">
                Supply / Sell
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Company</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/about" className="hover:text-gold">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-gold">
                Contact Us
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-gold">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-gold">
                User Login
              </Link>
            </li>
            <li>
              <Link to="/staff-login" className="hover:text-gold">
                Staff / Admin Login
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Policies</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/privacy" className="hover:text-gold">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-gold">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/returns" className="hover:text-gold">
                Returns & Refunds
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            akshayaexim.com · akshayaexim.in ·{" "}
            <a href={investUrl("")} className="hover:text-gold">
              invest.akshayaexim.com
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Akshaya Exim Traders. Trade Globally. Grow Locally.
      </div>
    </footer>
  );
}
