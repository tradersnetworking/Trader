import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import QuoteModal from "../../components/QuoteModal.jsx";
import ProductImage from "../../components/ProductImage.jsx";
import { keywordImageUrl } from "../../lib/img.js";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    mainApi("/categories").then((d) => setCategories(d.categories)).catch(() => {});
    mainApi("/products?take=8").then((d) => setProducts(d.products)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <span className="badge bg-gold/20 text-gold-400">Global Export & Import • B2B & B2C</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">Trade Agricultural, FMCG, Medical, Metals & Chemicals <span className="gold-text">across the globe</span></h1>
            <p className="mt-4 max-w-lg text-slate-300">Akshaya Exim Traders sources and supplies food grains, vegetables, essential oils, ayurvedic powders, dry fruits, veterinary feed, medical supplies, metals and chemicals in bulk. Request or give quotes instantly.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products?listingType=EXPORT" className="btn-gold">Browse Export Products</Link>
              <Link to="/products?listingType=IMPORT" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10">Import Requirements</Link>
              <Link to="/sell" className="btn-outline border-gold/50 bg-transparent text-gold hover:bg-gold/10">Supply to Us →</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["spices,food", "Agro & Food"], ["machinery,industrial", "Machinery"], ["fabric,textile", "Textiles"], ["metal,steel", "Metals"]].map(([kw, label], i) => (
              <div key={kw} className="card overflow-hidden bg-white/5">
                <img src={keywordImageUrl(kw, 400, i + 1)} alt={label} loading="lazy" className="h-32 w-full object-cover sm:h-40" />
                <div className="px-3 py-2 text-sm font-semibold text-white">{label}</div>
              </div>
            ))}
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

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-navy">Shop by Category</h2>
        <p className="text-sm text-slate-500">Organized like a marketplace — categories & sub-categories</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="card p-5">
              <h3 className="font-bold text-navy">{c.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(c.children || []).map((s) => (
                  <Link key={s.id} to={`/products?categoryId=${s.id}`} className="badge bg-navy-50 text-navy hover:bg-navy hover:text-white">{s.name}</Link>
                ))}
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

      {/* Global trade CTA */}
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
