import { useState } from "react";
import { categoryImageUrl, DEFAULT_CATEGORY_IMAGE } from "../lib/img.js";

export default function CategoryImage({ category, name, className = "", imgClassName = "object-cover" }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const label = typeof category === "string" ? category : category?.name || name || "Category";
  const primary = categoryImageUrl(category || name);
  const candidates = [primary, DEFAULT_CATEGORY_IMAGE].filter((u, i, a) => u && a.indexOf(u) === i);
  const src = candidates[srcIndex] || DEFAULT_CATEGORY_IMAGE;

  return (
    <img
      src={src}
      alt={label}
      loading="lazy"
      decoding="async"
      onError={() => setSrcIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length))}
      className={`h-full w-full ${imgClassName} ${className}`}
    />
  );
}
