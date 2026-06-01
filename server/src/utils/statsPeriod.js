/** Date-range helpers for dashboard / transaction stats (Kuber-style). */

export function parseStatsPeriod(raw, fallback = "all") {
  const p = (raw || fallback).toLowerCase().replace(/-/g, "_");
  if (p === "halfyear" || p === "halfyearly") return "half_year";
  if (["present", "day", "week", "month", "quarter", "half_year", "year", "custom", "all"].includes(p)) return p;
  return fallback;
}

function startOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function resolveStatsDateRange(period, fromParam, toParam) {
  const now = new Date();

  if (period === "present") return { from: null, to: now, label: "Present" };
  if (period === "all") return { from: null, to: null, label: "All time" };
  if (period === "day") {
    const from = startOfUtcDay(now);
    return { from, to: now, label: "Today" };
  }
  if (period === "week") {
    const from = startOfUtcDay(now);
    const dow = from.getUTCDay();
    from.setUTCDate(from.getUTCDate() - ((dow + 6) % 7));
    return { from, to: now, label: "This week" };
  }
  if (period === "month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from, to: now, label: "This month" };
  }
  if (period === "quarter") {
    const qStart = Math.floor(now.getUTCMonth() / 3) * 3;
    const from = new Date(Date.UTC(now.getUTCFullYear(), qStart, 1));
    return { from, to: now, label: "This quarter" };
  }
  if (period === "half_year") {
    const m = now.getUTCMonth() < 6 ? 0 : 6;
    const from = new Date(Date.UTC(now.getUTCFullYear(), m, 1));
    return { from, to: now, label: "This half-year" };
  }
  if (period === "year") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { from, to: now, label: "This year" };
  }
  if (period === "custom") {
    if (!fromParam?.trim()) return { from: null, to: null, label: "All time" };
    const fromDate = new Date(`${fromParam.trim()}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime())) return { from: null, to: null, label: "All time" };
    const toDate = toParam?.trim()
      ? endOfUtcDay(new Date(`${toParam.trim()}T00:00:00.000Z`))
      : endOfUtcDay(fromDate);
    const from = startOfUtcDay(fromDate);
    const label = !toParam?.trim() || fromParam === toParam ? fromParam : `${fromParam} → ${toParam}`;
    return { from, to: toDate, label };
  }

  return { from: null, to: null, label: "All time" };
}

export function parseQueryDateRange(query) {
  const period = parseStatsPeriod(query.period, "all");
  const { from, to, label } = resolveStatsDateRange(period, query.from, query.to);
  return { period, from, to, label };
}

export function dateRangeWhere(from, to) {
  if (!from && !to) return {};
  const w = {};
  if (from && to) w.createdAt = { gte: from, lte: to };
  else if (from) w.createdAt = { gte: from };
  else if (to) w.createdAt = { lte: to };
  return w;
}

export function inDateRange(iso, from, to) {
  if (!from || !to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}
