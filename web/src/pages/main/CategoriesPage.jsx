import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import CategoryImage from "../../components/CategoryImage.jsx";
import { IMAGE_SIZES } from "../../lib/img.js";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { mainApi("/categories").then((d) => setCategories(d.categories)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return categories;
    return categories
      .map((c) => ({
        ...c,
        children: (c.children || []).filter(
          (s) => s.name.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
        ),
      }))
      .filter((c) => c.name.toLowerCase().includes(term) || (c.children && c.children.length > 0));
  }, [categories, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-extrabold text-navy">Product Categories</h1>
      <p className="text-sm text-slate-500">B2B import-export marketplace · Agriculture · Metals · Chemicals · Medical · Pharma</p>

      <div className="mt-6 flex gap-2">
        <input
          className="input max-w-xl"
          placeholder="Search categories & sub-categories…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button onClick={() => setQ("")} className="btn-outline">Clear</button>}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="card overflow-hidden">
            <div className={`${IMAGE_SIZES.category} w-full overflow-hidden bg-muted`}>
              <CategoryImage category={c} className="h-full w-full" />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-navy">{c.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(c.children || []).map((s) => (
                  <Link key={s.id} to={`/products?categoryId=${s.id}`} className="badge bg-navy-50 text-navy hover:bg-navy hover:text-white">{s.name}</Link>
                ))}
              </div>
              <Link to={`/products?q=${encodeURIComponent(c.name)}`} className="mt-3 inline-block text-sm font-semibold text-gold-600 hover:underline">Browse all in {c.name} →</Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-slate-400">No categories match your search.</p>}
      </div>
    </div>
  );
}
