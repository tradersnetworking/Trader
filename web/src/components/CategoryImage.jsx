import { useState } from "react";
import { categoryImageUrl, DEFAULT_CATEGORY_IMAGE } from "../lib/img.js";

export default function CategoryImage({ category, name, className = "", imgClassName = "object-cover" }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const label = typeof category === "string" ? category : category?.name || name || "Category";
  const catObj = typeof category === "object" && category ? category : null;
  const primary = categoryImageUrl(category || name);
  const candidates = [primary];
  if (catObj?.parent?.image) candidates.push(catObj.parent.image);
  if (catObj?.parent?.name) candidates.push(categoryImageUrl(catObj.parent.name));
  candidates.push(DEFAULT_CATEGORY_IMAGE);
  const unique = candidates.filter((u, i, a) => u && a.indexOf(u) === i);
  const src = unique[srcIndex] || DEFAULT_CATEGORY_IMAGE;

  return (
    <img
      src={src}
      alt={label}
      loading="lazy"
      decoding="async"
      onError={() => setSrcIndex((i) => (i + 1 < unique.length ? i + 1 : unique.length))}
      className={`h-full w-full ${imgClassName} ${className}`}
    />
  );
}
