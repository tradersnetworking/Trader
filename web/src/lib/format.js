export function inr(n) {
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Alias — all platform amounts display in INR only */
export const money = inr;
export const formatInr = inr;

export function compact(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return inr(v);
}

export function dateStr(d, withTime = false) {
  if (!d) return "-";
  const opts = withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" };
  return new Date(d).toLocaleDateString("en-IN", opts);
}

export function daysLeft(d) {
  if (!d) return 0;
  return Math.max(0, Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24)));
}
