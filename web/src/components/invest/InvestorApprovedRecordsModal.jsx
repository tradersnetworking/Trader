import { useEffect, useState } from "react";
import { Badge, Modal } from "../ui.jsx";
import KycDocumentsList from "../shared/KycDocumentsList.jsx";
import { KYC_DETAIL_FIELDS } from "../../lib/kyc-detail-display.js";
import { KYC_DOCUMENT_FIELDS } from "../../lib/kyc-document-fields.js";

const TABS = [
  { id: "kyc", label: "KYC details" },
  { id: "bank", label: "Bank account" },
  { id: "documents", label: "Uploaded files" },
];

const BANK_LABELS = new Set(["Bank proof", "Bank", "Account", "IFSC", "Branch", "UPI"]);

const BANK_PROOF_KEYS = new Set(["cancelledCheque", "passbookDocument", "bankStatementDocument"]);
const BANK_PROOF_FIELDS = KYC_DOCUMENT_FIELDS.filter((f) => BANK_PROOF_KEYS.has(f.key));

function maskAadhaar(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 4) return value;
  return `XXXX XXXX ${digits.slice(-4)}`;
}

function displayValue(label, raw) {
  if (!raw) return null;
  if (label === "Aadhaar") return maskAadhaar(raw);
  return raw;
}

function DetailGrid({ fields, kyc }) {
  const rows = fields
    .map(([label, get]) => {
      const v = displayValue(label, get(kyc));
      if (!v) return null;
      return (
        <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 break-words font-medium text-foreground">{v}</div>
        </div>
      );
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No details on file.</p>;
  }

  return <div className="grid gap-3 text-sm sm:grid-cols-2">{rows}</div>;
}

/** Read-only popup for approved investors — KYC, bank, and document previews. */
export default function InvestorApprovedRecordsModal({
  open,
  onClose,
  kyc,
  investor,
  initialTab = "kyc",
}) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!kyc) return null;

  const kycFields = KYC_DETAIL_FIELDS.filter(([label]) => !BANK_LABELS.has(label));
  const bankFields = KYC_DETAIL_FIELDS.filter(([label]) => BANK_LABELS.has(label));

  const kycWithInvestor = investor ? { ...kyc, investor: { ...kyc.investor, ...investor } } : kyc;

  const activeLabel = TABS.find((t) => t.id === tab)?.label || "Records";

  return (
    <Modal open={open} onClose={onClose} title={`Approved ${activeLabel}`} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={kyc.status} />
          <span className="text-sm text-muted-foreground">{kyc.fullName || investor?.name}</span>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border pb-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-primary/15 text-accent-tone"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto pr-1" role="tabpanel">
          {tab === "kyc" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Personal and identity information from your approved KYC. Tap View on any file in the Uploaded files tab.
              </p>
              <DetailGrid fields={kycFields} kyc={kycWithInvestor} />
            </div>
          )}

          {tab === "bank" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Payout bank account and UPI used for withdrawals (from your approved KYC).
              </p>
              <DetailGrid fields={bankFields} kyc={kycWithInvestor} />
              <div>
                <h4 className="mb-2 text-sm font-bold text-foreground">Bank proof uploads</h4>
                <KycDocumentsList
                  kyc={kyc}
                  fields={BANK_PROOF_FIELDS}
                  scope="invest"
                  locked
                />
              </div>
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                All documents from your approved KYC. Use View to preview in a new panel, or Open / Download as needed.
              </p>
              <KycDocumentsList kyc={kyc} scope="invest" locked />
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <button type="button" className="btn-outline text-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
