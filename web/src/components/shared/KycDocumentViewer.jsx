import { Modal } from "../ui.jsx";
import KycDocumentsList from "./KycDocumentsList.jsx";
import { KYC_DOCUMENT_FIELDS } from "../../lib/kyc-document-fields.js";
import { TRADE_KYC_DOCUMENT_FIELDS } from "../../lib/trade-kyc-document-fields.js";

/** Admin modal — full KYC document review (Kuber-style list with View / Download). */
export default function KycDocumentViewer({
  open,
  onClose,
  kyc,
  title,
  scope = "invest",
  showMissing = true,
  wide = true,
}) {
  if (!kyc) return null;
  const fields = scope === "main" ? TRADE_KYC_DOCUMENT_FIELDS : KYC_DOCUMENT_FIELDS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || `KYC documents — ${kyc.fullName || kyc.investor?.name || "User"}`}
      wide={wide}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <KycDocumentsList kyc={kyc} fields={fields} showMissing={showMissing} scope={scope} />
      </div>
    </Modal>
  );
}
