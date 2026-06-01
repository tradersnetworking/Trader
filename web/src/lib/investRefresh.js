import { useEffect } from "react";

export const INVEST_REFRESH_EVENT = "invest:dashboard-refresh";

export function emitInvestRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INVEST_REFRESH_EVENT));
  }
}

/** Re-run `onRefresh` when the dashboard refresh button is pressed. */
export function useInvestRefresh(onRefresh) {
  useEffect(() => {
    if (!onRefresh) return undefined;
    const handler = () => onRefresh();
    window.addEventListener(INVEST_REFRESH_EVENT, handler);
    return () => window.removeEventListener(INVEST_REFRESH_EVENT, handler);
  }, [onRefresh]);
}
