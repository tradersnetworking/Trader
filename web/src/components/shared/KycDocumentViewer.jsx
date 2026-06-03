import { Modal } from "../ui.jsx";
import SecureUploadLink from "../invest/SecureUploadLink.jsx";

const DOC_FIELDS = [
  ["photo", "Passport Photo"],
  ["panDocument", "PAN"],
  ["aadhaarFront", "Aadhaar Front"],
  ["aadhaarBack", "Aadhaar Back"],
  ["aadhaarDocument", "Aadhaar PDF"],
  ["passportDocument", "Passport"],
  ["addressProof", "Address Proof"],
  ["companyRegDoc", "Company Registration"],
  ["bankProof", "Bank Proof"],
  ["selfie", "Selfie"],
  ["signature", "Signature"],
  ["cancelledCheque", "Cancelled Cheque"],
];

export default function KycDocumentViewer({ open, onClose, kyc, title, scope = "invest" }) {
  if (!kyc) return null;
  const docs = DOC_FIELDS.map(([field, label]) => ({ field, label, url: kyc[field] })).filter((d) => d.url);

  return (
    <Modal open={open} onClose={onClose} title={title || `KYC documents — ${kyc.fullName || kyc.investor?.name || "Investor"}`} wide>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
        {docs.map(({ field, label, url }) => (
          <div key={field} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <SecureUploadLink url={url} previewTitle={label} scope={scope}>
              View
            </SecureUploadLink>
          </div>
        ))}
      </div>
    </Modal>
  );
}
