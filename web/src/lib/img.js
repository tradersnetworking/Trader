// Product imagery: if a product has uploaded images use them, otherwise pull a
// relevant photo from the internet (LoremFlickr) keyed by category/name so the
// catalog looks populated like Amazon. Stable per-product via a hashed lock.

function hash(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 100000;
}

const STOP = new Set(["the", "and", "for", "with", "grade", "export", "import", "requirement", "bulk", "pure", "organic", "fresh", "high", "&", "-", "(import)", "(export"]);

function tagsFrom(product) {
  const base = `${product?.category?.name || ""} ${product?.name || ""}`.toLowerCase();
  const words = base
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const tags = words.slice(0, 2).join(",");
  return tags || "product";
}

export function productImageUrl(product, size = 600) {
  const imgs = Array.isArray(product?.images) ? product.images : [];
  if (imgs.length && imgs[0]) return imgs[0];
  const seed = hash(product?.id || product?.name || "x");
  return `https://loremflickr.com/${size}/${size}/${encodeURIComponent(tagsFrom(product))}/all?lock=${seed}`;
}

// Generic keyword image (used for hero collage etc.)
export function keywordImageUrl(keyword, size = 600, seed = 1) {
  return `https://loremflickr.com/${size}/${size}/${encodeURIComponent(keyword)}/all?lock=${seed}`;
}
