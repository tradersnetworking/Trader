/** Fixed 5 mailboxes per portal — .com for main, .in for invest subdomain */

export const MAIN_MAILBOXES = [
  { id: "noreply", label: "No Reply (Default)", name: "Akshaya EXIM TRADERS", address: "noreply@akshayaexim.com" },
  { id: "support", label: "Support", name: "Akshaya Exim Support", address: "support@akshayaexim.com" },
  { id: "finance", label: "Finance & Billing", name: "Akshaya Exim Finance", address: "finance@akshayaexim.com" },
  { id: "compliance", label: "Compliance / KYC", name: "Akshaya Exim Compliance", address: "compliance@akshayaexim.com" },
  { id: "trade", label: "Trade & Orders", name: "Akshaya Exim Trade Desk", address: "trade@akshayaexim.com" },
];

export const INVEST_MAILBOXES = [
  { id: "noreply", label: "No Reply (Default)", name: "Akshaya Exim Invest", address: "noreply@akshayaexim.in" },
  { id: "support", label: "Support", name: "Akshaya Invest Support", address: "support@akshayaexim.in" },
  { id: "finance", label: "Finance & Payouts", name: "Akshaya Invest Finance", address: "finance@akshayaexim.in" },
  { id: "compliance", label: "Compliance / KYC", name: "Akshaya Invest Compliance", address: "compliance@akshayaexim.in" },
  { id: "invest", label: "Investor Relations", name: "Akshaya Exim Invest", address: "invest@akshayaexim.in" },
];

export function mailboxesForPortal(portal) {
  return portal === "main" ? MAIN_MAILBOXES : INVEST_MAILBOXES;
}
