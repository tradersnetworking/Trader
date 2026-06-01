import { useEffect, useState } from "react";

import { Badge, Alert, Field } from "./ui.jsx";



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

};



export default function PaymentGatewaysPanel({ fetchGateways, editable, saveSettings, loadSettings }) {

  const [collection, setCollection] = useState([]);

  const [payouts, setPayouts] = useState([]);

  const [settings, setSettings] = useState({});

  const [err, setErr] = useState("");

  const [msg, setMsg] = useState("");



  useEffect(() => {

    fetchGateways()

      .then((d) => {

        setCollection(d.collection || []);

        setPayouts(d.payouts || []);

      })

      .catch((e) => setErr(e.message));

    if (editable && loadSettings) {

      loadSettings().then((d) => setSettings(d.settings || {})).catch(() => {});

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



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

        Gateways run in <b>mock mode</b> until API keys are configured here or in server environment variables.

        IMPS, NEFT, RTGS and manual UPI always remain available.

      </Alert>

      {msg && <Alert type="success">{msg}</Alert>}

      {err && collection.length > 0 && <Alert type="error">{err}</Alert>}



      <section>

        <h3 className="mb-3 text-lg font-bold text-navy dark:text-white">Collection Gateways</h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {collection.filter((g) => !["hdfc", "axis", "icici", "yesbank"].includes(g.name)).map((g) => (

            <GatewayCard key={g.name} name={g.name} configured={g.configured} type="collection" />

          ))}

        </div>

      </section>



      <section>

        <h3 className="mb-3 text-lg font-bold text-navy dark:text-white">Bank API — Deposits & Payouts</h3>

        <p className="mb-3 text-sm text-slate-500">HDFC, Axis, ICICI and Yes Bank corporate APIs for collection and disbursement.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {collection.filter((g) => ["hdfc", "axis", "icici", "yesbank"].includes(g.name)).map((g) => (

            <GatewayCard key={g.name} name={g.name} configured={g.configured} type="bank-api" />

          ))}

        </div>

      </section>



      <section>

        <h3 className="mb-3 text-lg font-bold text-navy dark:text-white">Payout Gateways</h3>

        <div className="grid gap-3 sm:grid-cols-2">

          {payouts.map((g) => (

            <GatewayCard key={g.name} name={g.name} configured={g.configured} type="payout" />

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

                    <input

                      className="input"

                      type={f.secret ? "password" : "text"}

                      value={settings[f.key] || ""}

                      onChange={(e) => set(f.key, e.target.value)}

                      placeholder={f.secret ? "Leave blank to keep current" : ""}

                    />

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



function GatewayCard({ name, configured, type }) {

  const label = GATEWAY_LABELS[name] || GATEWAY_LABELS[name.toLowerCase()] || name;

  return (

    <div className="card flex items-center justify-between p-4">

      <div>

        <div className="font-semibold text-navy dark:text-white">{label}</div>

        <div className="text-xs capitalize text-slate-400">{type}</div>

      </div>

      <Badge status={configured ? "ACTIVE" : "PENDING"} />

    </div>

  );

}



export function GatewayMethodSelect({ gateways, value, onChange, manualMethods = ["IMPS", "NEFT", "RTGS"] }) {

  const online = (gateways || []).map((g) => g.name.toUpperCase());

  return (

    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>

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


