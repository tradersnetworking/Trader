import { useEffect, useState } from "react";

import { investApi } from "../../lib/api.js";

import { inr } from "../../lib/format.js";

import { BANK_API_PROVIDERS, providerLabel } from "../../lib/payment-providers.js";

import { Alert, Badge, Field, Modal } from "../ui.jsx";

import PaymentGatewaysPanel from "../PaymentGatewaysPanel.jsx";
import UpiQrDisplay from "../shared/UpiQrDisplay.jsx";
import DefaultDepositGatewaySettings from "./DefaultDepositGatewaySettings.jsx";
import PaymentRoutingBanner from "../shared/PaymentRoutingBanner.jsx";



const TABS = [

  { id: "upi", label: "UPI" },

  { id: "bank", label: "Bank Transfer" },

  { id: "online", label: "Online Gateways" },

  { id: "keys", label: "API Keys" },

];



const emptyForm = (type) => ({

  name: "",

  type,

  upiId: "",

  accountHolder: "",

  bankName: "",

  accountNumber: "",

  ifsc: "",

  branchName: "",

  qrCodeUrl: "",

  provider: type === "online" ? "razorpay" : "",

  minAmount: 100000,

  maxAmount: "",

  isEnabled: true,

  sortOrder: 0,

});



export default function DepositPaymentAccountsPanel({ editable = false }) {

  const [tab, setTab] = useState("upi");

  const [gateways, setGateways] = useState([]);

  const [open, setOpen] = useState(false);

  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(emptyForm("upi"));

  const [err, setErr] = useState("");

  const [msg, setMsg] = useState("");



  const load = () => investApi("/admin/payment-gateways").then((d) => setGateways(d.gateways || [])).catch((e) => setErr(e.message));

  useEffect(() => { load(); }, []);



  const filtered =
    tab === "bank-api"
      ? gateways.filter((g) => g.type === "online" && BANK_API_PROVIDERS.has((g.provider || "").toLowerCase()))
      : tab === "online"
      ? gateways.filter((g) => g.type === "online" && !BANK_API_PROVIDERS.has((g.provider || "").toLowerCase()))
      : gateways.filter((g) => g.type === tab);



  const openNew = () => {
    setEditing(null);
    const next = emptyForm(tab === "keys" || tab === "bank-api" ? "online" : tab);
    if (tab === "bank-api") next.provider = "hdfc";
    setForm(next);
    setErr("");
    setOpen(true);
  };



  const openEdit = (g) => {

    setEditing(g);

    setForm({ ...g, maxAmount: g.maxAmount ?? "" });

    setErr("");

    setOpen(true);

  };



  const save = async (e) => {

    e.preventDefault();

    setErr("");

    try {

      const body = { ...form, maxAmount: form.maxAmount === "" ? null : Number(form.maxAmount) };

      if (editing) await investApi(`/admin/payment-gateways/${editing.id}`, { method: "PATCH", body });

      else await investApi("/admin/payment-gateways", { method: "POST", body });

      setOpen(false);

      setMsg("Payment account saved.");

      load();

    } catch (e2) {

      setErr(e2.message);

    }

  };



  const del = async (id) => {

    if (!confirm("Delete this payment account?")) return;

    await investApi(`/admin/payment-gateways/${id}`, { method: "DELETE" });

    load();

  };



  const toggle = async (g) => {

    if (!editable) return;

    await investApi(`/admin/payment-gateways/${g.id}`, { method: "PATCH", body: { isEnabled: !g.isEnabled } });

    load();

  };



  return (

    <div className="space-y-6">

      <Alert type="info">

        Configure deposit & withdrawal payment accounts. Add multiple UPI IDs and bank accounts — investors choose from a dropdown when depositing. Super Admin can add, edit and enable/disable accounts.

        Investors see enabled accounts on the deposit page.

      </Alert>

      {msg && <Alert type="success">{msg}</Alert>}

      {err && !gateways.length && <Alert type="error">{err}</Alert>}



      <div className="flex flex-wrap gap-2">

        {TABS.map((t) => (

          <button

            key={t.id}

            type="button"

            onClick={() => setTab(t.id)}

            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"}`}

          >

            {t.label}

          </button>

        ))}

      </div>



      {tab === "keys" ? (

        editable ? (

          <>

            <DefaultDepositGatewaySettings />

            <PaymentRoutingBanner />

            <PaymentGatewaysPanel

              fetchGateways={() => investApi("/admin/gateways")}

              editable

              saveSettings={(body) => investApi("/admin/settings", { method: "PUT", body })}

              loadSettings={() => investApi("/admin/settings")}

            />

          </>

        ) : (

          <PaymentGatewaysPanel fetchGateways={() => investApi("/admin/gateways")} />

        )

      ) : (

        <>

          {editable && tab !== "keys" && (

            <button type="button" className="btn-primary" onClick={openNew}>

              + Add {TABS.find((t) => t.id === tab)?.label} Account

            </button>

          )}



          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {filtered.map((g) => (

              <div key={g.id} className="card p-4">

                <div className="flex items-start justify-between gap-2">

                  <div className="min-w-0">

                    <div className="font-bold text-foreground">{g.name}</div>

                    <div className="text-xs capitalize text-muted-foreground">
                      {g.type}{g.provider ? ` · ${providerLabel(g.provider)}` : ""}
                    </div>

                  </div>

                  <button type="button" onClick={() => toggle(g)} disabled={!editable}>

                    <Badge status={g.isEnabled ? "ACTIVE" : "REJECTED"} />

                  </button>

                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">

                  {g.type === "upi" && g.upiId && (
                    <>
                      <div>UPI: <span className="font-mono text-foreground">{g.upiId}</span></div>
                      <UpiQrDisplay vpa={g.upiId} payeeName={g.accountHolder} storedQrUrl={g.qrCodeUrl} className="mt-2" />
                    </>
                  )}

                  {g.type === "bank" && (

                    <>

                      {g.bankName && <div>{g.bankName}</div>}

                      {g.accountNumber && <div className="font-mono">{g.accountNumber}</div>}

                      {g.ifsc && <div>IFSC: {g.ifsc}</div>}

                    </>

                  )}

                  {g.type === "online" && <div>Provider: {providerLabel(g.provider) || "—"}</div>}

                  <div>Min: {inr(g.minAmount)}{g.maxAmount ? ` · Max: ${inr(g.maxAmount)}` : ""}</div>

                </div>

                {editable && (

                  <div className="mt-3 flex gap-2">

                    <button type="button" className="btn-outline flex-1 text-xs" onClick={() => openEdit(g)}>Edit</button>

                    <button type="button" className="btn-outline flex-1 text-xs text-rose-500" onClick={() => del(g.id)}>Delete</button>

                  </div>

                )}

              </div>

            ))}

          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No {TABS.find((t) => t.id === tab)?.label?.toLowerCase() || tab} accounts configured.
            </p>
          )}

        </>

      )}



      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Payment Account" : "Add Payment Account"} wide>

        <form onSubmit={save} className="space-y-3">

          {err && <Alert type="error">{err}</Alert>}

          <Field label="Display Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>

          {form.type === "upi" && (

            <>

              <Field label="UPI ID"><input className="input font-mono" required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></Field>

              <Field label="Account Holder Name"><input className="input" value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} /></Field>

              <Field label="QR Code URL (optional — auto-generated if blank)"><input className="input" value={form.qrCodeUrl} onChange={(e) => setForm({ ...form, qrCodeUrl: e.target.value })} placeholder="Leave blank to auto-generate from UPI ID" /></Field>
              {form.upiId && <UpiQrDisplay vpa={form.upiId} payeeName={form.accountHolder} storedQrUrl={form.qrCodeUrl || undefined} className="py-2" />}

            </>

          )}

          {form.type === "bank" && (

            <div className="grid gap-3 sm:grid-cols-2">

              <Field label="Account Holder"><input className="input" required value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} /></Field>

              <Field label="Bank Name"><input className="input" required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>

              <Field label="Account Number"><input className="input font-mono" required value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></Field>

              <Field label="IFSC"><input className="input font-mono" required value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></Field>

              <Field label="Branch"><input className="input" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} /></Field>

            </div>

          )}

          {form.type === "online" && (
            <Field label="Provider">
              <select className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                {(tab === "bank-api"
                  ? ["hdfc", "axis", "icici", "yesbank"]
                  : ["razorpay", "cashfree", "payu", "easebuzz", "juspay", "eximpe"]
                ).map((p) => (
                  <option key={p} value={p}>{providerLabel(p)}</option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">

            <Field label="Min Amount (₹)"><input className="input" type="number" min={1} value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} /></Field>

            <Field label="Max Amount (₹, optional)"><input className="input" type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} /></Field>

          </div>

          <Field label="Sort Order"><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} /> Enabled for investors</label>

          <button className="btn-gold w-full">{editing ? "Update Account" : "Create Account"}</button>

        </form>

      </Modal>

    </div>

  );

}

