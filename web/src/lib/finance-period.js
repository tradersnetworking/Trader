export const ADMIN_PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "day", label: "Today" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

export const INVESTOR_PERIOD_OPTIONS = [
  { value: "day", label: "Today" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function buildStatsQuery(period, customFrom = "", customTo = "") {
  const params = new URLSearchParams({ period });
  if (period === "custom") {
    if (customFrom.trim()) params.set("from", customFrom.trim());
    if (customTo.trim()) params.set("to", customTo.trim());
  }
  return params.toString();
}

export function periodMetricLabel(periodLabel, metric) {
  if (!periodLabel || periodLabel === "All time") return metric;
  if (periodLabel === "Today") return `Today · ${metric}`;
  return `${periodLabel} · ${metric}`;
}
