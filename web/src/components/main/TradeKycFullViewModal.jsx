import { Badge, Modal } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import { TRADE_KYC_DOCUMENT_FIELDS } from "../../lib/trade-kyc-document-fields.js";
import { isIndiaCountry } from "../../lib/country-codes.js";

const DETAIL_FIELDS = [
  ["Partner type", (k) => k.partnerType],
  ["Country", (k) => (isIndiaCountry(k.country) ? "India" : k.country)],
  ["Full name", (k) => k.fullName],
  ["Company", (k) => k.companyName],
  ["Email", (k) => k.user?.email || k.email],
  ["Phone", (k) => (k.phoneCountryCode && k.phone ? `${k.phoneCountryCode} ${k.phone}` : k.phone)],
  ["Address", (k) => k.address],
  ["City", (k) => k.city],
  ["State", (k) => k.state],
  ["Postal code", (k) => k.postalCode],
  ["PAN", (k) => k.panNumber],
  ["Aadhaar", (k) => k.aadhaarNumber],
  ["GST", (k) => k.gstNumber],
  ["Passport", (k) => k.passportNumber],
  ["Tax ID", (k) => k.taxId],
  ["Company reg.", (k) => k.companyRegNo],
  ["Bank", (k) => k.bankName],
  ["Account", (k) => k.bankAccount],
  ["IFSC", (k) => k.ifscCode],
  ["SWIFT", (k) => k.swiftCode],
  ["Submitted", (k) => (k.createdAt ? new Date(k.createdAt).toLocaleString("en-IN") : null)],
  ["Verified", (k) => (k.verifiedAt ? new Date(k.verifiedAt).toLocaleString("en-IN") : null)],
];

export default function TradeKycFullViewModal({ open, onClose, kyc, onApprove, onReject, title }) {
  if (!kyc) return null;

  const heading = title || `Trade KYC — ${kyc.fullName || kyc.user?.name || "User"}`;

  return (
    <Modal open={open} onClose={onClose} title={heading} wide>
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={kyc.status} />
          {kyc.user?.email && <span className="text-sm text-muted-foreground">{kyc.user.email}</span>}
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {DETAIL_FIELDS.map(([label, get]) => {
            const v = get(kyc);
            if (!v) return null;
            return (
              <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-0.5 break-words font-medium text-foreground">{v}</div>
              </div>
            );
          })}
        </div>

        {kyc.remarks && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            Remarks: {kyc.remarks}
          </p>
        )}

        <div>
          <h4 className="mb-3 text-sm font-bold text-foreground">Uploaded documents</h4>
          <KycDocumentsList
            kyc={kyc}
            fields={TRADE_KYC_DOCUMENT_FIELDS}
            showMissing
            scope="main"
            locked={kyc.status === "APPROVED"}
          />
        </div>

        {kyc.status === "PENDING" && (onApprove || onReject) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {onApprove && (
              <button type="button" className="btn-gold text-sm" onClick={() => onApprove(kyc)}>
                Approve KYC
              </button>
            )}
            {onReject && (
              <button type="button" className="btn-outline text-sm text-rose-600" onClick={() => onReject(kyc)}>
                Reject KYC
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
