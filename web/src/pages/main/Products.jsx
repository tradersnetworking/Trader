import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import QuoteModal from "../../components/QuoteModal.jsx";
import MainCheckoutModal from "../../components/main/MainCheckoutModal.jsx";
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
            <button key={t || "all"} onClick={() => setParam("listingType", t)} className={`badge ${listingType === t ? "main-filter-active" : "main-filter"}`}>
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
          <button onClick={() => setParam("categoryId", "")} className={`block w-full rounded px-2 py-1 text-left text-sm ${!categoryId ? "main-filter-active" : "hover:bg-muted"}`}>All</button>
          {categories.map((c) => (
            <div key={c.id} className="mt-2">
              <div className="text-xs font-bold uppercase text-muted-foreground">{c.name}</div>
              {(c.children || []).map((s) => (
                <button key={s.id} onClick={() => setParam("categoryId", s.id)} className={`block w-full rounded px-2 py-1 text-left text-sm ${categoryId === s.id ? "main-filter-active" : "hover:bg-muted"}`}>{s.name}</button>
              ))}
            </div>
          ))}
        </aside>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && <p className="text-slate-400">No products found.</p>}
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col overflow-hidden transition hover:shadow-lg">
              <Link to={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
                <ProductImage product={p} className="h-full w-full" aspect={false} />
                <span className={`badge absolute left-2 top-2 ${p.listingType === "EXPORT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {p.listingType === "EXPORT" ? "Export" : "Import req."}
                </span>
                {p.inStock !== false && <span className="absolute right-2 top-2 rounded bg-navy/80 px-1.5 py-0.5 text-[10px] font-bold text-white">In stock</span>}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link to={`/products/${p.slug}`} className="main-link font-semibold line-clamp-2 hover:text-gold">{p.name}</Link>
                <p className="text-xs text-slate-400">{p.category?.name} • {p.origin || "Global"}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-1">
                  <span className="text-xl font-extrabold text-navy">{inr(p.basePrice)}</span>
                  <span className="text-xs text-slate-400">/{p.unit}</span>
                  {p.priceEstimated && (
                    <span className="text-[10px] font-medium text-amber-700" title="Indicative market rate — request a quote for final pricing">
                      Indicative
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">MOQ {p.minOrderQty} {p.unit}</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => setCheckout({ product: p, mode: "full" })} className="btn-gold col-span-2 text-xs py-2">Buy now</button>
                  {p.listingType === "IMPORT" && (
                    <button type="button" onClick={() => setCheckout({ product: p, mode: "advance" })} className="btn-outline col-span-2 text-xs py-2 text-emerald-700">Pay advance</button>
                  )}
                  <button type="button" onClick={() => setQuote({ product: p, direction: "BUY" })} className="btn-outline text-xs py-2">Quote</button>
                  <button type="button" onClick={() => setQuote({ product: p, direction: "SELL" })} className="btn-outline text-xs py-2">Supply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {quote && <QuoteModal open onClose={() => setQuote(null)} product={quote.product} direction={quote.direction} />}
      {checkout && <MainCheckoutModal open onClose={() => setCheckout(null)} product={checkout.product} mode={checkout.mode} />}
    </div>
  );
}
