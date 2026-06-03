const SIZE_CLASSES = {
  sm: "text-xs sm:text-sm",
  mobile: "text-sm leading-none sm:text-base",
  mobileBar: "text-[clamp(0.75rem,3.8vw,1.125rem)] leading-none tracking-tight",
  default: "text-sm sm:text-base md:text-lg",
  lg: "text-base sm:text-lg md:text-xl",
  hero: "text-base leading-none sm:text-lg sm:leading-tight md:text-xl lg:text-2xl",
};

/** Akshaya (amber gold) + EXIM TRADERS (white) — main marketplace wordmark. */
export default function MainSiteTitle({ className = "", size = "default" }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.default;
  const fillBar = size === "mobileBar";
  return (
    <span
      className={`whitespace-nowrap font-extrabold ${fillBar ? "block w-full leading-none" : "leading-tight"} ${sizeClass} ${className}`.trim()}
    >
      <span className="brand-akshaya-text">Akshaya</span>{" "}
      <span className="brand-exim-text">EXIM TRADERS</span>
    </span>
  );
}
