import { Alert } from "../ui.jsx";
import { needsKycSetup } from "../../lib/investCompliance.js";
import KycPanel from "./KycPanel.jsx";

/**
 * Blocks investor dashboard until KYC is submitted (PENDING) or approved.
 * REJECTED / NOT_SUBMITTED → full-screen KYC wizard only.
 */
export default function InvestKycGate({ kyc, pendingPayoutChange, pendingKycRevision, onRefresh, children }) {
  if (!needsKycSetup(kyc)) {
    return children;
  }

  const rejected = kyc?.status === "REJECTED";

  return (
    <div className="page-stack max-w-3xl mx-auto">
      <Alert type={rejected ? "error" : "info"}>
        {rejected
          ? `Your KYC was rejected${kyc.remarks ? `: ${kyc.remarks}` : ""}. Update your details and documents below, then resubmit.`
          : "Complete KYC verification before using your investor dashboard. Upload all required documents and submit for team review."}
      </Alert>
      <KycPanel
        kyc={kyc}
        pendingPayoutChange={pendingPayoutChange}
        pendingKycRevision={pendingKycRevision}
        onRefresh={onRefresh}
        forced
      />
    </div>
  );
}
