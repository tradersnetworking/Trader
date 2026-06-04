import { useEffect, useRef, useState } from "react";

import { Badge, Alert, Field, PasswordInput } from "./ui.jsx";
import { VisibilityPairToggles } from "./invest/PaymentModeVisibilityToggles.jsx";
import { INVESTOR_PAYMENT_VISIBILITY, BANK_TRANSFER_DEPOSIT_TYPES } from "../lib/payment-visibility-modes.js";



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

  phonepe: "PhonePe",

  paypal: "PayPal",

  litepay: "LitePay",

  stripe: "Stripe",

  payglocal: "PayGlocal",

  xflowpay: "XflowPay",

  pinlabs: "Pine Labs",

  upi: "UPI Intent",

  RAZORPAYX: "RazorpayX Payouts",

  CASHFREE: "Cashfree Payouts",

  PAYU: "PayU Payouts",

  EASEBUZZ: "Easebuzz Payouts",

  razorpayx: "RazorpayX Payouts",

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

  pinlabs: [
    { key: "gateway_pinlabs_client_id", label: "Client ID" },
    { key: "gateway_pinlabs_client_secret", label: "Client Secret", secret: true },
    { key: "gateway_pinlabs_api_base", label: "API base URL (optional, UAT: https://pluraluat.v2.pinepg.in)" },
  ],

};

const MASKED = "••••••••";

function normalizeVisibility(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    out[String(key).toLowerCase()] = {
      deposit: val?.deposit !== false,
      withdraw: val?.withdraw !== false,
    };
  }
  return out;
}

function buildGatewayPayload(settings) {
  const payload = {};
  for (const fields of Object.values(GATEWAY_SETTING_KEYS)) {
    for (const f of fields) {
      const v = settings[f.key];
      if (v === undefined || v === null) continue;
      if (f.secret && (v === "" || v === MASKED)) continue;
      payload[f.key] = String(v).trim();
    }
  }
  return payload;
}

export default function PaymentGatewaysPanel({
  fetchGateways,
  editable = false,
  canEditApiKeys = false,
  saveSettings,
  loadSettings,
  onVisibilityChange,
}) {
  const visibilityEditable = Boolean(editable);
  const apiKeysEditable = Boolean(canEditApiKeys && saveSettings);

  const [collection, setCollection] = useState([]);

  const [payouts, setPayouts] = useState([]);

  const [visibility, setVisibility] = useState({});

  const [settings, setSettings] = useState({});

  const [err, setErr] = useState("");

  const [msg, setMsg] = useState("");

  const [saving, setSaving] = useState(false);

  const [savedFlash, setSavedFlash] = useState(false);

  const saveFormRef = useRef(null);

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

    if (apiKeysEditable && loadSettings) {
      loadSettings().then((d) => setSettings(d.settings || {})).catch(() => {});
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  const patchVisibility = async (modeId, patch) => {
    if (!visibilityEditable || !onVisibilityChange) return;
    const key = String(modeId).toLowerCase();
    const next = { ...visibility, [key]: { ...(visibility[key] || { deposit: true, withdraw: true }), ...patch } };
    setVisibility(next);
    setErr("");
    try {
      const res = await onVisibilityChange({ [key]: next[key] });
      const modes = normalizeVisibility(res?.modes ?? res?.visibility);
      if (modes && Object.keys(modes).length) setVisibility(modes);
      setMsg(`Visibility saved for ${GATEWAY_LABELS[key] || GATEWAY_LABELS[modeId] || key}.`);
    } catch (e2) {
      setErr(e2.message || "Failed to update visibility.");
      loadGateways();
    }
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));



  const save = async (e) => {
    e?.preventDefault?.();
    setMsg("");
    setErr("");
    setSavedFlash(false);
    if (!saveSettings) {
      setErr("You do not have permission to save gateway settings.");
      return;
    }
    const payload = buildGatewayPayload(settings);
    setSaving(true);
    try {
      const d = await saveSettings(payload);
      setSettings(d?.settings || {});
      setMsg(
        d?.message ||
          (Object.keys(payload).length
            ? "Gateway settings saved successfully."
            : "No changes sent. Enter a key or ID to save (leave secrets blank to keep current values).")
      );
      setSavedFlash(true);
      saveFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        await loadGateways();
      } catch {
        /* gateway list refresh is optional */
      }
      window.setTimeout(() => setSavedFlash(false), 5000);
    } catch (e2) {
      setErr(e2.message || "Failed to save gateway settings.");
      setSavedFlash(false);
    } finally {
      setSaving(false);
    }
  };

  const gatewayKeysForm =
    apiKeysEditable ? (
      <form
        id="gateway-settings-form"
        ref={saveFormRef}
        onSubmit={save}
        className="card space-y-4 border-2 border-primary/20 p-5"
      >
        <h3 className="font-bold text-navy dark:text-white">Edit Gateway Keys (Super Admin)</h3>
        <p className="text-sm text-muted-foreground">
          Enter API credentials below, then click <strong>Save Gateway Settings</strong>. Secret fields left blank keep their existing values.
        </p>

        {Object.entries(GATEWAY_SETTING_KEYS).map(([gw, fields]) => (
          <div key={gw} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h4 className="mb-3 font-semibold text-navy dark:text-white">{GATEWAY_LABELS[gw] || gw}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.secret ? (
                    <PasswordInput
                      value={settings[f.key] || ""}
                      onChange={(ev) => set(f.key, ev.target.value)}
                      placeholder="Leave blank to keep current"
                    />
                  ) : (
                    <input
                      className="input"
                      type="text"
                      value={settings[f.key] || ""}
                      onChange={(ev) => set(f.key, ev.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        ))}

        {(msg || err) && (
          <div className="space-y-2 rounded-lg bg-muted/40 p-3">
            {msg && (
              <Alert type="success" role="status">
                {msg}
              </Alert>
            )}
            {err && (
              <Alert type="error" role="alert">
                {err}
              </Alert>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            type="submit"
            className="btn-gold w-full sm:w-auto"
            disabled={saving}
          >
            {saving ? "Saving…" : savedFlash ? "Saved ✓" : "Save Gateway Settings"}
          </button>
          {savedFlash && !saving && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" role="status">
              ✓ Confirmed — settings saved
            </span>
          )}
        </div>
      </form>
    ) : null;



  if (err && !collection.length) return <Alert type="error">{err}</Alert>;



  return (

    <div className="space-y-6">

      <Alert type="info">
        Turn each payment method on or off for <b>deposits</b> and <b>withdrawals</b> independently (e.g. crypto deposit on without crypto withdraw).
        {apiKeysEditable ? " API keys below are Super Admin only." : visibilityEditable ? " API key editing requires Super Admin." : ""}
      </Alert>

      {gatewayKeysForm}

      {err && collection.length > 0 && !gatewayKeysForm && <Alert type="error">{err}</Alert>}

      {visibilityEditable && (
        <section className="card space-y-3 p-4">
          <h3 className="font-bold text-navy dark:text-white">Investor payment methods</h3>
          <p className="text-xs text-muted-foreground">
            Each row has separate switches for deposits and withdrawals. They do not need to match.
          </p>
          {INVESTOR_PAYMENT_VISIBILITY.map((mode) => (
            <div key={mode.id} className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold text-foreground">{mode.label}</p>
              {mode.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{mode.hint}</p>}
              <VisibilityPairToggles
                modeId={mode.id}
                visibility={visibility}
                onChange={patchVisibility}
                showDeposit={mode.showDeposit}
                showWithdraw={mode.showWithdraw}
                depositLabel="Deposits — show to investors"
                withdrawLabel="Withdrawals — show to investors"
              />
            </div>
          ))}
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank transfer types (deposits only)</p>
            {BANK_TRANSFER_DEPOSIT_TYPES.map((t) => (
              <VisibilityPairToggles
                key={t.id}
                modeId={t.id}
                visibility={visibility}
                onChange={patchVisibility}
                showDeposit
                showWithdraw={false}
                depositLabel={`${t.label} deposits`}
              />
            ))}
          </div>
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
              editable={visibilityEditable}
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
              editable={visibilityEditable}
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
              editable={visibilityEditable}
              onVisibilityChange={patchVisibility}
              showDeposit={false}
              withdrawLabel="Withdrawals / payouts — show to investors"
            />

          ))}

        </div>

      </section>



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
  depositLabel = "Deposits — show to investors",
  withdrawLabel = "Withdrawals — show to investors",
  showDeposit = true,
  showWithdraw = true,
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
          showDeposit={showDeposit}
          showWithdraw={showWithdraw}
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


