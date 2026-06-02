import { investDb } from "../db.js";
import { normalizePlanRoi, sortPlansByTier } from "../utils/invest.js";
import { catalogKey } from "../data/investmentPlans.js";

export { catalogKey };

/** Unique plan row key (tier + lock-in). */
export function planListKey(plan) {
  return catalogKey(plan.planType, plan.lockInDays);
}

/**
 * List plans for admin or public site. Public view: active only, one row per tier+lock-in (latest update wins).
 */
export async function listInvestPlans({ activeOnly = false } = {}) {
  const rows = await investDb.plan.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  let list = rows;
  if (activeOnly) {
    const byKey = new Map();
    for (const row of rows) {
      const key = planListKey(row);
      if (!byKey.has(key)) byKey.set(key, row);
    }
    list = [...byKey.values()];
  }

  return sortPlansByTier(list.map(normalizePlanRoi));
}

/** Remove or deactivate duplicate tier+lock-in rows (keeps newest updated). */
export async function dedupeInvestPlans() {
  const rows = await investDb.plan.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  const seen = new Set();
  let removed = 0;
  for (const row of rows) {
    const key = planListKey(row);
    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }
    const subs = await investDb.subscription.count({ where: { planId: row.id } });
    if (subs === 0) {
      await investDb.plan.delete({ where: { id: row.id } });
    } else {
      await investDb.plan.update({ where: { id: row.id }, data: { isActive: false } });
    }
    removed += 1;
  }
  return removed;
}
