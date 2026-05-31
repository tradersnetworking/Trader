import { useState } from "react";
import QuoteModal from "../../components/QuoteModal.jsx";

export default function Sell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-3xl font-extrabold text-navy">Supply / Sell in Bulk</h1>
      <p className="mt-3 text-slate-500">Are you a manufacturer, farmer, or trader? Offer your products to Akshaya Exim and reach global B2B & B2C buyers. Submit your supply quote and our procurement team will get back to you.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3 text-left">
        {[["1", "Submit your offer", "Share product, quantity & price"], ["2", "We review", "Our team verifies & negotiates"], ["3", "Get paid", "Secure payments via multiple gateways"]].map(([n, t, d]) => (
          <div key={n} className="card p-5"><div className="text-2xl font-extrabold gold-text">{n}</div><div className="font-semibold text-navy">{t}</div><div className="text-sm text-slate-500">{d}</div></div>
        ))}
      </div>
      <button onClick={() => setOpen(true)} className="btn-gold mt-8">Submit a Supply Offer</button>
      {open && <QuoteModal open onClose={() => setOpen(false)} direction="SELL" />}
    </div>
  );
}
