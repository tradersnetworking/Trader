import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, isAuthError, logoutScope } from "./api.js";
import { getHostKind, useSiteMode } from "./site.js";

const AuthContext = createContext(null);

/** Bumped on login/logout so stale in-flight /auth/me responses cannot clear a fresh session. */
const authEpoch = { main: 0, invest: 0 };

function shouldLoadScope(scope, mode, kind) {
  if (kind === "local") return true;
  if (scope === "main") return mode === "main";
  return mode === "invest";
}

export function AuthProvider({ children }) {
  const [main, setMain] = useState({ user: null, loading: true });
  const [invest, setInvest] = useState({ user: null, loading: true });
  const mode = useSiteMode();
  const kind = getHostKind();

  const loadMe = useCallback(async (scope, setter, { soft = false } = {}) => {
    const token = getToken(scope);
    if (!token) {
      setter({ user: null, loading: false });
      return;
    }
    const epoch = authEpoch[scope];
    const tokenAtStart = token;
    if (!soft) setter((prev) => ({ user: prev.user, loading: !prev.user }));
    try {
      const { user } = await api(scope, "/auth/me");
      if (authEpoch[scope] !== epoch || getToken(scope) !== tokenAtStart) return;
      setter({ user, loading: false });
    } catch (err) {
      if (authEpoch[scope] !== epoch || getToken(scope) !== tokenAtStart) return;
      if (isAuthError(err)) {
        if (err.code === "SESSION_SUPERSEDED") {
          sessionStorage.setItem(`aex_${scope}_session_msg`, err.message || "Signed in on another device.");
        }
        setToken(scope, "");
        setter({ user: null, loading: false });
      } else {
        setter((prev) => ({ user: prev.user, loading: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (shouldLoadScope("main", mode, kind)) {
      loadMe("main", setMain);
    } else if (!getToken("main")) {
      setMain({ user: null, loading: false });
    } else {
      setMain((prev) => ({ user: prev.user, loading: false }));
    }

    if (shouldLoadScope("invest", mode, kind)) {
      loadMe("invest", setInvest);
    } else if (!getToken("invest")) {
      setInvest({ user: null, loading: false });
    } else {
      setInvest((prev) => ({ user: prev.user, loading: false }));
    }
  }, [loadMe, mode, kind]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (shouldLoadScope("main", mode, kind) && getToken("main")) loadMe("main", setMain, { soft: true });
      if (shouldLoadScope("invest", mode, kind) && getToken("invest")) loadMe("invest", setInvest, { soft: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMe, mode, kind]);

  const value = {
    main: main.user,
    invest: invest.user,
    mainLoading: main.loading,
    investLoading: invest.loading,
    loginMain: (token, user) => {
      authEpoch.main += 1;
      setToken("main", token);
      setMain({ user, loading: false });
    },
    loginInvest: (token, user) => {
      authEpoch.invest += 1;
      setToken("invest", token);
      setInvest({ user, loading: false });
    },
    logoutMain: async () => {
      authEpoch.main += 1;
      await logoutScope("main");
      setMain({ user: null, loading: false });
    },
    logoutInvest: async () => {
      authEpoch.invest += 1;
      await logoutScope("invest");
      setInvest({ user: null, loading: false });
    },
    refreshMain: () => loadMe("main", setMain, { soft: true }),
    refreshInvest: () => loadMe("invest", setInvest, { soft: true }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () =>
  useContext(AuthContext) || {
    main: null,
    invest: null,
    mainLoading: false,
    investLoading: false,
    loginMain: () => {},
    loginInvest: () => {},
    logoutMain: () => {},
    logoutInvest: () => {},
    refreshMain: () => {},
    refreshInvest: () => {},
  };
