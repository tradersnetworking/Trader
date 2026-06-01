// Local product & category images (bundled in web/public/assets).
import { categoryImagePath, productImagePath } from "./imageSlugs.js";
import { TAXONOMY } from "./categories.js";

const DEFAULT = "/assets/categories/default-trade.webp";

/** Parent category → image path (derived from EXIM taxonomy). */
export const CATEGORY_IMAGES = Object.fromEntries(
  TAXONOMY.map((c) => [c.name, categoryImagePath(c.name)])
);

export function imageForCategory(categoryName) {
  if (!categoryName) return DEFAULT;
  return categoryImagePath(categoryName);
}

export function imageForProduct(name, categoryName, parentCategoryName) {
  if (name) return productImagePath(name);
  if (categoryName) return categoryImagePath(categoryName);
  if (parentCategoryName) return categoryImagePath(parentCategoryName);
  return DEFAULT;
}
