import { Link } from "react-router-dom";
import { Logo } from "./ui.jsx";
import InvestSiteTitle from "./InvestSiteTitle.jsx";
import MainSiteTitle from "./MainSiteTitle.jsx";
import { INVEST_SITE_TITLE_1, INVEST_SITE_TITLE_2 } from "../lib/brand.js";

/**
 * Brand header: full Akshaya EXIM TRADERS logo (default) or compact mark + text.
 */
export default function BrandMark({
  to = "/",
  line1 = "AKASHYA EXIM",
  line2 = "TRADERS",
  line2Gold = true,
  /** line1 in gold (invest site title). */
  line1Gold = false,
  /** line1 in silver (main EXIM header). */
  line1Silver = false,
  /** line2 in silver (invest site title). */
  line2Silver = false,
  /** Use Akshaya + Investments with gold/silver styling beside the mark. */
  investSiteTitle = false,
  /** Use Akshaya (amber) + EXIM TRADERS (white) beside the mark. */
  mainSiteTitle = false,
  /** Show full AKSHYA invest artwork (hero/footer only). */
  investFullLogo = false,
  /** Header: use full PNG beside site title (invest or main). */
  showLogoImage = false,
  /** main | invest — which logo files to load. */
  brand = "main",
  subtitle,
  /** Main marketplace tagline in gold (header / hero on dark backgrounds). */
  subtitleGold = false,
  onDark = false,
  compact = false,
  /** Invest header scale: sm (sidebar) | md (desktop bar) | lg (mobile top bar). */
  brandSize,
  grow = false,
  fullLogo = true,
  /** Mobile/PWA: logo mark with site title beside it (not full-width image). */
  titleBesideLogo = false,
  /** Mobile header: span full width with larger mark + title (fixed bar height). */
  mobileBarFill = false,
  /** Logo on top, site title, then tagline — centered (main marketplace header/hero). */
  brandStacked = false,
  className = "",
}) {
  const useLogoImage = showLogoImage;
  const scale = brandSize || (compact ? "sm" : "md");
  const mobileFill = mobileBarFill && scale === "lg";
  const titleSize = investSiteTitle
    ? scale === "hero"
      ? "hero"
      : scale === "lg"
        ? mobileFill
          ? useLogoImage
            ? "mobile"
            : "mobileBar"
          : "mobile"
        : scale === "md"
          ? "lg"
          : "sm"
    : compact
      ? "sm"
      : "default";
  const title1 = investSiteTitle ? INVEST_SITE_TITLE_1 : line1;
  const title2 = investSiteTitle ? INVEST_SITE_TITLE_2 : line2;
  const gold1 = investSiteTitle || (line1Gold && !line1Silver);
  const silver1 = investSiteTitle || line1Silver;
  const silver2 = investSiteTitle || line2Silver;
  const gold2 = !silver2 && line2Gold;
  const logoBrand = investFullLogo || investSiteTitle ? "invest" : brand;
  const useStacked = brandStacked && !investFullLogo;
  const useBeside = !investFullLogo && !useStacked && (titleBesideLogo || !fullLogo);
  const showSubtitle = subtitle && (useStacked || !(compact && !mobileFill));
  const stackedLogoClass =
    scale === "hero"
      ? "max-h-16 w-auto max-w-[min(100%,12rem)] object-contain sm:max-h-20 sm:max-w-[14rem] md:max-h-24 md:max-w-[16rem]"
      : scale === "lg"
        ? "max-h-11 w-auto max-w-[min(100%,10rem)] object-contain sm:max-h-12"
        : "max-h-9 w-auto max-w-[min(100%,8.5rem)] object-contain sm:max-h-10 sm:max-w-[9.5rem]";
  const stackedTitleClass =
    scale === "hero"
      ? "text-base font-extrabold leading-tight sm:text-lg md:text-xl"
      : scale === "lg"
        ? "text-sm font-extrabold leading-tight sm:text-base"
        : "text-xs font-extrabold leading-tight sm:text-sm";
  const taglineClass = `truncate text-[8px] font-semibold uppercase tracking-[0.14em] sm:text-[9px] ${
    subtitleGold ? "gold-text" : onDark ? "text-slate-300" : "text-muted-foreground"
  }`;
  const fullLogoClass = investFullLogo
    ? mobileFill
      ? "max-h-10 w-auto max-w-[min(100%,11rem)] object-contain"
      : scale === "hero"
        ? "max-h-20 w-auto max-w-[min(100%,14rem)] object-contain sm:max-h-24 sm:max-w-[16rem]"
        : compact
          ? "max-h-9 w-auto max-w-[9rem] object-contain"
          : "max-h-12 w-auto max-w-[12rem] object-contain sm:max-h-14 sm:max-w-[14rem] md:max-h-16 md:max-w-[16rem]"
    : compact
      ? "h-8 w-auto max-w-[5.5rem] sm:h-9 sm:max-w-[6.5rem]"
      : "h-12 w-auto max-w-[11rem] sm:h-14 sm:max-w-[13rem] lg:max-w-[15rem]";
  const markClass =
    scale === "hero"
      ? "h-10 w-10 shrink-0 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16"
      : scale === "lg"
        ? mobileFill
          ? "h-9 w-9 shrink-0"
          : "h-8 w-8 shrink-0 sm:h-9 sm:w-9"
        : scale === "md"
          ? "h-9 w-9 shrink-0 sm:h-10 sm:w-10 md:h-11 md:w-11"
          : "h-7 w-7 shrink-0 sm:h-8 sm:w-8";

  const taglineEl =
    showSubtitle &&
    (subtitleGold ? (
      <span className="badge brand-akshaya-text max-w-full truncate border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-xs">
        {subtitle}
      </span>
    ) : (
      <div className={`${taglineClass} max-w-full`}>{subtitle}</div>
    ));

  const inner = investFullLogo ? (
    <div className={`flex min-w-0 max-w-full items-center justify-center ${mobileFill ? "w-full" : ""} ${className}`}>
      <Logo brand="invest" variant="full" className={fullLogoClass} />
    </div>
  ) : useStacked ? (
    <div
      className={`flex w-full min-w-0 max-w-full flex-col items-center gap-1 text-center sm:gap-1.5 ${
        scale === "hero" ? "sm:gap-2" : ""
      } ${className}`}
    >
      <Logo brand={logoBrand} variant="full" className={stackedLogoClass} />
      {investSiteTitle ? (
        <InvestSiteTitle size={titleSize} className="text-center" />
      ) : mainSiteTitle ? (
        <MainSiteTitle size={titleSize} className="text-center" />
      ) : (
        <div className={`${stackedTitleClass} max-w-full`}>
          <span className={gold1 ? "gold-text" : silver1 ? "silver-text" : onDark ? "text-white" : "text-foreground"}>
            {title1}
          </span>
          {title2 && (
            <>
              <br />
              <span
                className={
                  silver2 ? "silver-text" : gold2 ? "gold-text" : onDark ? "text-slate-300" : "text-muted-foreground"
                }
              >
                {title2}
              </span>
            </>
          )}
        </div>
      )}
      {taglineEl}
    </div>
  ) : !useBeside ? (
    <div className={`flex min-w-0 max-w-full flex-col gap-0.5 ${className}`}>
      <Logo brand={logoBrand} variant="full" className={fullLogoClass} />
      {showSubtitle && (
        <div
          className={`truncate text-[9px] uppercase tracking-[0.18em] sm:text-[10px] ${
            onDark ? "text-slate-300" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </div>
      )}
    </div>
  ) : (
    <div
      className={`flex items-center ${
        mobileFill ? "w-full min-w-0 gap-2" : `w-max max-w-full shrink-0 ${
          scale === "lg" ? "gap-1.5" : scale === "hero" ? "gap-2 sm:gap-3 md:gap-4" : "gap-2 sm:gap-2.5"
        }`
      } ${className}`}
    >
      {useLogoImage ? (
        <Logo
          brand={logoBrand}
          variant="full"
          className={
            mobileFill
              ? "max-h-10 w-auto max-w-[4.75rem] shrink-0 self-center object-contain"
              : scale === "hero"
                ? "max-h-16 w-auto max-w-[5.5rem] shrink-0 object-contain sm:max-h-20 sm:max-w-[7rem]"
                : "max-h-9 w-auto max-w-[4.25rem] shrink-0 object-contain"
          }
        />
      ) : (
        <Logo brand={logoBrand} variant="mark" className={`${markClass} self-center`} />
      )}
      <div
        className={`flex min-w-0 flex-col justify-center leading-none ${
          mobileFill ? "flex-1 gap-0.5 overflow-hidden" : "shrink-0 gap-0.5"
        }`}
      >
        {investSiteTitle ? (
          <InvestSiteTitle size={titleSize} />
        ) : mainSiteTitle ? (
          <MainSiteTitle size={titleSize} />
        ) : (
          <div
            className={`truncate font-extrabold leading-tight ${
              mobileFill ? "text-sm leading-none" : compact ? "text-[11px] leading-none sm:text-xs" : "text-sm sm:text-base"
            }`}
          >
            <span
              className={
                gold1 ? "gold-text" : silver1 ? "silver-text" : onDark ? "text-white" : "text-foreground"
              }
            >
              {title1}
            </span>
            {title2 && (
              <>
                {" "}
                <span
                  className={
                    silver2 ? "silver-text" : gold2 ? "gold-text" : onDark ? "text-slate-300" : "text-muted-foreground"
                  }
                >
                  {title2}
                </span>
              </>
            )}
          </div>
        )}
        {showSubtitle && <div className={`${taglineClass} text-left`}>{subtitle}</div>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`no-underline ${
          useStacked
            ? `flex w-full max-w-full min-w-0 items-center justify-center py-0.5`
            : mobileFill
              ? `flex w-full max-w-full min-w-0 items-center justify-start ${investFullLogo ? "min-h-11 py-0.5" : "py-0.5"}`
              : `inline-flex w-max max-w-full shrink-0 items-center ${grow ? "min-w-0 flex-1" : ""}`
        }`}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
