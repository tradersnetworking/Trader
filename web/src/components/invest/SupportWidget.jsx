import { Link } from "react-router-dom";
import { investPath } from "../../lib/site.js";

export default function SupportWidget() {
  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6">
      <Link
        to={investPath("/dashboard?tab=support")}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
        title="Support"
        aria-label="Open support"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
      </Link>
    </div>
  );
}
