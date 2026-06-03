import KycFullViewModal from "./KycFullViewModal.jsx";

/** Read-only full KYC + document preview for investors (pending / rejected). */
export default function InvestorKycViewModal({ open, onClose, kyc }) {
  if (!kyc) return null;
  const title = kyc.fullName || "Your KYC";

  return (
    <KycFullViewModal
      open={open}
      onClose={onClose}
      kyc={kyc}
      readOnly
      investorTitle={title}
    />
  );
}
