import InvestorNurturePanel from "./InvestorNurturePanel.jsx";

export default function KycPendingInvestorsPanel() {
  return (
    <InvestorNurturePanel
      title="Registered — KYC not yet done"
      subtitle="Investors who registered (Google or email) but have not completed KYC. Send email and/or WhatsApp reminders, or open Manage to complete KYC on their behalf."
      listPath="/admin/investors/kyc-pending"
      notifyPath="/admin/investors/kyc-pending/notify"
      manageHref="/invest/admin?tab=investors&manage="
      defaultSubject="Complete your KYC — AKSHYA INVESTMENTS"
      defaultEmailBody={
        "Dear {name},\n\nYou registered on AKSHYA INVESTMENTS but your KYC is not complete yet.\n\nLog in and complete KYC (identity, bank & payout details) to unlock deposits, investments and withdrawals.\n\n— AKSHYA INVESTMENTS Team"
      }
      defaultWhatsAppBody="Dear {name}, please complete your KYC on AKSHYA INVESTMENTS (ID, bank & payout details) to unlock investing. Log in to your dashboard. — AKSHYA INVESTMENTS"
      emptyMessage="All registered investors have submitted KYC (or it is under review / approved)."
    />
  );
}
