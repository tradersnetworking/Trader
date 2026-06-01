/** Map admin dashboard tab ids to required RBAC permission keys. */
export const ADMIN_TAB_PERMISSIONS = {
  overview: "view_dashboard",
  "pending-payments": "view_dashboard",
  "upcoming-payments": "view_dashboard",
  deposits: "approve_deposits",
  kyc: "review_kyc",
  payouts: "approve_withdrawals",
  agreements: "view_dashboard",
  ledger: "view_dashboard",
  investors: "manage_investors",
  "platform-investments": "manage_investors",
  "wallet-ops": "manage_investors",
  "homepage-cms": "manage_settings",
  "notifications-admin": "broadcast_notifications",
  backup: "manage_settings",
  tickets: "support_tickets",
  "referrals-admin": "view_dashboard",
  broadcast: "broadcast_notifications",
  promos: "manage_settings",
  partners: "manage_settings",
  audit: "view_audit",
  treasury: "treasury",
  analytics: "analytics",
  rbac: "manage_rbac",
  "support-mail": "support_tickets",
  plans: "manage_plans",
  gateways: "manage_gateways",
  communication: "manage_settings",
  settings: "manage_settings",
  staff: "manage_staff",
};

export function filterAdminNav(navItems, permissions, isSuper) {
  const set = new Set(permissions || []);
  const can = (id) => isSuper || !ADMIN_TAB_PERMISSIONS[id] || set.has(ADMIN_TAB_PERMISSIONS[id]);
  const out = [];
  for (const item of navItems) {
    if (item.section) {
      out.push(item);
      continue;
    }
    if (item.superOnly && !isSuper) continue;
    if (!can(item.id)) continue;
    out.push(item);
  }
  return out.filter((item, i, arr) => {
    if (!item.section) return true;
    const next = arr.slice(i + 1);
    const nextSection = next.findIndex((x) => x.section);
    const slice = nextSection === -1 ? next : next.slice(0, nextSection);
    return slice.some((x) => !x.section);
  });
}
