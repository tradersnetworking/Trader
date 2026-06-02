import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { api, setToken } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { investPath } from "../../lib/site.js";

/** Completes cross-origin staff SSO (invest ↔ marketplace). */
export default function StaffHandoffScreen({ scope }) {
  const [params] = useSearchParams();
  const { loginMain, loginInvest } = useAuth();
  const [err, setErr] = useState("");

  const code = params.get("code") || "";
  const next = params.get("next") || "/admin";

  useEffect(() => {
    if (!code) {
      setErr("Missing sign-in link. Please log in again.");
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await api(scope, "/auth/staff-handoff/complete", {
          method: "POST",
          body: { code },
        });
        if (!active) return;

        setToken(scope, res.token);
        flushSync(() => {
          if (scope === "main") loginMain(res.token, res.user);
          else loginInvest(res.token, res.user);
        });

        const path = next.startsWith("/") ? next : `/${next}`;
        window.location.replace(path);
      } catch (e) {
        if (active) {
          setErr(e.message || "Sign-in link expired. Log in on the other portal and try again.");
        }
      }
    })();

    return () => {
      active = false;
    };
    // login handlers intentionally omitted — they change after flushSync and must not re-run this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, code, next]);

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
