import { Badge, Modal } from "../ui.jsx";

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
  ["passbookDocument", "Bank Passbook"],
  ["bankStatementDocument", "Bank Statement"],
];

const DETAIL_FIELDS = [
  ["Full name", (k) => k.fullName],
  ["Guardian", (k) => (k.guardianType && k.guardianName ? `${k.guardianType}: ${k.guardianName}` : null)],
  ["Father's name", (k) => k.fatherName],
  ["Email", (k) => k.investor?.email],
  ["Phone", (k) => k.phone],
  ["WhatsApp", (k) => (k.whatsappNumber ? `${k.whatsappCountryCode || "+91"} ${k.whatsappNumber}` : null)],
  ["Date of birth", (k) => k.dob],
  ["House no.", (k) => k.houseNo],
  ["Street", (k) => k.street],
  ["Landmark", (k) => k.landmark],
  ["Area", (k) => k.area],
  ["District", (k) => k.district],
  ["Pincode", (k) => k.pincode],
  ["Country", (k) => k.country],
  ["State", (k) => k.state],
  ["City", (k) => k.city],
  ["Address", (k) => k.address],
  ["Bank proof", (k) => k.bankProofType],
  ["ID type", (k) => k.idType],
  ["ID number", (k) => k.idNumber],
  ["PAN", (k) => k.panNumber],
  ["Aadhaar", (k) => k.aadhaarNumber],
  ["Tax ID", (k) => k.taxId],
  ["Bank", (k) => k.bankName],
  ["Account", (k) => k.bankAccount],
  ["IFSC", (k) => k.ifscCode],
  ["Branch", (k) => k.branchName],
  ["UPI", (k) => k.upiId],
  ["Submitted", (k) => (k.createdAt ? new Date(k.createdAt).toLocaleString("en-IN") : null)],
  ["Verified", (k) => (k.verifiedAt ? new Date(k.verifiedAt).toLocaleString("en-IN") : null)],
];

function isPdf(url) {
  return /\.pdf(\?|$)/i.test(url || "");
}

export default function KycFullViewModal({ open, onClose, kyc, onApprove, onReject }) {
  if (!open || !kyc) return null;

  const title = kyc.fullName || kyc.investor?.name || "Investor";
  const docs = DOC_FIELDS.map(([field, label]) => ({ field, label, url: kyc[field] })).filter((d) => d.url);

  return (
    <Modal open={open} onClose={onClose} title={`Full KYC — ${title}`} wide>
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={kyc.status} />
          {kyc.investor?.email && <span className="text-sm text-muted-foreground">{kyc.investor.email}</span>}
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
          {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {docs.map(({ field, label, url }) => (
              <div key={field} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                {isPdf(url) ? (
                  <iframe title={label} src={url} className="h-64 w-full rounded border border-border bg-muted/20" />
                ) : (
                  <img src={url} alt={label} className="mx-auto max-h-64 w-full rounded object-contain" />
                )}
                <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">
                  Open in new tab
                </a>
              </div>
            ))}
          </div>
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
