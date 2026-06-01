// Local product & category images (bundled in web/public/assets).
import { categoryImagePath, productImagePath } from "./imageSlugs.js";

const DEFAULT = "/assets/categories/default-trade.webp";

/** Parent category → image (legacy fallback if file missing). */
export const CATEGORY_IMAGES = Object.fromEntries(
  [
    "Agriculture",
    "Apparel & Fashion",
    "Automobile",
    "Brass Hardware & Components",
    "Chemicals",
    "Computer Hardware & Software",
    "Construction & Real Estate",
    "Consumer Electronics",
    "Electronics & Electrical Supplies",
    "Energy & Power",
    "Environment & Pollution",
    "Food & Beverage",
    "Furniture",
    "Gifts & Crafts",
    "Health & Beauty",
    "Home Supplies",
    "Home Textiles & Furnishings",
    "Hospital & Medical Supplies",
    "Hotel Supplies & Equipment",
    "Industrial Supplies",
    "Jewelry & Gemstones",
    "Leather & Leather Products",
    "Machinery",
    "Mineral & Metals",
    "Office & School Supplies",
    "Packaging & Paper",
    "Pharmaceuticals",
    "Pipes, Tubes & Fittings",
    "Plastics & Products",
    "Printing & Publishing",
    "Scientific & Laboratory Instruments",
    "Security & Protection",
    "Sports & Entertainment",
    "Telecommunications",
    "Textiles & Fabrics",
    "Toys",
    "Transportation",
  ].map((name) => [name, categoryImagePath(name)])
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
