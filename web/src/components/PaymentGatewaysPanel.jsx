import { useEffect, useState } from "react";

import { Badge, Alert, Field, PasswordInput } from "./ui.jsx";
import { VisibilityPairToggles } from "./invest/PaymentModeVisibilityToggles.jsx";



const GATEWAY_LABELS = {

  razorpay: "Razorpay",

  cashfree: "Cashfree",

  payu: "PayU",

  easebuzz: "Easebuzz",

  hdfc: "HDFC Bank API",

  axis: "Axis Bank API",

  icici: "ICICI Bank API",

  yesbank: "Yes Bank API",

  juspay: "Juspay",

  eximpe: "EximPe",

  litepay: "LitePay",

  stripe: "Stripe",

  payglocal: "PayGlocal",

  xflowpay: "XflowPay",

  upi: "UPI Intent",

  RAZORPAYX: "RazorpayX Payouts",

  CASHFREE: "Cashfree Payouts",

  PAYU: "PayU Payouts",

  EASEBUZZ: "Easebuzz Payouts",

};



const GATEWAY_SETTING_KEYS = {

  razorpay: [

    { key: "gateway_razorpay_key_id", label: "Key ID" },

    { key: "gateway_razorpay_key_secret", label: "Key Secret", secret: true },

  ],

  cashfree: [

    { key: "gateway_cashfree_app_id", label: "App ID" },

    { key: "gateway_cashfree_secret", label: "Secret", secret: true },

  ],

  payu: [

    { key: "gateway_payu_key", label: "Merchant Key" },

    { key: "gateway_payu_salt", label: "Salt", secret: true },

  ],

  easebuzz: [

    { key: "gateway_easebuzz_key", label: "Merchant Key" },

    { key: "gateway_easebuzz_salt", label: "Salt", secret: true },

  ],

  hdfc: [

    { key: "bank_hdfc_client_id", label: "Client ID" },

    { key: "bank_hdfc_client_secret", label: "Client Secret", secret: true },

    { key: "bank_hdfc_corporate_id", label: "Corporate ID" },

  ],

  axis: [

    { key: "bank_axis_client_id", label: "Client ID" },

    { key: "bank_axis_client_secret", label: "Client Secret", secret: true },

    { key: "bank_axis_channel_id", label: "Channel ID" },

  ],

  icici: [

    { key: "bank_icici_api_key", label: "API Key" },

    { key: "bank_icici_api_secret", label: "API Secret", secret: true },

    { key: "bank_icici_corporate_id", label: "Corporate ID" },

  ],

  yesbank: [

    { key: "bank_yesbank_client_id", label: "Client ID" },

    { key: "bank_yesbank_client_secret", label: "Client Secret", secret: true },

    { key: "bank_yesbank_merchant_key", label: "Merchant Key" },

  ],

  litepay: [
    { key: "gateway_litepay_vendor_id", label: "Vendor ID" },
    { key: "gateway_litepay_secret", label: "Secret Key", secret: true },
    { key: "gateway_litepay_api_url", label: "API URL (optional)" },
  ],

  stripe: [
    { key: "gateway_stripe_publishable_key", label: "Publishable Key" },
    { key: "gateway_stripe_secret_key", label: "Secret Key", secret: true },
  ],

  payglocal: [
    { key: "gateway_payglocal_merchant_id", label: "Merchant ID" },
    { key: "gateway_payglocal_api_key", label: "API Key", secret: true },
    { key: "gateway_payglocal_api_url", label: "API URL (optional)" },
  ],

  xflowpay: [
    { key: "gateway_xflowpay_merchant_id", label: "Merchant ID" },
    { key: "gateway_xflowpay_api_key", label: "API Key", secret: true },
    { key: "gateway_xflowpay_api_url", label: "API URL (optional)" },
  ],

};



export default function PaymentGatewaysPanel({ fetchGateways, editable, saveSettings, loadSettings, onVisibilityChange }) {

  const [collection, setCollection] = useState([]);

  const [payouts, setPayouts] = useState([]);

  const [visibility, setVisibility] = useState({});

  const [settings, setSettings] = useState({});

  const [err, setErr] = useState("");

  const [msg, setMsg] = useState("");

  const loadGateways = () =>
    fetchGateways()
      .then((d) => {
        setCollection(d.collection || []);
        setPayouts(d.payouts || []);
        if (d.visibility && typeof d.visibility === "object") setVisibility(d.visibility);
      })
      .catch((e) => setErr(e.message));

  useEffect(() => {

    loadGateways();

    if (editable && loadSettings) {

      loadSettings().then((d) => setSettings(d.settings || {})).catch(() => {});

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  const patchVisibility = async (modeId, patch) => {
    if (!editable) return;
    const key = String(modeId).toLowerCase();
    const next = { ...visibility, [key]: { ...(visibility[key] || { deposit: true, withdraw: true }), ...patch } };
    setVisibility(next);
    try {
      await onVisibilityChange?.({ [key]: next[key] });
      setMsg("Visibility updated for investors.");
    } catch (e2) {
      setErr(e2.message);
      loadGateways();
    }
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));



  const save = async (e) => {

    e.preventDefault();

    setMsg(""); setErr("");

    try {

      const d = await saveSettings(settings);

      setSettings(d.settings);

      setMsg("Gateway credentials saved. Keys are used immediately for new payment orders.");

    } catch (e2) { setErr(e2.message); }

  };



  if (err && !collection.length) return <Alert type="error">{err}</Alert>;



  return (

    <div className="space-y-6">

      <Alert type="info">
        Configure API keys below. Use the on/off switches to control which payment modes investors see for <b>deposits</b> and <b>withdrawals</b> (Super Admin only).
      </Alert>

      {msg && <Alert type="success">{msg}</Alert>}

      {err && collection.length > 0 && <Alert type="error">{err}</Alert>}

      {editable && (
        <section className="card space-y-2 p-4">
          <h3 className="font-bold text-navy dark:text-white">Investor deposit categories</h3>
          {["upi", "bank", "gateway"].map((id) => (
            <VisibilityPairToggles
              key={id}
              modeId={id}
              visibility={visibility}
              onChange={patchVisibility}
              depositLabel={`Deposits — ${id === "upi" ? "UPI" : id === "bank" ? "Bank transfer" : "Online gateway"}`}
              withdrawLabel="Withdrawals (n/a)"
            />
          ))}
        </section>
      )}

      {editable && (
        <section className="card space-y-2 p-4">
          <h3 className="font-bold text-navy dark:text-white">Investor withdrawal methods</h3>
          {["UPI", "BANK"].map((id) => (
            <VisibilityPairToggles
              key={id}
              modeId={id}
              visibility={visibility}
              onChange={patchVisibility}
              depositLabel="Deposits (n/a)"
              withdrawLabel={`Withdrawals — ${id === "UPI" ? "UPI" : "Bank account"}`}
            />
          ))}
        </section>
      )}

      <section>

        <h3 className="mb-3 text-lg font-bold text-navy dark:text-white">Collection Gateways</h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {collection.filter((g) => !["hdfc", "axis", "icici", "yesbank"].includes(g.name)).map((g) => (

            <GatewayCard
              key={g.name}
              name={g.name}
              configured={g.configured}
              type="collection"
              modeId={g.name}
              visibility={visibility}
              editable={editable}
              onVisibilityChange={patchVisibility}
            />

          ))}

        </div>

      </section>



      <section>

        <h3 className="mb-3 text-lg font-bold text-navy dark:text-white">Bank API — Deposits & Payouts</h3>

        <p className="mb-3 text-sm text-slate-500">HDFC, Axis, ICICI and Yes Bank corporate APIs for collection and disbursement.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {collection.filter((g) => ["hdfc", "axis", "icici", "yesbank"].includes(g.name)).map((g) => (

            <GatewayCard
              key={g.name}
              name={g.name}
              configured={g.configured}
              type="bank-api"
              modeId={g.name}
              visibility={visibility}
              editable={editable}
              onVisibilityChange={patchVisibility}
            />

          ))}

        </div>

      </section>



      <section>

        <h3 className="mb-3 text-lg font-bold text-navy dark:text-white">Payout Gateways</h3>

        <div className="grid gap-3 sm:grid-cols-2">

          {payouts.map((g) => (

            <GatewayCard
              key={g.name}
              name={g.name}
              configured={g.configured}
              type="payout"
              modeId={g.name}
              visibility={visibility}
              editable={editable}
              onVisibilityChange={patchVisibility}
              depositLabel="Show for deposits"
              withdrawLabel="Show for withdrawals / payouts"
            />

          ))}

        </div>

      </section>



      {editable && (

        <form onSubmit={save} className="card space-y-4 p-5">

          <h3 className="font-bold text-navy dark:text-white">Edit Gateway Keys (Super Admin)</h3>

          {Object.entries(GATEWAY_SETTING_KEYS).map(([gw, fields]) => (

            <div key={gw} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">

              <h4 className="mb-3 font-semibold text-navy dark:text-white">{GATEWAY_LABELS[gw] || gw}</h4>

              <div className="grid gap-3 sm:grid-cols-2">

                {fields.map((f) => (

                  <Field key={f.key} label={f.label}>
                    {f.secret ? (
                      <PasswordInput
                        value={settings[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder="Leave blank to keep current"
                      />
                    ) : (
                      <input
                        className="input"
                        type="text"
                        value={settings[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    )}
                  </Field>

                ))}

              </div>

            </div>

          ))}

          <button className="btn-gold w-full sm:w-auto">Save Gateway Settings</button>

        </form>

      )}



      <section className="card p-5">

        <h3 className="mb-2 font-bold text-navy dark:text-white">Manual / Bank Transfer</h3>

        <p className="text-sm text-slate-500">Deposits require admin approval after proof upload.</p>

        <div className="mt-3 flex flex-wrap gap-2">

          {["IMPS", "NEFT", "RTGS", "UPI", "Visa", "Mastercard", "RuPay", "Paytm", "PhonePe", "GPay"].map((m) => (

            <span key={m} className="badge bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{m}</span>

          ))}

        </div>

      </section>

    </div>

  );

}



function GatewayCard({
  name,
  configured,
  type,
  modeId,
  visibility,
  editable,
  onVisibilityChange,
  depositLabel = "Show to investors for deposits",
  withdrawLabel = "Show to investors for withdrawals",
}) {
  const label = GATEWAY_LABELS[name] || GATEWAY_LABELS[name.toLowerCase()] || name;
  const id = String(modeId || name).toLowerCase();

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-navy dark:text-white">{label}</div>
          <div className="text-xs capitalize text-slate-400">{type}</div>
        </div>
        <Badge status={configured ? "ACTIVE" : "PENDING"} />
      </div>
      {editable && onVisibilityChange && (
        <VisibilityPairToggles
          modeId={id}
          visibility={visibility}
          onChange={onVisibilityChange}
          disabled={!editable}
          depositLabel={depositLabel}
          withdrawLabel={withdrawLabel}
        />
      )}
    </div>
  );
}



export function GatewayMethodSelect({ gateways, value, onChange, manualMethods = ["IMPS", "NEFT", "RTGS"] }) {

  const online = (gateways || []).map((g) => g.name.toUpperCase());

  return (

    <select className="input finance-select" value={value} onChange={(e) => onChange(e.target.value)}>

      {online.length > 0 && (

        <optgroup label="Online Gateways">

          {online.map((m) => <option key={m} value={m}>{m}{gateways.find((g) => g.name.toUpperCase() === m && !g.configured) ? " (mock)" : ""}</option>)}

        </optgroup>

      )}

      {manualMethods.length > 0 && (

        <optgroup label="Manual Bank Transfer">

          {manualMethods.map((m) => <option key={m} value={m}>{m}</option>)}

        </optgroup>

      )}

    </select>

  );

}


