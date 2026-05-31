import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import QuoteModal from "../../components/QuoteModal.jsx";
import ProductImage from "../../components/ProductImage.jsx";
import { categoryImageUrl } from "../../lib/img.js";

export default function Home() {
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [quote, setQuote] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  useEffect(() => {
    mainApi("/categories").then((d) => setCategories(d.categories)).catch(() => {});
    mainApi("/products?take=8").then((d) => setProducts(d.products)).catch(() => {});
  }, []);

  const filteredCategories = useMemo(() => {
    const term = catFilter.trim().toLowerCase();
    if (!term) return categories.slice(0, 9);
    return categories
      .map((c) => ({
        ...c,
        children: (c.children || []).filter(
          (s) => s.name.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)
        ),
      }))
      .filter((c) => c.name.toLowerCase().includes(term) || c.children.length > 0)
      .slice(0, 12);
  }, [categories, catFilter]);

  const heroCategories = categories.slice(0, 4);

  const onSearch = (e) => {
    e.preventDefault();
    if (search.trim()) nav(`/products?q=${encodeURIComponent(search.trim())}`);
    else nav("/products");
  };

  return (
    <div>
      {/* Hero + search */}
      <section className="hero-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <span className="badge bg-gold/20 text-gold-400">Global Export & Import • B2B & B2C</span>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
                Trade Agricultural, FMCG, Medical, Metals & Chemicals <span className="gold-text">across the globe</span>
              </h1>
              <p className="mt-4 max-w-lg text-slate-300">Bulk export & import across 37+ categories. B2B sellers and buyers in India and abroad. B2C buyers in India.</p>
              <form onSubmit={onSearch} className="mt-6 flex flex-col gap-2 sm:flex-row">
                <input
                  className="input flex-1 border-0 text-navy shadow-lg"
                  placeholder="Search products, categories…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className="btn-gold shrink-0">Search</button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/products?listingType=EXPORT" className="btn-gold text-xs sm:text-sm">Export Products</Link>
                <Link to="/products?listingType=IMPORT" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10 text-xs sm:text-sm">Import Requirements</Link>
                <Link to="/sell" className="btn-outline border-gold/50 bg-transparent text-gold hover:bg-gold/10 text-xs sm:text-sm">Supply to Us</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {heroCategories.map((c) => (
                <Link key={c.id} to={`/products?q=${encodeURIComponent(c.name)}`} className="card overflow-hidden bg-white/5 transition hover:ring-2 hover:ring-gold/50">
                  <img src={categoryImageUrl(c.name)} alt={c.name} loading="lazy" className="h-28 w-full object-cover sm:h-36" />
                  <div className="truncate px-3 py-2 text-sm font-semibold">{c.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 text-center md:grid-cols-4">
          {[["🌍", "Global Reach"], ["📦", "Bulk Supply"], ["✅", "Quality Assured"], ["⚡", "Fast Quotes"]].map(([i, t]) => (
            <div key={t}><div className="text-2xl">{i}</div><div className="mt-1 text-sm font-semibold text-navy">{t}</div></div>
          ))}
        </div>
      </section>

      {/* Category search */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-navy">Browse by Category</h2>
            <p className="text-sm text-slate-500">Search 37 trade categories — Amazon-style sub-categories</p>
          </div>
          <Link to="/categories" className="text-sm font-semibold text-navy hover:underline">View all categories →</Link>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="input max-w-md"
            placeholder="Filter categories… e.g. Agriculture, Metals, Textiles"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          />
          {catFilter && <button onClick={() => setCatFilter("")} className="btn-outline">Clear</button>}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <img src={categoryImageUrl(c.name)} alt={c.name} loading="lazy" className="h-28 w-full object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-navy">{c.name}</h3>
                <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                  {(c.children || []).slice(0, 6).map((s) => (
                    <Link key={s.id} to={`/products?categoryId=${s.id}`} className="badge bg-navy-50 text-navy hover:bg-navy hover:text-white">{s.name}</Link>
                  ))}
                  {(c.children || []).length > 6 && <span className="badge bg-slate-100 text-slate-500">+{c.children.length - 6} more</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-navy">Featured Listings</h2>
            <Link to="/products" className="text-sm font-semibold text-navy hover:underline">View all →</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="card flex flex-col overflow-hidden">
                <Link to={`/products/${p.slug}`} className="relative block">
                  <ProductImage product={p} className="h-40 w-full" />
                  <span className={`badge absolute left-2 top-2 ${p.listingType === "EXPORT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{p.listingType}</span>
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link to={`/products/${p.slug}`} className="font-semibold text-navy hover:text-gold-600 line-clamp-2">{p.name}</Link>
                  <p className="text-xs text-slate-400">{p.category?.name} • {p.origin}</p>
                  <div className="mt-2 text-lg font-bold text-navy">{inr(p.basePrice)}<span className="text-xs font-normal text-slate-400">/{p.unit}</span></div>
                  <p className="text-xs text-slate-400">Min order: {p.minOrderQty} {p.unit}</p>
                  <button onClick={() => setQuote({ product: p, direction: "BUY" })} className="btn-gold mt-3">Request Quote</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trade CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="hero-gradient flex flex-col items-center justify-between gap-4 rounded-2xl p-8 text-white md:flex-row">
          <div>
            <h3 className="text-2xl font-extrabold">Buy & Sell in Bulk • B2B & B2C • India & Abroad</h3>
            <p className="text-slate-300">List your products, request quotes, and trade across 37+ categories with Akshaya Exim Traders.</p>
          </div>
          <Link to="/products" className="btn-gold whitespace-nowrap">Explore All Products →</Link>
        </div>
      </section>

      {quote && <QuoteModal open onClose={() => setQuote(null)} product={quote.product} direction={quote.direction} />}
    </div>
  );
}
