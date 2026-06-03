import { INVEST_SITE_TITLE_1, INVEST_SITE_TITLE_2 } from "../lib/brand.js";

const SIZE_CLASSES = {
  sm: "text-xs sm:text-sm",
  mobile: "text-sm leading-none sm:text-base",
  /** Fills mobile header width; height kept tight via leading-none + clamp. */
  mobileBar: "text-[clamp(0.75rem,3.8vw,1.125rem)] leading-none tracking-tight",
  default: "text-sm sm:text-base md:text-lg",
  lg: "text-base sm:text-lg md:text-xl",
  hero: "text-base leading-none sm:text-lg sm:leading-tight md:text-xl lg:text-2xl",
};

/** Akshaya (gold) + Investments (silver) — invest portal header title. */
export default function InvestSiteTitle({ className = "", size = "default" }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.default;
  const fillBar = size === "mobileBar";
  return (
    <span
      className={`whitespace-nowrap font-extrabold ${fillBar ? "block w-full leading-none" : "leading-tight"} ${sizeClass} ${className}`.trim()}
    >
      <span className="gold-text">{INVEST_SITE_TITLE_1}</span>{" "}
      <span className="silver-text">{INVEST_SITE_TITLE_2}</span>
    </span>
  );
}
