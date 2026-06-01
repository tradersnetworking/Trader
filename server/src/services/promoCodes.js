import { investDb } from "../db.js";

export async function validatePromoCode(code, { amount, appliesTo, investorId }) {
  if (!code) return { ok: false, error: "Promo code required" };
  const promo = await investDb.promoCode.findUnique({
    where: { code: String(code).trim().toUpperCase() },
  });
  if (!promo || !promo.isActive) return { ok: false, error: "Invalid or inactive promo code" };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { ok: false, error: "Promo code expired" };
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return { ok: false, error: "Promo code usage limit reached" };
  if (promo.appliesTo !== appliesTo) return { ok: false, error: `Promo code not valid for ${appliesTo.toLowerCase()}` };
  if (Number(amount) < promo.minAmount) return { ok: false, error: `Minimum amount ${promo.minAmount} required` };

  const prior = await investDb.promoUsage.count({ where: { promoId: promo.id, investorId } });
  if (prior > 0) return { ok: false, error: "You already used this promo code" };

  const bonus = Math.round((Number(amount) * promo.bonusPct) / 100 + promo.bonusFlat);
  return { ok: true, promo, bonus };
}

export async function applyPromoCode(promoId, investorId, amount, bonus) {
  await investDb.promoUsage.create({ data: { promoId, investorId, amount: Number(amount), bonus: Number(bonus) } });
  await investDb.promoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
}

export async function listPromoCodes() {
  return investDb.promoCode.findMany({ orderBy: { createdAt: "desc" } });
}
