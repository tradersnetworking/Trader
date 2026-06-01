/** Stable slug + EXIM category image resolution for seed/API paths. */

const CATEGORY_SLUG_ALIASES = {
  "agriculture-food-products": "agriculture-food-products",
  "seeds-category": "seeds-category",
  "organic-products": "organic-products",
  "ayurvedic-herbal-products": "ayurvedic-herbal-products",
  "coconut-fiber-products": "coconut-fiber-products",
  "cotton-jute-products": "cotton-jute-products",
  "medical-surgical-products": "medical-surgical-products",
  chemicals: "chemicals",
  "ores-minerals": "ores-minerals",
  metals: "metals",
  "metal-scrap": "metal-scrap",
  "generic-pharmaceutical-products": "generic-pharmaceutical-products",
  "medical-healthcare": "medical-healthcare",
  "pharmaceutical-biotech-trade": "pharmaceutical-biotech-trade",
};

const LEGACY_ALIASES = {
  "agriculture-food-products": "agriculture",
  "seeds-category": "agriculture",
  "organic-products": "agriculture",
  "ayurvedic-herbal-products": "ayurvedic-herbal-powder",
  "coconut-fiber-products": "food-beverage",
  "cotton-jute-products": "textiles-fabrics",
  "medical-surgical-products": "hospital-medical-supplies",
  "ores-minerals": "mineral-metals",
  metals: "base-metals-articles",
  "metal-scrap": "aluminium-scrap",
  "generic-pharmaceutical-products": "pharmaceuticals",
  "medical-healthcare": "hospital-medical-supplies",
  "pharmaceutical-biotech-trade": "pharmaceuticals",
};

export function imageSlug(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function resolveCategorySlug(name) {
  const s = imageSlug(name);
  return CATEGORY_SLUG_ALIASES[s] || LEGACY_ALIASES[s] || s;
}

export function categoryImagePath(name) {
  return `/assets/categories/${resolveCategorySlug(name)}.webp`;
}

export function productImagePath(name) {
  return `/assets/products/${imageSlug(name)}.webp`;
}
