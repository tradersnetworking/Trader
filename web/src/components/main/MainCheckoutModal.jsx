import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Modal, Field, Alert } from "../ui.jsx";
import { handleGatewayCheckout } from "../../lib/onlineCheckout.js";
import { useAuth } from "../../lib/store.jsx";

/** Buy product online — full payment or advance % (import requirements). */
export default function MainCheckoutModal({ open, onClose, product, mode = "full" }) {
  const { main } = useAuth();
  const nav = useNavigate();
  const [qty, setQty] = useState(product?.minOrderQty || 1);
  const [advancePct, setAdvancePct] = useState(30);
  const [gateways, setGateways] = useState([]);
  const [gateway, setGateway] = useState("razorpay");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const unitPrice = Number(product?.basePrice || 0);
  const lineTotal = unitPrice * Number(qty || 0);
  const payNow = mode === "advance" ? Math.round((lineTotal * advancePct) / 100) : lineTotal;

  useEffect(() => {
    if (!open) return;
    setQty(product?.minOrderQty || 1);
    mainApi("/payments/gateways").then((d) => {
      const g = (d.gateways || []).filter((x) => x.configured !== false).map((x) => x.name || x);
      setGateways(g);
      if (g[0]) setGateway(g[0]);
    }).catch(() => {});
  }, [open, product]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!main) {
      nav("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (payNow < 1) return setErr("Amount must be greater than zero");
    setLoading(true);
    try {
      const items = [{
        productId: product.id,
        name: product.name,
        qty: Number(qty),
        price: unitPrice,
        unit: product.unit,
      }];
      const d = await mainApi("/orders", {
        method: "POST",
        body: {
          items,
          gateway,
          payAmount: payNow,
          paymentNote: mode === "advance" ? `Advance ${advancePct}%` : "Full payment",
        },
      });
      if (d.payment) {
        await handleGatewayCheckout(d.payment, { amount: payNow, id: d.order?.id });
      }
      onClose?.();
      nav("/dashboard?tab=orders");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "advance" ? "Pay advance online" : "Buy now — pay online"}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        {!main && (
          <Alert type="info">Sign in to complete online payment. You will be redirected to login.</Alert>
        )}
        <p className="text-sm font-semibold text-navy">{product.name}</p>
        <p className="text-xs text-muted-foreground">{inr(unitPrice)}/{product.unit} · MOQ {product.minOrderQty} {product.unit}</p>

        <Field label="Quantity">
          <input
            className="input"
            type="number"
            min={product.minOrderQty || 1}
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>

        {mode === "advance" && (
          <Field label="Advance payment (%)">
            <select className="input" value={advancePct} onChange={(e) => setAdvancePct(Number(e.target.value))}>
              {[20, 30, 40, 50].map((p) => (
                <option key={p} value={p}>{p}% now — balance after confirmation</option>
              ))}
            </select>
          </Field>
        )}

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between"><span>Order value</span><strong>{inr(lineTotal)}</strong></div>
          <div className="mt-1 flex justify-between text-emerald-700 dark:text-emerald-400">
            <span>Pay now</span><strong>{inr(payNow)}</strong>
          </div>
          {mode === "advance" && payNow < lineTotal && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>Balance later</span><span>{inr(lineTotal - payNow)}</span>
            </div>
          )}
        </div>

        {gateways.length > 0 && (
          <Field label="Payment gateway">
            <select className="input" value={gateway} onChange={(e) => setGateway(e.target.value)}>
              {gateways.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
        )}

        <button className="btn-gold w-full" disabled={loading}>
          {loading ? "Starting payment…" : `Pay ${inr(payNow)} online`}
        </button>
      </form>
    </Modal>
  );
}
