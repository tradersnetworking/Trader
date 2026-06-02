import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { inr } from "../../lib/format.js";
import PlanCard from "../../components/PlanCard.jsx";
import SubscribeModal from "../../components/SubscribeModal.jsx";
import { PLAN_TYPES, PLAN_CAPITAL, sortPlansByTier, tierRoiFromPlans } from "../../lib/plan-types.js";
import { investPath } from "../../lib/site.js";
import { BRAND_INVEST, normalizeInvestBrandingText } from "../../lib/brand.js";
import MobileAppDownload from "../../components/invest/MobileAppDownload.jsx";
import { useI18n } from "../../lib/i18n/context.jsx";
import {
  InvestLandingHero,
  InvestLandingStats,
  InvestLandingFeatures,
  InvestLandingPaymentMethods,
  InvestLandingTrustCta,
} from "../../components/invest/landing/InvestLandingSections.jsx";

/**
 * Invest subdomain landing — Kuber layout, investment-only sections.
 * Excludes: copy trading, MT4/MT5, staking, algo, EA, crypto exchange.
 * Plan catalog: 42 plans from server (6 tiers × 7 lock-ins) — unchanged.
 */
export default function InvestHome() {
  const { invest } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [highlightPlanId, setHighlightPlanId] = useState("");
  const [sub, setSub] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [partners, setPartners] = useState([]);
  const [cms, setCms] = useState(null);

  useEffect(() => {
    investApi("/public/plans")
      .then((d) => setPlans(sortPlansByTier(d.plans || [])))
      .catch(() => {});
    investApi("/public/maintenance").then(setMaintenance).catch(() => {});
    investApi("/public/partners").then((d) => setPartners(d.partners || [])).catch(() => {});
    investApi("/public/homepage").then((d) => setCms(d.homepage || {})).catch(() => {});
  }, []);

  useEffect(() => {
    const planId = searchParams.get("plan");
    const ref = searchParams.get("ref");
    if (planId) setHighlightPlanId(planId);
    if (ref) {
      const code = ref.trim().toUpperCase();
      try {
        localStorage.setItem("invest_ref", code);
      } catch {}
      fetch("/api/invest/public/referral/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, event: "CLICK" }),
      }).catch(() => {});
    }
    if (planId || window.location.hash === "#plans") {
      requestAnimationFrame(() => {
        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [searchParams, plans.length]);

  const onSubscribe = (plan) => {
    if (!invest) return nav(investPath("/login"));
    setSub(plan);
  };

  return (
    <div className="min-w-0 overflow-x-clip">
      {maintenance?.enabled && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">{maintenance.message}</div>
      )}

      <InvestLandingHero cms={cms} invest={invest} />
      <InvestLandingStats cms={cms} plans={plans} />
      <InvestLandingFeatures />

      <section id="plans" className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
        <div className="text-center">
          <span className="badge border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {t("home.plansBadge")}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl md:text-4xl">
            {t("home.plansTitle")} <span className="gold-text">{t("home.plansTitleGold")}</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t("home.plansSubtitle")}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {PLAN_TYPES.map((tierKey) => (
            <span key={tierKey} className="badge bg-muted text-muted-foreground">
              {tierKey}: {PLAN_CAPITAL[tierKey].label}
            </span>
          ))}
        </div>
        {PLAN_TYPES.map((tier) => {
          const tierPlans = plans.filter((p) => p.planType === tier);
          if (!tierPlans.length) return null;
          return (
            <div key={tier} className="mt-10">
              <h3 className="mb-1 text-lg font-bold text-foreground">
                {tier} • {PLAN_CAPITAL[tier].label}
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {(() => {
                  const { monthlyLabel, annualLabel } = tierRoiFromPlans(tierPlans);
                  return (
                    <>
                      {monthlyLabel}% {t("home.monthlyRoi")} · {annualLabel}% {t("home.annualRoi")}
                    </>
                  );
                })()}
              </p>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
                {tierPlans.map((p) => (
                  <div
                    key={p.id}
                    id={highlightPlanId === p.id ? "highlight-plan" : undefined}
                    className={`min-w-[17rem] shrink-0 snap-start sm:min-w-0 ${highlightPlanId === p.id ? "rounded-2xl ring-2 ring-gold ring-offset-2 ring-offset-background" : ""}`}
                  >
                    <PlanCard plan={p} onSubscribe={onSubscribe} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {plans.length === 0 && <p className="mt-8 text-center text-muted-foreground">{t("home.loadingPlans")}</p>}
        <div className="mx-auto mt-10 max-w-md">
          <MobileAppDownload compact />
        </div>
      </section>

      {cms?.homepage_show_calculator !== "false" && <Calculator plans={plans} t={t} />}

      <InvestLandingPaymentMethods />

      {(cms?.homepage_about_title || cms?.homepage_about_body) && (
        <section id="about" className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            {normalizeInvestBrandingText(cms.homepage_about_title) || `About ${BRAND_INVEST}`}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {normalizeInvestBrandingText(cms.homepage_about_body) ||
              `${BRAND_INVEST} offers structured investment plans with transparent ROI, secure capital protection, and dedicated support for every investor.`}
          </p>
          {cms.about_company_credentials && (
            <p className="mt-3 text-sm text-muted-foreground">{normalizeInvestBrandingText(cms.about_company_credentials)}</p>
          )}
        </section>
      )}

      {cms?.homepage_show_partners !== "false" && partners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-foreground">{t("home.trustedPartners")}</h2>
            <p className="text-muted-foreground">{t("home.partnersSubtitle")}</p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
            {partners.map((p) => (
              <a
                key={p.id}
                href={p.website || "#"}
                target={p.website ? "_blank" : undefined}
                rel="noreferrer"
                className="flex flex-col items-center gap-2 opacity-80 transition hover:opacity-100"
              >
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt={p.name} className="h-12 max-w-[8rem] object-contain" />
                ) : (
                  <span className="text-lg font-bold text-foreground">{p.name}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      <InvestLandingTrustCta invest={invest} />

      {sub && (
        <SubscribeModal
          plan={sub}
          onClose={() => setSub(null)}
          onDone={() => {
            setSub(null);
            nav(investPath("/dashboard"));
          }}
        />
      )}
    </div>
  );
}

function Calculator({ plans, t }) {
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [amountErr, setAmountErr] = useState("");
  const plan = plans.find((p) => p.id === planId);

  useEffect(() => {
    if (plans.length && !planId) {
      setPlanId(plans[0].id);
      setAmount(String(plans[0].minInvestment));
    }
  }, [plans]);

  useEffect(() => {
    if (!planId || !plan) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < plan.minInvestment || amt > plan.maxInvestment) {
      setAmountErr(
        t("home.amountBetween").replace("{min}", inr(plan.minInvestment)).replace("{max}", inr(plan.maxInvestment))
      );
      setResult(null);
      return;
    }
    setAmountErr("");
    investApi(`/public/plans/${planId}/calc?amount=${amt}`).then(setResult).catch(() => setResult(null));
  }, [planId, amount, plan]);

  return (
    <section id="calculator" className="border-t border-border bg-muted/20 px-4 py-14 dark:bg-white/[0.02] sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">{t("home.calculatorTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.calculatorSubtitle")}</p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card space-y-4 p-6">
            <div>
              <label className="label">{t("home.selectPlan")}</label>
              <select
                className="input"
                value={planId}
                onChange={(e) => {
                  const p = plans.find((x) => x.id === e.target.value);
                  setPlanId(e.target.value);
                  if (p) setAmount(String(p.minInvestment));
                }}
              >
                {PLAN_TYPES.map((tier) => {
                  const tierPlans = plans.filter((p) => p.planType === tier);
                  if (!tierPlans.length) return null;
                  return (
                    <optgroup key={tier} label={`${tier} — ${PLAN_CAPITAL[tier].label}`}>
                      {tierPlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} • {p.monthlyRoiPct}%/mo
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">{t("home.investmentAmount")}</label>
              <input
                className="input"
                type="number"
                min={plan?.minInvestment}
                max={plan?.maxInvestment}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={plan ? `Min ${inr(plan.minInvestment)}` : "Enter amount"}
              />
            </div>
            {plan && (
              <p className="text-xs text-muted-foreground">
                {t("home.calcMinMaxLock")
                  .replace("{min}", inr(plan.minInvestment))
                  .replace("{max}", inr(plan.maxInvestment))
                  .replace("{days}", plan.lockInDays)}
              </p>
            )}
            {amountErr && <p className="text-xs text-rose-500">{amountErr}</p>}
          </div>
          <div className="card p-6">
            {result ? (
              <div className="space-y-3">
                <Row label={t("home.calcMonthlyReturn")} value={inr(result.monthlyReturn)} big />
                <Row label={t("home.calcMonthlyRoi")} value={`${result.monthlyRoiPct}%`} />
                <Row label={t("home.calcAnnualRoi")} value={`${result.annualRoiPct}%`} />
                <hr className="border-border" />
                <Row label={t("home.calcLockInProfit").replace("{months}", result.lockInMonths)} value={inr(result.totalSimpleProfit)} />
                <p className="text-xs text-muted-foreground">{t("home.calcDisclaimer")}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">{t("home.enterValidAmount")}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, big, accent }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-bold ${big ? "text-xl text-foreground sm:text-2xl" : accent ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
