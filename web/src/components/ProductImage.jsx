import { useState } from "react";
import { productImageCandidates, IMAGE_SIZES } from "../lib/img.js";

export default function ProductImage({ product, className = "", aspect = true }) {
  const candidates = productImageCandidates(product);
  const [srcIndex, setSrcIndex] = useState(0);
  const src = candidates[srcIndex] || candidates[candidates.length - 1];

  return (
    <img
      src={src}
      alt={product?.name || "Product"}
      loading="lazy"
      decoding="async"
      onError={() => setSrcIndex((i) => (i + 1 < candidates.length ? i + 1 : i))}
      className={`object-cover ${aspect ? `${IMAGE_SIZES.product} w-full` : "h-full w-full"} ${className}`}
    />
  );
}
