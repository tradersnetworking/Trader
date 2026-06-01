// Category & product image URLs — files in /public/assets (see scripts/fetch-marketplace-images.mjs).

const DEFAULT = "/assets/categories/default-trade.webp";

function slug(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function categoryPath(name) {
  return `/assets/categories/${slug(name)}.webp`;
}

function productPath(name) {
  return `/assets/products/${slug(name)}.webp`;
}

/** @param {string|{ name?: string, image?: string|null, parent?: { name?: string, image?: string|null } }} category */
export function categoryImageUrl(category) {
  if (!category) return DEFAULT;
  if (typeof category === "object") {
    if (category.image) return category.image;
    const name = category.name;
    if (name) return categoryPath(name);
    return DEFAULT;
  }
  return categoryPath(category);
}

export function productImageUrl(product) {
  const imgs = Array.isArray(product?.images) ? product.images : [];
  if (imgs.length && imgs[0]) return imgs[0];

  const name = product?.name;
  if (name) return productPath(name);

  const cat = product?.category;
  if (cat?.image) return cat.image;
  if (cat?.name) return categoryPath(cat.name);

  const parent = cat?.parent;
  if (parent?.image) return parent.image;
  if (parent?.name) return categoryPath(parent.name);

  return DEFAULT;
}

export const IMAGE_SIZES = {
  category: "aspect-[4/3]",
  product: "aspect-square",
};
