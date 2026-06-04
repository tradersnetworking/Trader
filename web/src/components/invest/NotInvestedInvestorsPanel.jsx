import InvestorNurturePanel from "./InvestorNurturePanel.jsx";

export default function NotInvestedInvestorsPanel() {
  return (
    <InvestorNurturePanel
      title="Registered — not yet invested"
      subtitle="Investors who signed up but have no active investment plan. Send email and/or WhatsApp encouraging them to explore plans and invest."
      listPath="/admin/investors/not-invested"
      notifyPath="/admin/investors/not-invested/notify"
      defaultSubject="Start your investment journey with AKSHYA INVESTMENTS"
      defaultEmailBody={
        "Dear {name},\n\nYou registered on AKSHYA INVESTMENTS but haven't subscribed to an investment plan yet.\n\nLog in to explore Bronze, Silver, Gold and other plans with transparent monthly returns.\n\n— AKSHYA INVESTMENTS Team"
      }
      defaultWhatsAppBody="Dear {name}, you registered on AKSHYA INVESTMENTS but have not invested yet. Log in to explore our investment plans and start earning. — AKSHYA INVESTMENTS"
      emptyMessage="All registered investors have at least one investment."
    />
  );
}
