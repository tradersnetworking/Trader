import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { investPath } from "../../lib/site.js";
import { useI18n } from "../../lib/i18n/context.jsx";
import { sessionGet, sessionSet } from "../../lib/browserStorage.js";

const STORAGE_KEY = "aex_cookie_consent";

export default function CookieConsent() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!sessionGet(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      sessionSet(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md sm:rounded-xl sm:border">
      <p className="text-sm text-muted-foreground">{t("cookie.message")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-gold px-4 py-2 text-sm" onClick={accept}>
          {t("cookie.accept")}
        </button>
        <Link to={investPath("/cookie-policy")} className="text-sm font-semibold text-primary hover:underline">
          {t("cookie.learnMore")}
        </Link>
      </div>
    </div>
  );
}
