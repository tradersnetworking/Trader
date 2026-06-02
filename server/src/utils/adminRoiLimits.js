/** Monthly ROI limits when admins override investor plan terms. Super Admin has no cap. */

export const ADMIN_MAX_MONTHLY_ROI_PCT = 20;

export function validateAdminMonthlyRoi(monthlyRoiPct, actor) {
  const n = Number(monthlyRoiPct);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error("Invalid monthly ROI percentage");
    err.status = 400;
    throw err;
  }
  if (actor?.role === "SUPERADMIN") return n;
  if (n > ADMIN_MAX_MONTHLY_ROI_PCT) {
    const err = new Error(`Monthly ROI cannot exceed ${ADMIN_MAX_MONTHLY_ROI_PCT}% (admin limit). Super Admin can set higher rates.`);
    err.status = 400;
    throw err;
  }
  return n;
}

export function validateAdminLockInDays(lockInDays, actor) {
  const days = Number(lockInDays);
  if (!Number.isFinite(days) || days < 30) {
    const err = new Error("Lock-in must be at least 1 month (30 days)");
    err.status = 400;
    throw err;
  }
  const maxDays = actor?.role === "SUPERADMIN" ? 60 * 30 : 60 * 30;
  if (days > maxDays) {
    const err = new Error("Lock-in cannot exceed 60 months");
    err.status = 400;
    throw err;
  }
  return Math.round(days);
}
