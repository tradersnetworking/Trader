import { useState } from "react";
import { productImageUrl, IMAGE_SIZES } from "../lib/img.js";

export default function ProductImage({ product, className = "", aspect = true }) {
  const [failed, setFailed] = useState(false);
  const url = productImageUrl(product);

  if (failed || !url) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-4xl ${aspect ? IMAGE_SIZES.product : ""} ${className}`}
      >
        📦
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={product?.name || "Product"}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${aspect ? `${IMAGE_SIZES.product} w-full` : ""} ${className}`}
    />
  );
}
