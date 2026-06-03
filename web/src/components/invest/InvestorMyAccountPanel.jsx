import { Badge } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import { KYC_DOCUMENT_FIELDS } from "../../lib/kyc-document-fields.js";

const BANK_PROOF_KEYS = new Set(["cancelledCheque", "passbookDocument", "bankStatementDocument"]);

const BANK_PROOF_FIELDS = KYC_DOCUMENT_FIELDS.filter((f) => BANK_PROOF_KEYS.has(f.key));

function accountRows(kyc, investor) {
  const fromKyc = kyc && kyc.status && kyc.status !== "NOT_SUBMITTED";
  return [
    ["Name", (fromKyc && kyc.fullName) || investor?.name],
    ["Email", investor?.email],
    ["Phone", (fromKyc && kyc.phone) || investor?.phone],
    ["UPI ID", (fromKyc && kyc.upiId) || investor?.upiId],
    ["Bank", (fromKyc && kyc.bankName) || investor?.bankName],
    ["Account number", (fromKyc && kyc.bankAccount) || investor?.accountNumber],
    ["IFSC", (fromKyc && kyc.ifscCode) || investor?.ifsc],
    ["Branch", fromKyc && kyc.branchName],
  ].filter(([, v]) => v);
}

/** Pre-approval My Account — payout/bank details and bank proof uploads from KYC. */
export default function InvestorMyAccountPanel({ kyc, investor }) {
  const rows = accountRows(kyc, investor);
  const kycStatus = kyc?.status;

  return (
    <div className="page-stack mx-auto max-w-2xl">
      <div className="card space-y-4 p-5 sm:p-6">
        <div>
          {kycStatus && <Badge status={kycStatus} />}
          <h2 className="mt-2 text-lg font-bold text-foreground">Account details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bank and contact information from your KYC submission. Full profile editing unlocks after approval.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No account details yet. Complete KYC to add bank and payout information.
          </p>
        ) : (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-0.5 break-words font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-bold text-foreground">Uploaded bank proof</h3>
          {kyc && kyc.status !== "NOT_SUBMITTED" ? (
            <KycDocumentsList kyc={kyc} fields={BANK_PROOF_FIELDS} scope="invest" showMissing />
          ) : (
            <p className="text-sm text-muted-foreground">Bank proof uploads appear here after you submit KYC.</p>
          )}
        </div>
      </div>
    </div>
  );
}
