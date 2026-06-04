import { buildUpiAppLinks } from "../../lib/upi-qr.js";

/** Compact grid of UPI app launch buttons (avoids long single-button overflow on mobile). */
export default function UpiPayAppButtons({ vpa, payeeName, amount, className = "" }) {
  const all = buildUpiAppLinks(vpa, payeeName, amount);
  const links = all.filter((a) => a.id !== "upi");
  const generic = all.find((a) => a.id === "upi");

  if (!links.length) return null;

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {links.map((app) => (
          <a
            key={app.id}
            href={app.href}
            className="btn-gold flex min-w-0 items-center justify-center px-1.5 py-2.5 text-center text-[11px] font-semibold leading-tight sm:text-xs"
          >
            {app.label}
          </a>
        ))}
      </div>
      {generic && (
        <a
          href={generic.href}
          className="btn-outline flex w-full min-w-0 items-center justify-center px-2 py-2 text-center text-[11px] font-medium sm:text-xs"
        >
          Open in any UPI app
        </a>
      )}
    </div>
  );
}
