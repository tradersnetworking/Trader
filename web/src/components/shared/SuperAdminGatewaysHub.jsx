import { useState } from "react";
import PaymentGatewaysPanel from "../PaymentGatewaysPanel.jsx";
import DepositPaymentAccountsPanel from "../invest/DepositPaymentAccountsPanel.jsx";
import { Alert } from "../ui.jsx";

/**
 * Unified super-admin payment gateway dashboard (invest + main marketplace).
 * Uses the same invest DB settings from either portal when api routes are wired.
 */
export default function SuperAdminGatewaysHub({
  api,
  showDepositAccounts = false,
  canEditApiKeys = false,
  canEditVisibility = false,
}) {
  const [section, setSection] = useState("gateways");

  const fetchGateways = () => api("/admin/gateways");
  const loadSettings = () => api("/admin/settings/gateways");
  const saveSettings = (body) => api("/admin/settings/gateways", { method: "PUT", body });
  const onVisibilityChange = (modes) =>
    api("/admin/payment-mode-visibility", { method: "PUT", body: { modes } });

  return (
    <div className="space-y-4">
      <Alert type="info">
        Turn each payment method on or off for deposits and withdrawals separately (e.g. crypto deposit without crypto withdraw).
        {canEditApiKeys
          ? " API keys are editable here (Super Admin)."
          : " API keys are Super Admin only; you can edit visibility and company accounts."}
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
            {canEditApiKeys ? "Gateways & API keys" : "Payment method visibility"}
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
          editable={canEditVisibility}
          canEditApiKeys={canEditApiKeys}
          saveSettings={canEditApiKeys ? saveSettings : undefined}
          loadSettings={canEditApiKeys ? loadSettings : undefined}
          onVisibilityChange={canEditVisibility ? onVisibilityChange : undefined}
        />
      )}

      {section === "accounts" && showDepositAccounts && canEditVisibility && (
        <DepositPaymentAccountsPanel editable accountsOnly hideApiKeysTab />
      )}
    </div>
  );
}
