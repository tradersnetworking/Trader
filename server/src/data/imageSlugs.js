/** Stable slug for local image filenames (no random ids). */
export function imageSlug(name) {
  return String(name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function categoryImagePath(name) {
  return `/assets/categories/${imageSlug(name)}.webp`;
}

export function productImagePath(name) {
  return `/assets/products/${imageSlug(name)}.webp`;
}
