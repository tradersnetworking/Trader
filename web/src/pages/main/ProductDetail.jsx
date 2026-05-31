import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import QuoteModal from "../../components/QuoteModal.jsx";
import ProductImage from "../../components/ProductImage.jsx";

export default function ProductDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [quote, setQuote] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { mainApi(`/products/${slug}`).then((d) => setP(d.product)).catch((e) => setErr(e.message)); }, [slug]);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400">{err}</div>;
  if (!p) return <div className="p-16 text-center text-slate-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/products" className="text-sm text-slate-500 hover:underline">← Back to products</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="card aspect-square overflow-hidden">
          <ProductImage product={p} className="h-full w-full" size={800} />
        </div>
        <div>
          <span className={`badge ${p.listingType === "EXPORT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{p.listingType === "EXPORT" ? "Available to Export" : "Import Requirement"}</span>
          <h1 className="mt-2 text-3xl font-extrabold text-navy">{p.name}</h1>
          <p className="text-sm text-slate-400">{p.category?.name} • Origin: {p.origin || "—"} {p.hsCode && `• HS ${p.hsCode}`}</p>
          <div className="mt-4 text-3xl font-extrabold text-navy">{inr(p.basePrice)}<span className="text-base font-normal text-slate-400">/{p.unit}</span></div>
          <p className="text-sm text-slate-500">Minimum order: {p.minOrderQty} {p.unit} • Trade: {p.tradeType}</p>
          <p className="mt-4 text-slate-600">{p.description}</p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => setQuote({ direction: "BUY" })} className="btn-gold">Request Quote</button>
            <button onClick={() => setQuote({ direction: "SELL" })} className="btn-outline">Offer to Supply</button>
          </div>
        </div>
      </div>
      {quote && <QuoteModal open onClose={() => setQuote(null)} product={p} direction={quote.direction} />}
    </div>
  );
}
