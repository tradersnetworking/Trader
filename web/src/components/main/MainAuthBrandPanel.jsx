import { Link } from "react-router-dom";
import BrandMark from "../BrandMark.jsx";
import { Logo } from "../ui.jsx";
import { MAIN_SITE_TAGLINE } from "../../lib/brand.js";

/** Left brand panel for main marketplace auth pages (desktop). */
export default function MainAuthBrandPanel() {
  const stats = [
    ["50+", "Product Categories"],
    ["B2B & B2C", "Trade Modes"],
    ["Global", "Export & Import"],
    ["RFQ", "Quote Engine"],
  ];

  return (
    <div className="relative hidden overflow-hidden border-r border-border/80 bg-gradient-to-br from-[#050A14] to-[#0a1528] md:flex md:w-1/2 md:items-center md:justify-center md:p-12 dark:border-white/5">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="relative z-10 max-w-lg">
        <Link to="/" className="mb-8 block no-underline">
          <Logo brand="main" variant="full" className="mb-6 max-h-28 w-auto max-w-[min(100%,320px)] object-contain lg:max-h-32" />
        </Link>
        <p className="text-xl font-light leading-relaxed text-slate-300">
          Global export & import of agricultural products, FMCG, metals, chemicals, medical supplies, and industrial goods — B2B and B2C across India and abroad.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-6">
          {stats.map(([val, lbl]) => (
            <div key={lbl} className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="mb-1 text-2xl font-bold text-amber-500">{val}</div>
              <div className="text-sm text-slate-400">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MainAuthMobileBrand() {
  return (
    <div className="mb-4 flex justify-center md:hidden">
      <BrandMark
        to="/"
        line1="Akshaya"
        line2="EXIM TRADERS"
        line1Silver
        showLogoImage
        brand="main"
        brandSize="lg"
        titleBesideLogo
        subtitle={MAIN_SITE_TAGLINE}
        onDark
      />
    </div>
  );
}
