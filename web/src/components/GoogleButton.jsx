import { useEffect, useRef, useState } from "react";
import { loadMainSiteConfig } from "./main/MainSiteMeta.jsx";

const ENV_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function GoogleButton({ onCredential, scope = "main" }) {
  const ref = useRef(null);
  const [clientId, setClientId] = useState(ENV_CLIENT_ID);
  const [enabled, setEnabled] = useState(Boolean(ENV_CLIENT_ID));

  useEffect(() => {
    if (scope !== "main") return;
    loadMainSiteConfig().then((cfg) => {
      if (cfg?.googleClientId) setClientId(cfg.googleClientId);
      if (cfg?.googleLoginEnabled === false) setEnabled(false);
      else if (cfg?.googleClientId) setEnabled(true);
    }).catch(() => {});
  }, [scope]);

  useEffect(() => {
    if (!clientId || !enabled || !window.google || !ref.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp) => onCredential(resp.credential),
    });
    ref.current.innerHTML = "";
    window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", width: 320, text: "continue_with" });
  }, [clientId, enabled, onCredential]);

  if (!enabled || !clientId) {
    return (
      <button type="button" disabled className="btn-outline w-full opacity-60" title="Google login not configured — Super Admin can enable under Site & SEO">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.7-9.9 6.7-17.4z"/><path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.3-5.7c-2 1.4-4.6 2.2-7.7 2.2-6.4 0-11.7-3.7-13.6-9.1l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
        Continue with Google
      </button>
    );
  }
  return <div ref={ref} className="flex justify-center" />;
}
