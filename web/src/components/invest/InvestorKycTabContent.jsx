import { useState } from "react";
import { Alert } from "../ui.jsx";
import { TabPanel } from "./DashboardTabFallback.jsx";
import KycPanel from "./KycPanel.jsx";
import InvestorKycDetailsPanel from "./InvestorKycDetailsPanel.jsx";

/**
 * Pre-approval KYC tab: submitted → read-only details + documents; draft/rejected → form.
 */
export default function InvestorKycTabContent({
  kyc,
  kycPhase,
  pendingPayoutChange,
  pendingKycRevision,
  onRefresh,
}) {
  const [showForm, setShowForm] = useState(false);
  const hasSubmission = kyc && kyc.status && kyc.status !== "NOT_SUBMITTED";

  if (kycPhase === "needs_submit") {
    return (
      <TabPanel>
        <KycPanel
          kyc={kyc}
          pendingPayoutChange={pendingPayoutChange}
          pendingKycRevision={pendingKycRevision}
          onRefresh={onRefresh}
        />
      </TabPanel>
    );
  }

  const formBlock = showForm || kycPhase === "needs_fix" ? (
    <TabPanel>
      {showForm && kycPhase === "pending_review" && (
        <Alert type="info" className="mb-4">
          You can update your submission while it is under review. Changes may extend review time.
        </Alert>
      )}
      <KycPanel
        kyc={kyc}
        pendingPayoutChange={pendingPayoutChange}
        pendingKycRevision={pendingKycRevision}
        onRefresh={onRefresh}
      />
    </TabPanel>
  ) : null;

  return (
    <div className="space-y-6">
      {hasSubmission && (
        <InvestorKycDetailsPanel
          kyc={kyc}
          phase={kycPhase}
          onEditKyc={
            kycPhase === "pending_review" || kycPhase === "needs_fix"
              ? () => setShowForm(true)
              : undefined
          }
        />
      )}
      {formBlock}
    </div>
  );
}
