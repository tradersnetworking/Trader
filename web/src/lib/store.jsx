import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api.js";
import { getHostKind, useSiteMode } from "./site.js";

const AuthContext = createContext(null);

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

  const loadMe = useCallback(async (scope, setter) => {
    if (!getToken(scope)) return setter({ user: null, loading: false });
    try {
      const { user } = await api(scope, "/auth/me");
      setter({ user, loading: false });
    } catch {
      setToken(scope, "");
      setter({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    if (shouldLoadScope("main", mode, kind)) {
      loadMe("main", setMain);
    } else {
      setMain({ user: null, loading: false });
    }
    if (shouldLoadScope("invest", mode, kind)) {
      loadMe("invest", setInvest);
    } else {
      setInvest({ user: null, loading: false });
    }
  }, [loadMe, mode, kind]);

  const value = {
    main: main.user,
    invest: invest.user,
    mainLoading: main.loading,
    investLoading: invest.loading,
    loginMain: (token, user) => { setToken("main", token); setMain({ user, loading: false }); },
    loginInvest: (token, user) => { setToken("invest", token); setInvest({ user, loading: false }); },
    logoutMain: () => { setToken("main", ""); setMain({ user: null, loading: false }); },
    logoutInvest: () => { setToken("invest", ""); setInvest({ user: null, loading: false }); },
    refreshMain: () => loadMe("main", setMain),
    refreshInvest: () => loadMe("invest", setInvest),
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
