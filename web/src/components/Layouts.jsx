import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./ui.jsx";
import { useAuth } from "../lib/store.jsx";
import { ThemeToggle } from "../lib/theme.jsx";

function Brand({ to, title, sub }) {
  return (
    <Link to={to} className="flex min-w-0 items-center gap-2 sm:gap-3">
      <Logo className="h-10 w-10 shrink-0 rounded-full bg-black/30 p-0.5" />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-extrabold sm:text-lg">{title}</div>
        <div className="truncate text-[9px] uppercase tracking-[0.2em] text-slate-300 sm:text-[10px]">{sub}</div>
      </div>
    </Link>
  );
}

function Shell({ brand, links, actions }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="hero-gradient text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        {brand}
        <nav className="hidden items-center gap-5 lg:flex">{links}</nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">{actions}</div>
          <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-white/30 bg-white/10 p-2 lg:hidden" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 px-3 pb-4 lg:hidden">
          <nav className="flex flex-col gap-1 py-2" onClick={() => setOpen(false)}>{links}</nav>
          <div className="flex flex-wrap gap-2" onClick={() => setOpen(false)}>{actions}</div>
        </div>
      )}
    </header>
  );
}

export function MarketplaceLayout({ children }) {
  const { main, logoutMain } = useAuth();
  const nav = useNavigate();
  const dashHref = main && ["ADMIN", "SUPERADMIN", "STAFF"].includes(main.role) ? "/admin" : "/dashboard";
  const links = (
    <>
      <Link to="/products?listingType=EXPORT" className="text-sm font-medium text-slate-200 hover:text-gold">Export</Link>
      <Link to="/products?listingType=IMPORT" className="text-sm font-medium text-slate-200 hover:text-gold">Import</Link>
      <Link to="/products" className="text-sm font-medium text-slate-200 hover:text-gold">All Products</Link>
      <Link to="/sell" className="text-sm font-medium text-slate-200 hover:text-gold">Supply / Sell</Link>
      <a href="/invest" className="text-sm font-semibold text-gold hover:text-gold-400">Invest →</a>
    </>
  );
  const actions = main ? (
    <>
      <Link to={dashHref} className="btn-gold">Dashboard</Link>
      <button onClick={() => { logoutMain(); nav("/"); }} className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">Logout</button>
    </>
  ) : (
    <>
      <Link to="/login" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">Login</Link>
      <Link to="/register" className="btn-gold">Register</Link>
    </>
  );
  return (
    <div className="flex min-h-full flex-col">
      <Shell brand={<Brand to="/" title={<>Akshaya <span className="gold-text">Exim</span></>} sub="Traders" />} links={links} actions={actions} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function InvestLayout({ children }) {
  const { invest, logoutInvest } = useAuth();
  const nav = useNavigate();
  const dashHref = invest && ["ADMIN", "SUPERADMIN"].includes(invest.role) ? "/invest/admin" : "/invest/dashboard";
  const links = (
    <>
      <a href="/invest#plans" className="text-sm font-medium text-slate-200 hover:text-gold">Plans</a>
      <a href="/invest#calculator" className="text-sm font-medium text-slate-200 hover:text-gold">Calculator</a>
      <Link to="/" className="text-sm font-semibold text-gold hover:text-gold-400">← Marketplace</Link>
    </>
  );
  const actions = invest ? (
    <>
      <Link to={dashHref} className="btn-gold">Dashboard</Link>
      <button onClick={() => { logoutInvest(); nav("/invest"); }} className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">Logout</button>
    </>
  ) : (
    <>
      <Link to="/invest/login" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">Login</Link>
      <Link to="/invest/register" className="btn-gold">Start Investing</Link>
    </>
  );
  return (
    <div className="flex min-h-full flex-col">
      <Shell brand={<Brand to="/invest" title={<>Akshaya <span className="gold-text">Invest</span></>} sub="Smart Investment" />} links={links} actions={actions} />
      <main className="flex-1">{children}</main>
      <Footer invest />
    </div>
  );
}

function Footer({ invest }) {
  return (
    <footer className="hero-gradient mt-12 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2"><Logo className="h-9 w-9 rounded-full bg-black/30 p-0.5" /><span className="font-bold text-white">Akshaya Exim Traders</span></div>
          <p className="mt-3 text-sm">Export & Import of agricultural products, FMCG, chemicals, machinery, metals, medical supplies, textiles & more. B2B & B2C, India & abroad.</p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Domains</h4>
          <ul className="space-y-1 text-sm">
            <li>akshayaexim.com</li><li>akshayaexim.in</li>
            <li>invest.akshayaexim.com</li><li>invest.akshayaexim.in</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Quick Links</h4>
          <ul className="space-y-1 text-sm">
            <li><Link to="/products" className="hover:text-gold">Products</Link></li>
            <li><Link to="/invest" className="hover:text-gold">Investment Plans</Link></li>
            <li><Link to="/login" className="hover:text-gold">User Login</Link></li>
            <li><Link to="/staff-login" className="hover:text-gold">Staff Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Trust</h4>
          <ul className="space-y-1 text-sm">
            <li>100% Capital Secured</li><li>24/7 Customer Support</li>
            <li>Transparent & Reliable</li><li>Multiple Payment Options</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Akshaya Exim Traders. {invest ? "Returns are subject to plan policies & market conditions. *T&C Apply." : "Invest Wisely. Earn Consistently. Build Wealth."}
      </div>
    </footer>
  );
}
