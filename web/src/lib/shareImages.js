/** OG / social preview images — logo on home only; plan & product visuals elsewhere. */

import { productImageUrl } from "./img.js";

export const SITE_LOGO_IMAGE = "/assets/logo.png";
export const MAIN_DEFAULT_SHARE_IMAGE = "/assets/categories/default-trade.webp";
export const INVEST_PLANS_SHARE_IMAGE = "/assets/share/invest-plans.png";

/** 1200×630 plan card previews (generated in scripts/generate-brand-assets.mjs). */
export const PLAN_TIER_SHARE_IMAGES = {
  STARTER: "/assets/share/plans/STARTER.png",
  BRONZE: "/assets/share/plans/BRONZE.png",
  SILVER: "/assets/share/plans/SILVER.png",
  GOLD: "/assets/share/plans/GOLD.png",
  PLATINUM: "/assets/share/plans/PLATINUM.png",
  DIAMOND: "/assets/share/plans/DIAMOND.png",
};

export function isMainHomePath(pathname) {
  const p = pathname || "/";
  return p === "/" || p === "";
}

export function isInvestHomePath(pathname, hasPlanQuery = false) {
  if (hasPlanQuery) return false;
  const p = pathname || "/";
  return p === "/" || p === "";
}

/** Investment plan share preview — auto-generated card per plan id. */
export function planOgImagePath(plan) {
  if (!plan) return INVEST_PLANS_SHARE_IMAGE;
  if (plan.id) return `/api/share/plan/${encodeURIComponent(String(plan.id))}.png`;
  const tier = String(plan.planType || "").toUpperCase();
  return PLAN_TIER_SHARE_IMAGES[tier] || INVEST_PLANS_SHARE_IMAGE;
}

/** Marketplace product share preview. */
export function productOgImagePath(product) {
  if (!product) return MAIN_DEFAULT_SHARE_IMAGE;
  const url = productImageUrl(product);
  if (!url || url === SITE_LOGO_IMAGE) return MAIN_DEFAULT_SHARE_IMAGE;
  return url;
}

export function resolveMainShareImage(pathname, product) {
  if (isMainHomePath(pathname)) return SITE_LOGO_IMAGE;
  if (pathname?.startsWith("/products/") && product) return productOgImagePath(product);
  if (pathname?.startsWith("/products/")) return MAIN_DEFAULT_SHARE_IMAGE;
  return MAIN_DEFAULT_SHARE_IMAGE;
}

export function resolveInvestShareImage(pathname, plan, hasPlanQuery) {
  if (plan || hasPlanQuery) return planOgImagePath(plan);
  if (isInvestHomePath(pathname, false)) return INVEST_PLANS_SHARE_IMAGE;
  return INVEST_PLANS_SHARE_IMAGE;
}

export function absoluteOgImage(origin, imagePath) {
  if (!imagePath) return `${origin}${SITE_LOGO_IMAGE}`;
  if (imagePath.startsWith("http")) return imagePath;
  return `${origin}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}
