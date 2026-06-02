import { Alert } from "../ui.jsx";
import { investEligibility } from "../../lib/investCompliance.js";

/** Shown until KYC is approved and bank details are on file. */
export default function KycCompleteNotice({ investor, kyc, onCompleteKyc }) {
  const { canInvest, message, missing } = investEligibility(investor, kyc);
  if (canInvest) return null;

  const pending = missing.includes("kyc_pending");

  return (
    <Alert type={pending ? "info" : "warning"}>
      <p className="font-semibold text-foreground">
        {pending ? "KYC under review" : "Complete verification to invest"}
      </p>
      <p className="mt-1 text-sm">{message}</p>
      {!pending && (
        <button
          type="button"
          className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          onClick={onCompleteKyc}
        >
          Complete KYC →
        </button>
      )}
    </Alert>
  );
}
