import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { investApi } from "../../lib/api.js";
import { useSiteMode } from "../../lib/site.js";
import { applyDocumentMeta, resolveInvestPageMeta, INVEST_HOME_DEFAULT } from "../../lib/shareMeta.js";

export default function InvestSiteMeta() {
  const mode = useSiteMode();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState(null);
  const [homepageCms, setHomepageCms] = useState({
    homepage_hero_title: INVEST_HOME_DEFAULT.title,
    homepage_hero_subtitle: INVEST_HOME_DEFAULT.description,
  });

  const planId = searchParams.get("plan");
  const refCode = searchParams.get("ref") || "";

  useEffect(() => {
    if (mode !== "invest") return;
    investApi("/public/homepage")
      .then((d) => {
        const h = d.homepage || {};
        const title = h.homepage_hero_title || "";
        const sub = h.homepage_hero_subtitle || "";
        const staleMain =
          /marketplace|Global Export|B2B Marketplace/i.test(title) ||
          /marketplace|Global Export|export and import agricultural/i.test(sub) ||
          (!/INR/i.test(sub) && (/^Explore Akshaya/i.test(sub) || /EXIM TRADERS/i.test(sub))) ||
          /Invest with Akshaya Investments/i.test(sub) ||
          /Invest with Akashya Investments/i.test(sub) ||
          /AKASHYA INVESTMENTS/i.test(sub) ||
          /capital secured/i.test(sub);
        setHomepageCms(
          staleMain
            ? {
                ...h,
                homepage_hero_title: INVEST_HOME_DEFAULT.title,
                homepage_hero_subtitle: INVEST_HOME_DEFAULT.description,
              }
            : h
        );
      })
      .catch(() => {});
  }, [mode]);

  useEffect(() => {
    if (mode !== "invest" || !planId) {
      setPlan(null);
      return;
    }
    investApi("/public/plans")
      .then((d) => {
        const found = (d.plans || []).find((p) => p.id === planId);
        setPlan(found || null);
      })
      .catch(() => setPlan(null));
  }, [mode, planId]);

  useLayoutEffect(() => {
    if (mode !== "invest") return;

    const meta = resolveInvestPageMeta({
      pathname,
      plan,
      refCode,
      homepageCms,
      hasPlanQuery: Boolean(planId),
    });

    const shareUrl =
      meta.url ||
      (typeof window !== "undefined"
        ? pathname === "/" || pathname === ""
          ? `${window.location.origin}/`
          : window.location.href.split("#")[0]
        : undefined);

    applyDocumentMeta({
      ...meta,
      url: shareUrl,
      robots: "noindex, nofollow, noarchive",
    });
  }, [mode, pathname, plan, refCode, homepageCms, planId]);

  return null;
}
