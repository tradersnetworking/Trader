import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import QuoteModal from "../../components/QuoteModal.jsx";
import ProductImage from "../../components/ProductImage.jsx";

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [quote, setQuote] = useState(null);
  const [q, setQ] = useState(sp.get("q") || "");

  const listingType = sp.get("listingType") || "";
  const categoryId = sp.get("categoryId") || "";

  useEffect(() => { mainApi("/categories").then((d) => setCategories(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (listingType) params.set("listingType", listingType);
    if (categoryId) params.set("categoryId", categoryId);
    if (sp.get("q")) params.set("q", sp.get("q"));
    mainApi(`/products?${params.toString()}`).then((d) => setProducts(d.products)).catch(() => {});
  }, [listingType, categoryId, sp]);

  const setParam = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Products</h1>
        <div className="ml-auto flex gap-2">
          {["", "EXPORT", "IMPORT"].map((t) => (
            <button key={t || "all"} onClick={() => setParam("listingType", t)} className={`badge ${listingType === t ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>
              {t === "" ? "All" : t === "EXPORT" ? "Available to Export" : "Import Requirements"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setParam("q", q); }} className="mt-4 flex gap-2">
        <input className="input" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary">Search</button>
      </form>

      <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit p-4">
          <h3 className="mb-2 text-sm font-bold text-navy">Categories</h3>
          <button onClick={() => setParam("categoryId", "")} className={`block w-full rounded px-2 py-1 text-left text-sm ${!categoryId ? "bg-navy text-white" : "hover:bg-slate-50"}`}>All</button>
          {categories.map((c) => (
            <div key={c.id} className="mt-2">
              <div className="text-xs font-bold uppercase text-slate-400">{c.name}</div>
              {(c.children || []).map((s) => (
                <button key={s.id} onClick={() => setParam("categoryId", s.id)} className={`block w-full rounded px-2 py-1 text-left text-sm ${categoryId === s.id ? "bg-navy text-white" : "hover:bg-slate-50"}`}>{s.name}</button>
              ))}
            </div>
          ))}
        </aside>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && <p className="text-slate-400">No products found.</p>}
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col overflow-hidden">
              <Link to={`/products/${p.slug}`} className="relative block">
                <ProductImage product={p} className="h-44 w-full" />
                <span className={`badge absolute left-2 top-2 ${p.listingType === "EXPORT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{p.listingType}</span>
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link to={`/products/${p.slug}`} className="font-semibold text-navy hover:text-gold-600 line-clamp-2">{p.name}</Link>
                <p className="text-xs text-slate-400">{p.category?.name} • {p.origin}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>
                <div className="mt-2 text-lg font-bold text-navy">{inr(p.basePrice)}<span className="text-xs font-normal text-slate-400">/{p.unit}</span></div>
                <p className="text-xs text-slate-400">Min order: {p.minOrderQty} {p.unit}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setQuote({ product: p, direction: "BUY" })} className="btn-gold flex-1">Request Quote</button>
                  <button onClick={() => setQuote({ product: p, direction: "SELL" })} className="btn-outline">Supply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {quote && <QuoteModal open onClose={() => setQuote(null)} product={quote.product} direction={quote.direction} />}
    </div>
  );
}
