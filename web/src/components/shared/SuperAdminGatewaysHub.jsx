import { useState } from "react";
import PaymentGatewaysPanel from "../PaymentGatewaysPanel.jsx";
import DepositPaymentAccountsPanel from "../invest/DepositPaymentAccountsPanel.jsx";
import { Alert } from "../ui.jsx";

/**
 * Unified super-admin payment gateway dashboard (invest + main marketplace).
 * Uses the same invest DB settings from either portal when api routes are wired.
 */
export default function SuperAdminGatewaysHub({ api, showDepositAccounts = false }) {
  const [section, setSection] = useState("gateways");

  const fetchGateways = () => api("/admin/gateways");
  const loadSettings = () => api("/admin/settings/gateways");
  const saveSettings = (body) => api("/admin/settings/gateways", { method: "PUT", body });
  const onVisibilityChange = (modes) =>
    api("/admin/payment-mode-visibility", { method: "PUT", body: { modes } });

  return (
    <div className="space-y-4">
      <Alert type="info">
        Manage online payment gateways, API keys, and investor visibility. Changes apply to the invest portal
        wallet and deposits. Super Admin can use this screen from <strong>main</strong> or <strong>invest</strong> admin.
      </Alert>

      {showDepositAccounts && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection("gateways")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              section === "gateways" ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"
            }`}
          >
            Gateways & API keys
          </button>
          <button
            type="button"
            onClick={() => setSection("accounts")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              section === "accounts" ? "bg-primary/15 text-accent-tone" : "bg-muted text-muted-foreground"
            }`}
          >
            UPI / Bank / Online accounts
          </button>
        </div>
      )}

      {section === "gateways" && (
        <PaymentGatewaysPanel
          fetchGateways={fetchGateways}
          editable
          saveSettings={saveSettings}
          loadSettings={loadSettings}
          onVisibilityChange={onVisibilityChange}
        />
      )}

      {section === "accounts" && showDepositAccounts && (
        <DepositPaymentAccountsPanel editable accountsOnly />
      )}
    </div>
  );
}
