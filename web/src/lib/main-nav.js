/** Main marketplace sidebar navigation (users + admins). */

export const MAIN_USER_NAV = [
  { section: "Trade" },
  { id: "overview", label: "Overview", icon: "home", color: "blue" },
  { id: "rfq-buy", label: "Request Quote (Import)", icon: "deposit", color: "cyan" },
  { id: "rfq-sell", label: "Supply Offer", icon: "withdraw", color: "emerald" },
  { id: "quotes", label: "My Quotes / RFQ", icon: "transactions", color: "indigo" },
  { id: "orders", label: "My Orders", icon: "investments", color: "gold" },
  { id: "invoices", label: "Invoices", icon: "ledger", color: "violet" },
  { section: "Account" },
  { id: "profile", label: "Company Profile", icon: "profile", color: "amber" },
  { id: "account", label: "Account Security", icon: "kyc", color: "slate" },
  { id: "payment", label: "Pay & Bank Details", icon: "wallet", color: "slate" },
  { id: "trade-kyc", label: "Trade KYC", icon: "kyc", color: "violet" },
];

export const MAIN_ADMIN_NAV = [
  { section: "Catalog & Trade" },
  { id: "overview", label: "Overview", icon: "dashboard", color: "blue" },
  { id: "products", label: "Products", icon: "plans", color: "gold" },
  { id: "categories", label: "Categories", icon: "ledger", color: "indigo" },
  { id: "quotes", label: "Quotes / RFQ", icon: "transactions", color: "cyan" },
  { id: "orders", label: "Orders", icon: "investments", color: "emerald" },
  { id: "invoices", label: "Invoices", icon: "ledger", color: "violet" },
  { section: "Users & Payments" },
  { id: "users", label: "Users", icon: "kyc", color: "amber" },
  { id: "gateways", label: "Payment Gateways", icon: "deposit", color: "slate" },
  { id: "trade-kyc", label: "Trade KYC Review", icon: "kyc", color: "violet" },
  { id: "trade-payments", label: "Trade Payments", icon: "wallet", color: "emerald", superOnly: true },
  { section: "Data & Account" },
  { id: "backup", label: "Backup & Export", icon: "ledger", color: "slate" },
];

export function getMainAdminNav(isSuper) {
  const items = MAIN_ADMIN_NAV.filter((item) => !item.superOnly || isSuper);
  if (isSuper) {
    items.push({ section: "Super Admin" });
    items.push({ id: "site-settings", label: "Site & SEO", icon: "settings", color: "violet" });
    items.push({ id: "communication", label: "Email & Communication", icon: "support", color: "cyan" });
    items.push({ id: "staff", label: "Staff & Roles", icon: "profile", color: "cyan" });
  }
  items.push({ id: "account", label: "Account Security", icon: "profile", color: "amber" });
  return items;
}

export function mainNavLabel(navItems, tab) {
  const item = navItems.find((n) => n.id === tab);
  return item?.label || "Dashboard";
}

export const MAIN_USER_MOBILE_PRIMARY = ["overview", "rfq-buy", "quotes", "orders"];
export const MAIN_ADMIN_MOBILE_PRIMARY = ["overview", "products", "quotes", "orders"];
