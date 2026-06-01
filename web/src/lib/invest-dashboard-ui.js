import {
  APP_STAT_GRID,
  APP_DASHBOARD_SPLIT,
  APP_DASHBOARD_MAIN,
  APP_DASHBOARD_SIDE,
} from "./ui-system.js";

export const INVEST_STAT_GRID = APP_STAT_GRID;
export const INVEST_DASHBOARD_SPLIT = "invest-dashboard-split";
export const INVEST_DASHBOARD_MAIN = APP_DASHBOARD_MAIN;
export const INVEST_DASHBOARD_SIDE = APP_DASHBOARD_SIDE;

export const KPI_TONES = {
  blue: {
    value: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    bar: "from-blue-500 to-cyan-400",
    icon: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    value: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    bar: "from-emerald-500 to-teal-400",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    value: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/12",
    border: "border-amber-500/30",
    bar: "from-amber-500 to-yellow-400",
    icon: "text-amber-700 dark:text-amber-400",
  },
  violet: {
    value: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    bar: "from-violet-500 to-purple-400",
    icon: "text-violet-600 dark:text-violet-400",
  },
  cyan: {
    value: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    bar: "from-cyan-500 to-sky-400",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
  rose: {
    value: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    bar: "from-rose-500 to-pink-400",
    icon: "text-rose-600 dark:text-rose-400",
  },
  pink: {
    value: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/25",
    bar: "from-pink-500 to-rose-400",
    icon: "text-pink-600 dark:text-pink-400",
  },
  indigo: {
    value: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/25",
    bar: "from-indigo-500 to-blue-400",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
};

export const LEDGER_TYPE_COLORS = {
  DEPOSIT: "text-emerald-600",
  INVESTMENT: "text-blue-600",
  RETURN: "text-violet-600",
  PAYOUT: "text-rose-600",
  REFUND: "text-cyan-600",
  ADJUSTMENT: "text-amber-600",
};
