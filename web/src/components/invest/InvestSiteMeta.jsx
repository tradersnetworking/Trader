import { useEffect } from "react";
import { useSiteMode } from "../../lib/site.js";

function upsertMeta(name, content, attr = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function InvestSiteMeta() {
  const mode = useSiteMode();

  useEffect(() => {
    if (mode !== "invest") return;

    upsertMeta("robots", "noindex, nofollow, noarchive");
    upsertMeta("googlebot", "noindex, nofollow");
    upsertMeta("bingbot", "noindex, nofollow");

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();
  }, [mode]);

  return null;
}
