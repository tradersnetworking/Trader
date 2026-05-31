import { useState } from "react";
import { productImageUrl } from "../lib/img.js";

export default function ProductImage({ product, className = "", size = 600 }) {
  const [failed, setFailed] = useState(false);
  const url = productImageUrl(product, size);
  if (failed || !url) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-4xl ${className}`}>
        📦
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={product?.name || "product"}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
