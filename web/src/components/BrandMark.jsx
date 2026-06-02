import { Link } from "react-router-dom";
import { Logo } from "./ui.jsx";
import InvestSiteTitle from "./InvestSiteTitle.jsx";
import { INVEST_SITE_TITLE_1, INVEST_SITE_TITLE_2 } from "../lib/brand.js";

/**
 * Brand header: full Akshaya EXIM TRADERS logo (default) or compact mark + text.
 */
export default function BrandMark({
  to = "/",
  line1 = "AKSHAYA Exim",
  line2 = "Traders",
  line2Gold = true,
  /** line1 in gold (invest site title). */
  line1Gold = false,
  /** line2 in silver (invest site title). */
  line2Silver = false,
  /** Use Akshaya + Investments with gold/silver styling beside the mark. */
  investSiteTitle = false,
  subtitle,
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
  className = "",
}) {
  const scale = brandSize || (compact ? "sm" : "md");
  const mobileFill = mobileBarFill && scale === "lg";
  const titleSize = investSiteTitle
    ? scale === "hero"
      ? "hero"
      : scale === "lg"
        ? mobileFill
          ? "mobileBar"
          : "mobile"
        : scale === "md"
          ? "lg"
          : "sm"
    : compact
      ? "sm"
      : "default";
  const title1 = investSiteTitle ? INVEST_SITE_TITLE_1 : line1;
  const title2 = investSiteTitle ? INVEST_SITE_TITLE_2 : line2;
  const gold1 = investSiteTitle || line1Gold;
  const silver2 = investSiteTitle || line2Silver;
  const gold2 = !silver2 && line2Gold;
  const useBeside = titleBesideLogo || !fullLogo;
  const fullLogoClass = compact
    ? "h-8 w-auto max-w-[5.5rem] sm:h-9 sm:max-w-[6.5rem]"
    : "h-14 w-auto max-w-[8.5rem] sm:h-16 sm:max-w-[10rem] lg:max-w-[11rem]";
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

  const inner = !useBeside ? (
    <div className={`flex min-w-0 max-w-full flex-col gap-0.5 ${className}`}>
      <Logo variant="full" className={fullLogoClass} />
      {subtitle && (
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
        mobileFill
          ? "h-9 w-full max-w-full min-w-0 gap-2 px-0.5"
          : `w-max max-w-full shrink-0 ${
              scale === "lg" ? "gap-1.5" : scale === "hero" ? "gap-2 sm:gap-3 md:gap-4" : "gap-2 sm:gap-2.5"
            }`
      } ${className}`}
    >
      <Logo variant="mark" className={markClass} />
      <div className={`leading-none ${mobileFill ? "min-w-0 flex-1 text-center" : "shrink-0 leading-tight"}`}>
        {investSiteTitle ? (
          <InvestSiteTitle size={titleSize} />
        ) : (
          <div className={`truncate font-extrabold leading-none ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}>
            <span
              className={
                gold1 ? "gold-text" : onDark ? "text-white" : "text-foreground"
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
        {subtitle && (
          <div
            className={`truncate text-[8px] uppercase tracking-[0.14em] sm:text-[9px] ${
              onDark ? "text-slate-300" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`items-center no-underline ${
          mobileFill
            ? "flex h-9 w-full max-w-full min-w-0"
            : `inline-flex w-max max-w-full shrink-0 ${grow ? "min-w-0 flex-1" : ""}`
        }`}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
