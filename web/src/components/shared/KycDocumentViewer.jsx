import { Modal } from "../ui.jsx";

const DOC_FIELDS = [
  ["photo", "Passport Photo"],
  ["panDocument", "PAN"],
  ["aadhaarFront", "Aadhaar Front"],
  ["aadhaarBack", "Aadhaar Back"],
  ["aadhaarDocument", "Aadhaar PDF"],
  ["passportDocument", "Passport"],
  ["addressProof", "Address Proof"],
  ["selfie", "Selfie"],
  ["signature", "Signature"],
  ["cancelledCheque", "Cancelled Cheque"],
];

function isPdf(url) {
  return /\.pdf(\?|$)/i.test(url || "");
}

export default function KycDocumentViewer({ open, onClose, kyc, title }) {
  if (!open || !kyc) return null;
  const docs = DOC_FIELDS.map(([field, label]) => ({ field, label, url: kyc[field] })).filter((d) => d.url);

  return (
    <Modal open={open} onClose={onClose} title={title || `KYC documents — ${kyc.fullName || kyc.investor?.name || "Investor"}`} wide>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
        {docs.map(({ field, label, url }) => (
          <div key={field} className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            {isPdf(url) ? (
              <iframe title={label} src={url} className="h-80 w-full rounded border border-border bg-muted/20" />
            ) : (
              <img src={url} alt={label} className="mx-auto max-h-96 w-full rounded object-contain" />
            )}
            <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">Open in new tab</a>
          </div>
        ))}
      </div>
    </Modal>
  );
}
