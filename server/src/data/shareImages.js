import { imageForProduct } from "./productImages.js";

export const SITE_LOGO = "/assets/logo.png";
export const MAIN_DEFAULT = "/assets/categories/default-trade.webp";
export const INVEST_PLANS = "/assets/share/invest-plans.png";

export const PLAN_TIER_SHARE = {
  STARTER: "/assets/share/plans/STARTER.png",
  BRONZE: "/assets/share/plans/BRONZE.png",
  SILVER: "/assets/share/plans/SILVER.png",
  GOLD: "/assets/share/plans/GOLD.png",
  PLATINUM: "/assets/share/plans/PLATINUM.png",
  DIAMOND: "/assets/share/plans/DIAMOND.png",
};

export function planShareImage(plan) {
  if (plan?.id) return `/api/share/plan/${encodeURIComponent(String(plan.id))}.png`;
  const tier = String(plan?.planType || "").toUpperCase();
  return PLAN_TIER_SHARE[tier] || INVEST_PLANS;
}

export async function productShareImageBySlug(mainDb, slug) {
  if (!slug) return MAIN_DEFAULT;
  const p = await mainDb.product.findUnique({
    where: { slug: String(slug) },
    include: { category: { include: { parent: true } } },
  });
  if (!p) return MAIN_DEFAULT;
  try {
    const imgs = JSON.parse(p.images || "[]");
    if (imgs[0] && typeof imgs[0] === "string") {
      return imgs[0].startsWith("http") ? imgs[0] : imgs[0].startsWith("/") ? imgs[0] : `/${imgs[0]}`;
    }
  } catch {
    /* ignore */
  }
  if (p.category?.image) return p.category.image;
  return imageForProduct(p.name, p.category?.name, p.category?.parent?.name);
}

export function isMainHome(pathname) {
  const p = pathname || "/";
  return p === "/" || p === "";
}

export function isInvestHome(pathname, planId) {
  if (planId) return false;
  const p = pathname || "/";
  return p === "/" || p === "";
}
