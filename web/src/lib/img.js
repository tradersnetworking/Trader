// Category & product image URLs — files in /public/assets (see scripts/generate-brand-assets.mjs).

export const DEFAULT_CATEGORY_IMAGE = "/assets/categories/default-trade.webp";

/** Slug → existing bundled category image (legacy + EXIM taxonomy). */
const CATEGORY_SLUG_ALIASES = {
  "agriculture-food-products": "agriculture",
  "seeds-category": "agriculture",
  "organic-products": "agriculture",
  "ayurvedic-herbal-products": "ayurvedic-herbal-powder",
  "coconut-fiber-products": "food-beverage",
  "cotton-jute-products": "textiles-fabrics",
  "medical-surgical-products": "hospital-medical-supplies",
  "chemicals": "chemicals",
  "ores-minerals": "mineral-metals",
  "metals": "base-metals-articles",
  "metal-scrap": "aluminium-scrap",
  "generic-pharmaceutical-products": "pharmaceuticals",
  "medical-healthcare": "hospital-medical-supplies",
  "pharmaceutical-biotech-trade": "pharmaceuticals",
  "food-grains": "agriculture",
  "pulses-lentils": "agriculture",
  "oil-seeds": "agriculture",
  spices: "agro-products-commodities",
  "fresh-vegetables": "agriculture-product-stocks",
  "fresh-fruits": "agriculture-product-stocks",
  "dry-fruits-nuts": "agro-products-commodities",
  "plantation-products": "agriculture",
  "agricultural-seeds": "agriculture",
  "vegetable-seeds": "agriculture",
  "fruit-seeds": "agriculture",
  "organic-food": "agriculture",
  "organic-inputs": "agro-chemicals",
  "raw-herbs": "ayurvedic-herbal-powder",
  "processed-herbal-products": "ayurvedic-herbal-powder",
  "essential-oils": "health-beauty",
  "coconut-products": "food-beverage",
  "coir-products": "textiles-fabrics",
  cotton: "textiles-fabrics",
  jute: "textiles-fabrics",
  "surgical-consumables": "hospital-medical-supplies",
  "medical-equipment": "hospital-medical-supplies",
  diagnostics: "hospital-medical-supplies",
  "hospital-furniture": "hospital-medical-supplies",
  acids: "chemicals",
  "alkalis-bases": "chemicals",
  salts: "chemicals",
  "industrial-chemicals": "chemicals",
  "fertilizer-chemicals": "agro-chemicals",
  "iron-ore": "mineral-metals",
  "copper-ore": "mineral-metals",
  "aluminum-ore": "aluminum-aluminum-products",
  "zinc-ore": "mineral-metals",
  "other-minerals": "mineral-metals",
  "ferrous-metals": "base-metals-articles",
  "non-ferrous-metals": "aluminum-aluminum-products",
  "ferrous-scrap": "aluminium-scrap",
  "non-ferrous-scrap": "aluminium-scrap",
  tablets: "pharmaceuticals",
  capsules: "pharmaceuticals",
  syrups: "pharmaceuticals",
  "ointments-creams": "pharmaceuticals",
  "oral-care-products": "health-beauty",
  "first-aid-products": "hospital-medical-supplies",
  "disposable-medical-products": "hospital-medical-supplies",
  "hospital-consumables": "hospital-medical-supplies",
  "home-healthcare": "hospital-medical-supplies",
  "diagnostic-kits": "hospital-medical-supplies",
  "health-supplements": "pharmaceuticals",
  "herbal-supplements": "ayurvedic-herbal-powder",
  "basic-medical-devices": "hospital-medical-supplies",
  "healthcare-supplies": "hospital-medical-supplies",
  "api-products": "pharmaceuticals",
  "pharmaceutical-intermediates": "pharmaceuticals",
  "medical-packaging-materials": "packaging-paper",
  "laboratory-equipment": "scientific-laboratory-instruments",
  "veterinary-medicines": "pharmaceuticals",
  "veterinary-supplements": "pharmaceuticals",
  "biotechnology-products": "pharmaceuticals",
  "healthcare-raw-materials": "pharmaceuticals",
};

const KEYWORD_SLUG_RULES = [
  [/agricult|food-grain|pulse|seed|organic|spice|fruit|vegetable|grain|plantation|coir|coconut|jute|cotton|tea|coffee|rice|wheat|turmeric|onion/, "agriculture"],
  [/pharma|medic|tablet|capsule|syrup|hospital|surgical|diagnostic|health|veterinar|biotech|api/, "pharmaceuticals"],
  [/chem|acid|fertil|urea|salt|alkali/, "chemicals"],
  [/metal|ore|steel|iron|copper|alumin|scrap|zinc|nickel|bauxite|mineral/, "mineral-metals"],
  [/ayurved|herbal|moringa|ashwagandha/, "ayurvedic-herbal-powder"],
  [/textile|fabric|yarn/, "textiles-fabrics"],
];

function slug(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function resolveCategorySlug(name) {
  if (!name) return "default-trade";
  const s = slug(name);
  if (CATEGORY_SLUG_ALIASES[s]) return CATEGORY_SLUG_ALIASES[s];
  for (const [re, target] of KEYWORD_SLUG_RULES) {
    if (re.test(s)) return target;
  }
  return s;
}

function categoryPath(name) {
  const fileSlug = resolveCategorySlug(name);
  return `/assets/categories/${fileSlug}.webp`;
}

function productPath(name) {
  return `/assets/products/${slug(name)}.webp`;
}

/** @param {string|{ name?: string, image?: string|null, parent?: { name?: string, image?: string|null } }} category */
export function categoryImageUrl(category) {
  if (!category) return DEFAULT_CATEGORY_IMAGE;
  if (typeof category === "object") {
    if (category.name) return categoryPath(category.name);
    if (category.image) return category.image;
    return DEFAULT_CATEGORY_IMAGE;
  }
  return categoryPath(category);
}

/** Product image: marketplace/DB asset → category → default. */
export function productImageUrl(product) {
  const imgs = Array.isArray(product?.images) ? product.images : [];
  const stored = imgs.find((u) => typeof u === "string" && u.startsWith("/"));
  if (stored) return stored;
  if (product?.name) return productPath(product.name);
  const cat = product?.category;
  if (cat?.image) return cat.image;
  if (cat?.name) return categoryPath(cat.name);
  const parent = cat?.parent;
  if (parent?.image) return parent.image;
  if (parent?.name) return categoryPath(parent.name);
  return DEFAULT_CATEGORY_IMAGE;
}

/** Ordered fallbacks for cards & featured sections. */
export function productImageCandidates(product) {
  const out = [];
  const push = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };
  const imgs = Array.isArray(product?.images) ? product.images : [];
  imgs.forEach((u) => {
    if (typeof u === "string" && u.startsWith("/")) push(u);
  });
  if (product?.name) push(productPath(product.name));
  if (product?.category?.image) push(product.category.image);
  if (product?.category?.name) push(categoryPath(product.category.name));
  if (product?.category?.parent?.image) push(product.category.parent.image);
  if (product?.category?.parent?.name) push(categoryPath(product.category.parent.name));
  push(DEFAULT_CATEGORY_IMAGE);
  return out;
}

export const IMAGE_SIZES = {
  category: "aspect-[4/3]",
  product: "aspect-square",
};

export { slug as imageSlug, resolveCategorySlug };
