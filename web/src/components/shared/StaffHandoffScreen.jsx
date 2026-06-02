import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { investPath } from "../../lib/site.js";

/** Completes cross-origin staff SSO (invest ↔ marketplace). */
export default function StaffHandoffScreen({ scope }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginMain, loginInvest } = useAuth();
  const [err, setErr] = useState("");
  const startedRef = useRef(false);

  const code = params.get("code") || "";
  const next = params.get("next") || "/admin";

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    (async () => {
      if (!code) {
        setErr("Missing sign-in link. Please log in again.");
        return;
      }
      try {
        const res = await api(scope, "/auth/staff-handoff/complete", {
          method: "POST",
          body: { code },
        });
        if (cancelled) return;
        if (scope === "main") loginMain(res.token, res.user);
        else loginInvest(res.token, res.user);
        const path = next.startsWith("/") ? next : `/${next}`;
        navigate(path, { replace: true });
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || "Sign-in link expired. Log in on the other portal and try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, code, next, loginMain, loginInvest, navigate]);

  const loginPath = scope === "invest" ? investPath("/staff-login") : "/staff-login";

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      {!err ? (
        <p className="text-muted-foreground">Opening dashboard…</p>
      ) : (
        <>
          <p className="text-destructive mb-4">{err}</p>
          <a href={loginPath} className="btn-gold">
            Staff login
          </a>
        </>
      )}
    </div>
  );
}
