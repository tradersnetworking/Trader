import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";
import { gatewayOptionLabel } from "../../lib/payment-providers.js";

/** Super admin: default online deposit gateway pre-selected for investors. */
export default function DefaultDepositGatewaySettings() {
  const [form, setForm] = useState({ default_deposit_gateway: "RAZORPAY" });
  const [gateways, setGateways] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    investApi("/admin/settings").then((d) => setForm({
      default_deposit_gateway: d.settings?.default_deposit_gateway || "RAZORPAY",
    })).catch(() => {});
    investApi("/admin/gateways").then((d) => setGateways(d.collection || [])).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await investApi("/admin/settings", { method: "PUT", body: form });
    setMsg("Default deposit gateway saved. Investors see this pre-selected but can choose another.");
  };

  const names = [...new Set([
    "RAZORPAY", "CASHFREE", "PAYU", "EASEBUZZ", "JUSPAY", "EXIMPE", "HDFC", "AXIS", "ICICI", "YESBANK", "PHONEPE", "PAYPAL",
    ...gateways.map((g) => g.name?.toUpperCase()).filter(Boolean),
  ])];

  return (
    <form onSubmit={save} className="card mb-4 space-y-3 p-4">
      <h4 className="text-sm font-bold">Default deposit gateway (online checkout)</h4>
      <p className="text-xs text-muted-foreground">
        Pre-selects the payment gateway for investors on the deposit page. They can change it before paying. UPI and bank transfers always require proof upload.
      </p>
      {msg && <Alert type="success">{msg}</Alert>}
      <Field label="Default gateway">
        <select className="input max-w-md" value={form.default_deposit_gateway} onChange={(e) => setForm({ ...form, default_deposit_gateway: e.target.value })}>
          {names.map((n) => (
            <option key={n} value={n}>{gatewayOptionLabel(n, gateways.some((g) => g.name?.toUpperCase() === n && g.configured))}</option>
          ))}
        </select>
      </Field>
      <button className="btn-outline text-xs">Save default deposit gateway</button>
    </form>
  );
}
