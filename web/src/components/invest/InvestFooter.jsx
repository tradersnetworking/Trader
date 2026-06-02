import { Link } from "react-router-dom";
import { Logo } from "../ui.jsx";
import { investHash, investPath } from "../../lib/site.js";
import { useI18n } from "../../lib/i18n/context.jsx";

export default function InvestFooter() {
  const { t } = useI18n();
  return (
    <footer className="hero-gradient mt-12 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo className="h-16 w-auto max-w-[9rem] sm:h-20 sm:max-w-[11rem]" variant="full" />
          <p className="mt-3 text-sm">
            Transparent investment plans with secure capital and consistent monthly returns in INR.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t("layout.investNow")}</h4>
          <ul className="space-y-2 text-sm">
            <li><a href={investHash("plans")} className="hover:text-gold">{t("nav.plans")}</a></li>
            <li><a href={investHash("calculator")} className="hover:text-gold">{t("layout.calculator")}</a></li>
            <li><Link to={investPath("/register")} className="hover:text-gold">{t("auth.register")}</Link></li>
            <li><Link to={investPath("/dashboard")} className="hover:text-gold">{t("layout.dashboard")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t("nav.support")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to={investPath("/dashboard?tab=support")} className="hover:text-gold">{t("nav.support")}</Link></li>
            <li><a href="mailto:support@akshayaexim.com" className="hover:text-gold">support@akshayaexim.com</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to={investPath("/privacy")} className="hover:text-gold">{t("footer.privacy")}</Link></li>
            <li><Link to={investPath("/terms")} className="hover:text-gold">{t("footer.terms")}</Link></li>
            <li><Link to={investPath("/cookie-policy")} className="hover:text-gold">{t("footer.cookies")}</Link></li>
            <li><Link to={investPath("/risk-disclosure")} className="hover:text-gold">Risk Disclosure</Link></li>
            <li><Link to={investPath("/aml-policy")} className="hover:text-gold">AML / KYC</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Akshaya Exim Traders. {t("footer.rights")} Returns subject to plan policies.
      </div>
    </footer>
  );
}
