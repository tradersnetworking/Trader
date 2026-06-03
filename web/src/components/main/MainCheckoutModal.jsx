import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mainApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Modal, Field, Alert } from "../ui.jsx";
import { handleGatewayCheckout } from "../../lib/onlineCheckout.js";
import { useAuth } from "../../lib/store.jsx";

/** Buy product online — place order, then optional proceed to payment (full or advance %). */
export default function MainCheckoutModal({ open, onClose, product, mode = "full" }) {
  const { main } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState("form");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [payDue, setPayDue] = useState(0);
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
    setStep("form");
    setPlacedOrder(null);
    setPayDue(0);
    setErr("");
    setQty(product?.minOrderQty || 1);
    mainApi("/payments/gateways")
      .then((d) => {
        const g = (d.gateways || []).filter((x) => x.configured !== false).map((x) => x.name || x);
        setGateways(g);
        if (g[0]) setGateway(g[0]);
      })
      .catch(() => {});
  }, [open, product]);

  const buildItems = () => [
    {
      productId: product.id,
      name: product.name,
      qty: Number(qty),
      price: unitPrice,
      unit: product.unit,
    },
  ];

  const ensureLoggedIn = () => {
    if (!main) {
      nav("/login?next=" + encodeURIComponent(window.location.pathname));
      return false;
    }
    return true;
  };

  const placeOrder = async ({ startPayment }) => {
    if (!ensureLoggedIn()) return null;
    if (payNow < 1) {
      setErr("Amount must be greater than zero");
      return null;
    }
    setLoading(true);
    setErr("");
    try {
      const d = await mainApi("/orders", {
        method: "POST",
        body: {
          items: buildItems(),
          gateway,
          payAmount: payNow,
          paymentNote: mode === "advance" ? `Advance ${advancePct}%` : "Full payment",
          startPayment,
        },
      });
      setPlacedOrder(d.order);
      setPayDue(d.payAmountDue ?? payNow);
      setStep("success");
      return d;
    } catch (e2) {
      setErr(e2.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    await placeOrder({ startPayment: false });
  };

  const submitAndPay = async (e) => {
    e.preventDefault();
    const d = await placeOrder({ startPayment: true });
    if (!d) return;
    if (d.payment) {
      const opened = await handleGatewayCheckout(d.payment, { amount: payDue || payNow, id: d.order?.id });
      if (opened) return;
    }
    setErr("Order placed. Use Proceed to payment below when you are ready.");
  };

  const proceedToPayment = async () => {
    if (!placedOrder?.id) return;
    setLoading(true);
    setErr("");
    try {
      const d = await mainApi(`/orders/${placedOrder.id}/pay`, {
        method: "POST",
        body: { gateway, payAmount: payDue || payNow },
      });
      if (d.payment) {
        const opened = await handleGatewayCheckout(d.payment, {
          amount: payDue || payNow,
          id: placedOrder.id,
        });
        if (opened) return;
      }
      setErr("Could not open payment gateway. Check gateway settings or try again from My Orders.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  const goToOrders = () => {
    onClose?.();
    nav("/dashboard?tab=orders");
  };

  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === "success"
          ? "Order placed"
          : mode === "advance"
            ? "Pay advance online"
            : "Buy now — pay online"
      }
      wide
    >
      {step === "success" && placedOrder ? (
        <div className="space-y-4">
          {err && <Alert type="error">{err}</Alert>}
          <div className="text-center">
            <div className="mb-2 text-4xl">✅</div>
            <p className="font-semibold text-navy">Order {placedOrder.orderNumber} submitted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "advance"
                ? `Advance due: ${inr(payDue || payNow)} · Order value ${inr(lineTotal)}`
                : `Amount due: ${inr(payDue || payNow)}`}
            </p>
          </div>

          {gateways.length > 0 && (
            <Field label="Payment gateway">
              <select className="input" value={gateway} onChange={(e) => setGateway(e.target.value)}>
                {gateways.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <button type="button" className="btn-gold w-full" disabled={loading} onClick={proceedToPayment}>
            {loading ? "Opening payment…" : `Proceed to payment — ${inr(payDue || payNow)}`}
          </button>
          <button type="button" className="btn-outline w-full" onClick={goToOrders}>
            View my orders
          </button>
          <button type="button" className="w-full text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={submitOrder} className="space-y-4">
          {err && <Alert type="error">{err}</Alert>}
          {!main && (
            <Alert type="info">Sign in to place an order. You will be redirected to login.</Alert>
          )}
          <p className="text-sm font-semibold text-navy">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {inr(unitPrice)}/{product.unit} · MOQ {product.minOrderQty} {product.unit}
          </p>

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
                  <option key={p} value={p}>
                    {p}% now — balance after confirmation
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span>Order value</span>
              <strong>{inr(lineTotal)}</strong>
            </div>
            <div className="mt-1 flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>Pay now</span>
              <strong>{inr(payNow)}</strong>
            </div>
            {mode === "advance" && payNow < lineTotal && (
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>Balance later</span>
                <span>{inr(lineTotal - payNow)}</span>
              </div>
            )}
          </div>

          {gateways.length > 0 && (
            <Field label="Payment gateway (for online pay)">
              <select className="input" value={gateway} onChange={(e) => setGateway(e.target.value)}>
                {gateways.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <button className="btn-gold w-full" disabled={loading}>
            {loading ? "Placing order…" : "Place order"}
          </button>
          <button
            type="button"
            className="btn-outline w-full"
            disabled={loading}
            onClick={submitAndPay}
          >
            {loading ? "Please wait…" : `Place order & pay ${inr(payNow)} now`}
          </button>
        </form>
      )}
    </Modal>
  );
}
