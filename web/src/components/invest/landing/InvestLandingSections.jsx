import { Link } from "react-router-dom";
import { investPath, investHash } from "../../../lib/site.js";
import { INVEST_HERO_SUBTITLE, resolveInvestHeroSubtitle } from "../../../lib/brand.js";
import { planRoiRange, formatRoiPct } from "../../../lib/plan-types.js";
import { useI18n } from "../../../lib/i18n/context.jsx";
import BrandMark from "../../BrandMark.jsx";

const FEATURE_KEYS = [
  { icon: "📊", titleKey: "feature42Plans", descKey: "feature42Desc", bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400" },
  { icon: "🛡️", titleKey: "featureCapital", descKey: "featureCapitalDesc", bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400" },
  { icon: "💰", titleKey: "featureMonthly", descKey: "featureMonthlyDesc", bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400" },
  { icon: "✅", titleKey: "featureKyc", descKey: "featureKycDesc", bg: "bg-violet-500/10", color: "text-violet-600 dark:text-violet-400" },
  { icon: "🔗", titleKey: "featureReferral", descKey: "featureReferralDesc", bg: "bg-cyan-500/10", color: "text-cyan-600 dark:text-cyan-400" },
  { icon: "🔐", titleKey: "featureSecurity", descKey: "featureSecurityDesc", bg: "bg-pink-500/10", color: "text-pink-600 dark:text-pink-400" },
];

export function InvestLandingFeatures() {
  const { t } = useI18n();
  return (
    <section id="features" className="relative overflow-hidden px-4 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-14">
          <span className="badge border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {t("home.featuresBadge")}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl md:text-4xl">
            {t("home.featuresTitle")} <span className="gold-text">{t("home.featuresTitleGold")}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t("home.featuresSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {FEATURE_KEYS.map((f) => (
            <article
              key={f.titleKey}
              className="rounded-2xl border border-border bg-card/80 p-5 transition hover:border-amber-500/30 hover:shadow-md dark:bg-card/40"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${f.bg}`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground">{t(`landing.${f.titleKey}`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`landing.${f.descKey}`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InvestLandingStats({ cms, plans = [] }) {
  const { t } = useI18n();
  if (cms?.homepage_show_trust_stats === "false") return null;
  const roi = planRoiRange(plans);
  const stats = [
    {
      val: `${formatRoiPct(roi.monthlyMin)}%–${formatRoiPct(roi.monthlyMax)}%`,
      label: t("landing.statMonthlyRoi"),
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      val: `${formatRoiPct(roi.annualMin)}%–${formatRoiPct(roi.annualMax)}%`,
      label: t("landing.statAnnualRoi"),
      color: "text-emerald-600 dark:text-emerald-400",
    },
    { val: "42", label: t("landing.statPlans"), color: "text-blue-600 dark:text-blue-400" },
    { val: "100%", label: t("landing.statCapital"), color: "text-violet-600 dark:text-violet-400" },
  ];
  return (
    <section id="stats" className="border-y border-border bg-muted/50 py-8 dark:border-white/10 dark:bg-[#0a1220]/80 sm:py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 md:grid-cols-4 md:gap-8">
        {stats.map(({ val, label, color }) => (
          <div key={label} className="rounded-xl border border-transparent px-2 py-3 text-center dark:border-white/8 dark:bg-white/[0.04]">
            <div className={`text-2xl font-extrabold sm:text-3xl md:text-4xl ${color}`}>{val}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-300 sm:text-xs">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const METHODS = [
  { name: "UPI", desc: "GPay, PhonePe, Paytm" },
  { name: "IMPS / NEFT / RTGS", desc: "All major banks" },
  { name: "Razorpay", desc: "Cards & net banking" },
  { name: "Cashfree", desc: "UPI & cards" },
  { name: "PayU", desc: "Cards, UPI, NB" },
  { name: "Easebuzz", desc: "UPI & net banking" },
  { name: "HDFC API", desc: "Corporate banking" },
  { name: "Axis / ICICI / Yes", desc: "Bank API checkout" },
  { name: "Manual Transfer", desc: "Upload proof & approve" },
];

export function InvestLandingPaymentMethods() {
  const { t } = useI18n();
  return (
    <section id="payment-methods" className="border-t border-border bg-muted/30 px-4 py-14 dark:bg-white/[0.02] sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            {t("landing.paymentTitle")} <span className="gold-text">{t("landing.paymentTitleGold")}</span> in INR
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t("landing.paymentSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 sm:gap-4">
          {METHODS.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-border bg-card p-4 text-center shadow-sm dark:bg-card/60"
            >
              <div className="text-sm font-bold text-foreground">{m.name}</div>
              <div className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TRUST_CHIP_KEYS = ["trustKyc", "trustAgreements", "trustPayouts", "trustLedger"];

const TRUST_CHIP_ACCENTS = [
  { iconBg: "bg-emerald-500/15 dark:bg-emerald-500/10", iconBorder: "border-emerald-500/30 dark:border-emerald-500/20", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { iconBg: "bg-blue-500/15 dark:bg-blue-500/10", iconBorder: "border-blue-500/30 dark:border-blue-500/20", iconColor: "text-blue-600 dark:text-blue-400" },
  { iconBg: "bg-amber-500/15 dark:bg-amber-500/10", iconBorder: "border-amber-500/30 dark:border-amber-500/20", iconColor: "text-amber-600 dark:text-amber-400" },
  { iconBg: "bg-purple-500/15 dark:bg-purple-500/10", iconBorder: "border-purple-500/30 dark:border-purple-500/20", iconColor: "text-purple-600 dark:text-purple-400" },
];

export function InvestLandingTrustCta({ invest }) {
  const { t } = useI18n();
  return (
    <section
      className="w-full border-t border-amber-500/25 px-4 py-10 dark:border-amber-500/20 sm:px-6 sm:py-14
        bg-gradient-to-b from-amber-50/90 via-white to-slate-50
        dark:from-[#050A14] dark:via-[#0a1220] dark:to-[#050A14]"
    >
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-amber-500/20 bg-white/90 shadow-sm backdrop-blur-sm dark:border-amber-500/15 dark:bg-[#0a1628]/60 dark:shadow-none sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_CHIP_KEYS.map((key, i) => {
            const accent = TRUST_CHIP_ACCENTS[i] ?? TRUST_CHIP_ACCENTS[0];
            const isLast = i === TRUST_CHIP_KEYS.length - 1;
            return (
              <div
                key={key}
                className={`flex min-w-0 items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5
                  ${!isLast ? "lg:border-r lg:border-amber-500/15" : ""}
                  ${i % 2 === 0 && i < 3 ? "sm:border-r sm:border-amber-500/15 lg:border-r-0" : ""}
                  ${i === 1 ? "lg:border-r lg:border-amber-500/15" : ""}
                  ${i === 2 ? "sm:border-r-0 lg:border-r lg:border-amber-500/15" : ""}
                  ${i < 2 ? "border-b border-amber-500/10 sm:border-b-0" : ""}
                  ${i >= 2 ? "border-b border-amber-500/10 lg:border-b-0" : ""}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg font-bold sm:h-11 sm:w-11 ${accent.iconBg} ${accent.iconBorder} ${accent.iconColor}`}
                >
                  ✓
                </span>
                <p className="text-[11px] font-bold uppercase leading-snug tracking-wide text-slate-700 dark:text-amber-100/95 sm:text-xs">
                  {t(`landing.${key}`)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center sm:mt-10">
          <div className="inline-block rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-5 py-3 shadow-lg shadow-amber-500/25 dark:border-amber-300/40 dark:shadow-amber-500/20 sm:px-8 sm:py-3.5">
            <p className="text-[11px] font-extrabold uppercase leading-snug tracking-wide text-slate-900 sm:text-sm">
              {t("home.trustCta")}
            </p>
          </div>
          <div className="mt-6">
            <Link
              to={invest ? investPath("/dashboard") : investPath("/register")}
              className="btn-gold inline-flex px-8 py-3 text-base"
            >
              {invest ? t("home.goToDashboard") : t("home.startInvestingNow")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function InvestLandingHero({ cms, invest }) {
  const { t } = useI18n();
  return (
    <section className="hero-gradient relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0,transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 text-center sm:py-16 md:py-20">
        <div className="mx-auto mb-4 flex justify-center sm:mb-6">
          <BrandMark to={investPath("")} investFullLogo brandSize="hero" onDark className="mx-auto" />
        </div>
        <span className="badge border border-amber-500/40 bg-amber-500/10 text-amber-300">
          {t("home.heroBadge")}
        </span>
        <h1 className="hero-title gold-text mx-auto mt-4 max-w-4xl font-extrabold leading-snug">
          {cms?.homepage_hero_title || t("home.heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base md:text-lg">
          {resolveInvestHeroSubtitle(cms?.homepage_hero_subtitle || t("home.heroSubtitle"))}
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 px-2 sm:flex-row sm:items-center sm:gap-4">
          {invest ? (
            <Link to={investPath("/dashboard")} className="btn-gold px-8 py-3 text-base sm:inline-flex">
              {t("home.goToDashboard")}
            </Link>
          ) : (
            <>
              <Link to={investPath("/register")} className="btn-gold px-8 py-3 text-base sm:inline-flex">
                {t("home.investNow")}
              </Link>
              <Link
                to={investPath("/login")}
                className="btn-outline border-white/30 bg-white/5 px-8 py-3 text-base text-white hover:bg-white/10 sm:inline-flex"
              >
                {t("home.signIn")}
              </Link>
            </>
          )}
          <a href={investHash("plans")} className="btn-outline border-white/30 bg-transparent px-8 py-3 text-base text-white hover:bg-white/10 sm:inline-flex">
            {t("home.viewPlans")}
          </a>
        </div>
      </div>
    </section>
  );
}
