import { useState } from "react";
import { Alert } from "../ui.jsx";
import { TabPanel } from "./DashboardTabFallback.jsx";
import KycPanel from "./KycPanel.jsx";
import InvestorKycDetailsPanel from "./InvestorKycDetailsPanel.jsx";

/**
 * Pre-approval KYC tab — one view at a time (summary OR form) to avoid stacked/overlapping UI.
 */
export default function InvestorKycTabContent({
  kyc,
  kycPhase,
  pendingPayoutChange,
  pendingKycRevision,
  onRefresh,
}) {
  const [showForm, setShowForm] = useState(kycPhase === "needs_fix");
  const hasSubmission = kyc && kyc.status && kyc.status !== "NOT_SUBMITTED";

  if (kycPhase === "needs_submit") {
    return (
      <div className="invest-kyc-tab-root">
        <TabPanel>
          <KycPanel
            forced
            kyc={kyc}
            pendingPayoutChange={pendingPayoutChange}
            pendingKycRevision={pendingKycRevision}
            onRefresh={onRefresh}
          />
        </TabPanel>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="invest-kyc-tab-root page-stack mx-auto w-full max-w-3xl">
        {hasSubmission && (
          <button
            type="button"
            className="btn-outline w-full text-sm sm:w-auto"
            onClick={() => setShowForm(false)}
          >
            ← Back to KYC summary
          </button>
        )}
        {kycPhase === "pending_review" && (
          <Alert type="info">
            You can update your submission while it is under review. Changes may extend review time.
          </Alert>
        )}
        <TabPanel>
          <KycPanel
            forced
            kyc={kyc}
            pendingPayoutChange={pendingPayoutChange}
            pendingKycRevision={pendingKycRevision}
            onRefresh={onRefresh}
          />
        </TabPanel>
      </div>
    );
  }

  if (hasSubmission) {
    return (
      <div className="invest-kyc-tab-root">
        <InvestorKycDetailsPanel
          kyc={kyc}
          phase={kycPhase}
          onEditKyc={
            kycPhase === "pending_review" || kycPhase === "needs_fix"
              ? () => setShowForm(true)
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="invest-kyc-tab-root">
      <TabPanel>
        <KycPanel
          forced
          kyc={kyc}
          pendingPayoutChange={pendingPayoutChange}
          pendingKycRevision={pendingKycRevision}
          onRefresh={onRefresh}
        />
      </TabPanel>
    </div>
  );
}
