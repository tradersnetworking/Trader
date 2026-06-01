import { useState } from "react";
import { categoryImageUrl } from "../lib/img.js";

export default function CategoryImage({ category, name, className = "", imgClassName = "object-cover" }) {
  const [failed, setFailed] = useState(false);
  const label = typeof category === "string" ? category : category?.name || name || "Category";
  const url = failed ? null : categoryImageUrl(category || name);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-3xl ${className}`}>
        🏷️
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={label}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${imgClassName} ${className}`}
    />
  );
}
