import { Link } from "react-router-dom";
import { Logo } from "./ui.jsx";

/**
 * Brand header: full Akshaya EXIM TRADERS logo (default) or compact mark + text.
 */
export default function BrandMark({
  to = "/",
  line1 = "Akshaya Exim",
  line2 = "Traders",
  line2Gold = true,
  subtitle,
  onDark = false,
  compact = false,
  grow = false,
  fullLogo = true,
  className = "",
}) {
  const fullLogoClass = compact
    ? "h-12 w-auto max-w-[7.5rem] sm:h-14 sm:max-w-[8.5rem]"
    : "h-14 w-auto max-w-[8.5rem] sm:h-16 sm:max-w-[10rem] lg:max-w-[11rem]";

  const inner = fullLogo ? (
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
    <div className={`flex min-w-0 max-w-full items-center gap-2 ${className}`}>
      <Logo
        variant="mark"
        className={compact ? "h-7 w-7 shrink-0 sm:h-8 sm:w-8" : "h-8 w-8 shrink-0 sm:h-9 sm:w-9"}
      />
      <div className="min-w-0 truncate leading-tight">
        <div className={`truncate font-extrabold ${compact ? "text-sm" : "text-sm sm:text-base"}`}>
          <span className={onDark ? "text-white" : "text-foreground"}>{line1}</span>
          {line2 && (
            <>
              {" "}
              <span className={line2Gold ? "gold-text" : onDark ? "text-slate-300" : "text-muted-foreground"}>
                {line2}
              </span>
            </>
          )}
        </div>
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
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={`block min-w-0 max-w-full overflow-hidden no-underline ${grow ? "flex-1" : "shrink-0"}`}>
        {inner}
      </Link>
    );
  }

  return inner;
}
