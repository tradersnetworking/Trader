import { useState } from "react";
import InvestorApprovedRecordsModal from "./InvestorApprovedRecordsModal.jsx";

/** Opens approved KYC / bank / documents in a popup (for verified investors). */
export default function InvestorApprovedViewButtons({ kyc, investor, className = "" }) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("kyc");

  if (!kyc || kyc.status !== "APPROVED") return null;

  const openTab = (tab) => {
    setInitialTab(tab);
    setOpen(true);
  };

  return (
    <>
      <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap ${className}`.trim()}>
        <button type="button" className="btn-outline w-full text-sm sm:w-auto" onClick={() => openTab("kyc")}>
          View KYC details
        </button>
        <button type="button" className="btn-outline w-full text-sm sm:w-auto" onClick={() => openTab("bank")}>
          View bank account
        </button>
        <button type="button" className="btn-outline w-full text-sm sm:w-auto" onClick={() => openTab("documents")}>
          View uploaded files
        </button>
      </div>
      <InvestorApprovedRecordsModal
        open={open}
        onClose={() => setOpen(false)}
        kyc={kyc}
        investor={investor}
        initialTab={initialTab}
      />
    </>
  );
}
