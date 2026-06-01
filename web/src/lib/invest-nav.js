// Invest portal sidebar navigation (investor vs admin/super-admin).



export const INVESTOR_NAV = [

  { section: "Investing" },

  { id: "overview", label: "Dashboard", icon: "home", color: "blue" },

  { id: "plans", label: "Investment Plans", icon: "plans", color: "gold" },

  { id: "investments", label: "My Investments", icon: "investments", color: "emerald" },

  { id: "money", label: "Money Hub", icon: "wallet", color: "violet" },

  { section: "Account & Records" },

  { id: "transactions", label: "My Transactions", icon: "transactions", color: "cyan" },

  { id: "kyc", label: "My KYC & Accounts", icon: "kyc", color: "blue" },

  { id: "agreements", label: "Agreements", icon: "agreements", color: "amber" },

  { id: "ledger", label: "Ledger", icon: "ledger", color: "indigo" },

  { id: "profile", label: "Profile", icon: "profile", color: "slate" },

  { section: "Help & Rewards" },

  { id: "referral", label: "Referral Program", icon: "referral", color: "amber" },

  { id: "support", label: "Support", icon: "support", color: "cyan" },

  { id: "notifications", label: "Notifications", icon: "bell", color: "indigo" },

];



/** Admin sidebar — grouped by role workflow to reduce confusion */

export const ADMIN_NAV = [

  { section: "Daily Operations" },

  { id: "overview", label: "Overview", icon: "home", color: "blue" },

  { id: "pending-payments", label: "Today's Payments", icon: "payments", color: "amber" },

  { id: "upcoming-payments", label: "Upcoming Payments", icon: "calendar", color: "violet" },

  { id: "deposits", label: "Deposits", icon: "deposit", color: "cyan" },

  { id: "payouts", label: "Withdrawals", icon: "payouts", color: "pink" },

  { id: "kyc", label: "KYC Review", icon: "kyc", color: "violet" },

  { id: "platform-investments", label: "Platform Investments", icon: "investments", color: "blue" },

  { id: "wallet-ops", label: "Wallet Operations", icon: "wallet", color: "violet" },

  { id: "agreements", label: "Agreements", icon: "agreements", color: "amber" },

  { id: "ledger", label: "Platform Ledger", icon: "ledger", color: "indigo" },

  { section: "Users & Plans" },

  { id: "investors", label: "Users & Investors", icon: "investors", color: "emerald" },

  { id: "plans", label: "Investment Plans", icon: "plans", color: "gold" },

  { id: "treasury", label: "Treasury", icon: "wallet", color: "violet" },

  { id: "analytics", label: "Cohort Analytics", icon: "investments", color: "emerald" },

  { section: "Support & CMS" },

  { id: "tickets", label: "Support Tickets", icon: "support", color: "cyan" },

  { id: "support-mail", label: "Mail Desk", icon: "support", color: "cyan" },

  { id: "notifications-admin", label: "Notifications", icon: "bell", color: "indigo" },

  { id: "broadcast", label: "Broadcast", icon: "bell", color: "indigo" },

  { id: "referrals-admin", label: "Referral Payouts", icon: "referral", color: "amber" },

  { id: "promos", label: "Promo Codes", icon: "plans", color: "gold" },

  { id: "partners", label: "Partners", icon: "investors", color: "emerald" },

  { id: "homepage-cms", label: "Homepage CMS", icon: "plans", color: "gold" },

  { section: "Platform Settings" },

  { id: "gateways", label: "Payment Gateways", icon: "gateways", color: "cyan" },

  { id: "communication", label: "Email & Communication", icon: "support", color: "cyan", superOnly: true },

  { id: "settings", label: "Site & API Settings", icon: "settings", color: "slate" },

  { id: "rbac", label: "Permissions", icon: "staff", color: "blue", superOnly: true },

  { id: "staff", label: "Admin Accounts", icon: "staff", color: "blue", superOnly: true },

  { id: "backup", label: "Backup & Export", icon: "ledger", color: "slate" },

  { id: "audit", label: "Audit Log", icon: "ledger", color: "slate" },

];



export function getAdminNav(isSuper) {

  return ADMIN_NAV.filter((item) => !item.superOnly || isSuper);

}



export function getNavLabel(nav, tab) {

  const item = nav.find((n) => n.id === tab);

  return item?.label || "Dashboard";

}



/** Resolve nav label with i18n — falls back to static label from invest-nav. */

export function translateNavLabel(t, nav, tab) {

  const item = nav.find((n) => n.id === tab);

  if (!item) return t("nav.overview") !== "nav.overview" ? t("nav.overview") : "Dashboard";

  const key = `nav.${item.id}`;

  const translated = t(key);

  return translated !== key ? translated : item.label;

}



export function translateNavItem(t, item) {

  if (!item?.id) return item?.label || "";

  const key = `nav.${item.id}`;

  const translated = t(key);

  return translated !== key ? translated : item.label;

}



export function translateNavShort(t, item) {

  const key = `navShort.${item.id}`;

  const translated = t(key);

  if (translated !== key) return translated;

  return navShortLabel(translateNavItem(t, item));

}



const ICON_BG = {

  blue: "bg-blue-500/15 dark:bg-blue-500/20",

  gold: "bg-amber-500/15 dark:bg-amber-500/20",

  emerald: "bg-emerald-500/15 dark:bg-emerald-500/20",

  violet: "bg-violet-500/15 dark:bg-violet-500/20",

  cyan: "bg-cyan-500/15 dark:bg-cyan-500/20",

  pink: "bg-pink-500/15 dark:bg-pink-500/20",

  slate: "bg-slate-500/15 dark:bg-slate-500/20",

  amber: "bg-amber-500/15 dark:bg-amber-500/20",

  indigo: "bg-indigo-500/15 dark:bg-indigo-500/20",

};



const ICON_FG = {

  blue: "text-blue-600 dark:text-blue-400",

  gold: "text-amber-600 dark:text-amber-400",

  emerald: "text-emerald-600 dark:text-emerald-400",

  violet: "text-violet-600 dark:text-violet-400",

  cyan: "text-cyan-600 dark:text-cyan-400",

  pink: "text-pink-600 dark:text-pink-400",

  slate: "text-slate-600 dark:text-slate-400",

  amber: "text-amber-600 dark:text-amber-400",

  indigo: "text-indigo-600 dark:text-indigo-400",

};



export function navIconBg(color) {

  return ICON_BG[color] || ICON_BG.blue;

}



export function navIconFg(color) {

  return ICON_FG[color] || ICON_FG.blue;

}



/** Short label for mobile bottom nav */

export function navShortLabel(label) {

  const map = {

    Dashboard: "Home",

    Overview: "Home",

    "Investment Plans": "Plans",

    "My Investments": "Invest",

    "My Transactions": "Txns",

    "My KYC & Accounts": "KYC",

    "Today's Payments": "Today",

    "Upcoming Payments": "Upcoming",

    "Money Hub": "Money",

    "Referral Program": "Refer",

    Notifications: "Alerts",

    Support: "Help",

    "Support Tickets": "Tickets",

    "Referral Payouts": "Referrals",

    "Promo Codes": "Promos",

    "Mail Desk": "Mail",

    "Platform Ledger": "Ledger",

  };

  return map[label] || label.split(" ")[0];

}


