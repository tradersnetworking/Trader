import { Link } from "react-router-dom";
import { Logo } from "../ui.jsx";
import { investPath } from "../../lib/site.js";

/** Left brand panel for invest auth pages (desktop). Invest-only stats — no trading. */
export default function AuthBrandPanel() {
  const stats = [
    ["Up to 36%", "Monthly ROI"],
    ["100%", "Capital Secured"],
    ["42", "Investment Plans"],
    ["INR", "Only Currency"],
  ];

  return (
    <div className="relative hidden overflow-hidden border-r border-border/80 bg-gradient-to-br from-[#050A14] to-[#0a1528] md:flex md:w-1/2 md:items-center md:justify-center md:p-12 dark:border-white/5">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />
      <div className="relative z-10 max-w-lg">
        <Link to={investPath("")} className="mb-8 block no-underline">
          <Logo variant="full" className="mb-6 h-24 w-auto max-w-[280px] lg:h-32 lg:max-w-[340px]" />
        </Link>
        <p className="text-xl font-light leading-relaxed text-slate-300">
          Smart investment. Secure future. Grow your wealth with AKASHYA INVESTMENTS structured plans — transparent ROI, flexible lock-ins, INR settlements.
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

export function AuthMobileBrand() {
  return (
    <div className="mb-5 flex flex-col items-center md:hidden">
      <Link to={investPath("")} className="block no-underline">
        <Logo variant="full" className="h-14 w-auto max-w-[220px] sm:h-16" />
      </Link>
      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Investment Portal
      </p>
    </div>
  );
}
