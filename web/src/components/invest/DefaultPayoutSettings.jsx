import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";

/** Super admin: default payout gateway to reduce release failures. */
export default function DefaultPayoutSettings() {
  const [form, setForm] = useState({ default_payout_gateway: "RAZORPAYX", default_payout_prefer_bank: "false" });
  const [gateways, setGateways] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    investApi("/admin/settings").then((d) => setForm({
      default_payout_gateway: d.settings?.default_payout_gateway || "RAZORPAYX",
      default_payout_prefer_bank: d.settings?.default_payout_prefer_bank || "false",
    })).catch(() => {});
    investApi("/admin/gateways").then((d) => setGateways(d.payouts || [])).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await investApi("/admin/settings", { method: "PUT", body: form });
    setMsg("Default payout settings saved.");
  };

  const names = [...new Set(["RAZORPAYX", "CASHFREE", "PAYU", "EASEBUZZ", "HDFC", "AXIS", "ICICI", "YESBANK", ...gateways.map((g) => g.name)])];

  return (
    <form onSubmit={save} className="card mb-4 space-y-3 p-4">
      <h4 className="text-sm font-bold">Default payout channel</h4>
      <p className="text-xs text-muted-foreground">Pre-select gateway when releasing withdrawals to avoid failures from empty payout wallets on other channels.</p>
      {msg && <Alert type="success">{msg}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Default gateway">
          <select className="input" value={form.default_payout_gateway} onChange={(e) => setForm({ ...form, default_payout_gateway: e.target.value })}>
            {names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Prefer bank API when available">
          <select className="input" value={form.default_payout_prefer_bank} onChange={(e) => setForm({ ...form, default_payout_prefer_bank: e.target.value })}>
            <option value="false">No — use default gateway above</option>
            <option value="true">Yes — auto-pick first configured bank API</option>
          </select>
        </Field>
      </div>
      <button className="btn-outline text-xs">Save default payout</button>
    </form>
  );
}
