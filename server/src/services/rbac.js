import { investDb } from "../db.js";

export const PERMISSIONS = [
  { key: "view_dashboard", label: "View dashboard" },
  { key: "approve_deposits", label: "Approve deposits" },
  { key: "approve_withdrawals", label: "Approve withdrawals" },
  { key: "review_kyc", label: "Review KYC" },
  { key: "manage_plans", label: "Manage investment plans" },
  { key: "manage_investors", label: "Manage investors" },
  { key: "manage_gateways", label: "Manage payment gateways" },
  { key: "manage_settings", label: "Site settings" },
  { key: "manage_staff", label: "Admin accounts" },
  { key: "support_tickets", label: "Support tickets" },
  { key: "broadcast_notifications", label: "Broadcast notifications" },
  { key: "view_audit", label: "View audit log" },
  { key: "treasury", label: "Treasury & reconciliation" },
  { key: "analytics", label: "Cohort analytics" },
  { key: "manage_rbac", label: "Manage permissions" },
];

const SUPERADMIN_ONLY = new Set([
  "manage_staff",
  "manage_rbac",
  "manage_plans",
  "manage_gateways",
  "manage_settings",
]);

const DEFAULT_MATRIX = {
  SUPERADMIN: PERMISSIONS.map((p) => p.key),
  ADMIN: PERMISSIONS.filter((p) => !SUPERADMIN_ONLY.has(p.key)).map((p) => p.key),
};

export async function seedRolePermissions() {
  for (const [role, perms] of Object.entries(DEFAULT_MATRIX)) {
    for (const permission of PERMISSIONS.map((p) => p.key)) {
      await investDb.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        create: { role, permission, granted: perms.includes(permission) },
        update: { granted: perms.includes(permission) },
      });
    }
  }
}

export async function getRoleMatrix() {
  const rows = await investDb.rolePermission.findMany();
  const matrix = {};
  for (const p of PERMISSIONS) {
    matrix[p.key] = { label: p.label, roles: {} };
    for (const role of ["SUPERADMIN", "ADMIN"]) {
      const row = rows.find((r) => r.role === role && r.permission === p.key);
      matrix[p.key].roles[role] = row?.granted ?? DEFAULT_MATRIX[role]?.includes(p.key) ?? false;
    }
  }
  return { permissions: PERMISSIONS, matrix: rows, view: matrix };
}

export async function setPermission(role, permission, granted) {
  if (SUPERADMIN_ONLY.has(permission) && role === "ADMIN" && granted) {
    const err = new Error("This permission is reserved for Super Admin only.");
    err.status = 403;
    throw err;
  }
  return investDb.rolePermission.upsert({
    where: { role_permission: { role, permission } },
    create: { role, permission, granted },
    update: { granted },
  });
}

export async function investorHasPermission(investor, permission) {
  if (investor.role === "SUPERADMIN") return true;
  if (investor.customPermissions) {
    try {
      const overrides = JSON.parse(investor.customPermissions);
      if (overrides[permission] != null) return Boolean(overrides[permission]);
    } catch {}
  }
  if (investor.role !== "ADMIN") return false;
  const row = await investDb.rolePermission.findUnique({
    where: { role_permission: { role: "ADMIN", permission } },
  });
  return row?.granted ?? DEFAULT_MATRIX.ADMIN.includes(permission);
}

export async function getPermissionsForInvestor(investor) {
  if (!investor) return [];
  if (investor.role === "SUPERADMIN") return PERMISSIONS.map((p) => p.key);
  const granted = [];
  for (const p of PERMISSIONS) {
    if (await investorHasPermission(investor, p.key)) granted.push(p.key);
  }
  return granted;
}

function parseOverrides(customPermissions) {
  if (!customPermissions) return {};
  try {
    const o = JSON.parse(customPermissions);
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

/** Default ADMIN role grant from matrix (not per-user overrides). */
export async function adminRoleDefaultGranted(permission) {
  const row = await investDb.rolePermission.findUnique({
    where: { role_permission: { role: "ADMIN", permission } },
  });
  return row?.granted ?? DEFAULT_MATRIX.ADMIN.includes(permission);
}

export async function listAdminAccounts() {
  const rows = await investDb.investor.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true, isActive: true, customPermissions: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

/** Per-admin effective permissions for Super Admin UI. */
export async function getAdminUserPermissions(adminId) {
  const admin = await investDb.investor.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") throw new Error("Admin account not found");
  const overrides = parseOverrides(admin.customPermissions);
  const permissions = await Promise.all(
    PERMISSIONS.map(async (p) => {
      const superOnly = SUPERADMIN_ONLY.has(p.key);
      const roleDefault = await adminRoleDefaultGranted(p.key);
      const hasOverride = overrides[p.key] !== undefined;
      const effective = hasOverride ? Boolean(overrides[p.key]) : roleDefault;
      return {
        key: p.key,
        label: p.label,
        superOnly,
        roleDefault,
        hasOverride,
        effective,
      };
    })
  );
  return { admin: { id: admin.id, name: admin.name, email: admin.email, isActive: admin.isActive }, permissions };
}

export async function setAdminUserPermission(adminId, permission, granted) {
  if (SUPERADMIN_ONLY.has(permission)) {
    const err = new Error("This permission is reserved for Super Admin only.");
    err.status = 403;
    throw err;
  }
  const admin = await investDb.investor.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") throw new Error("Admin account not found");
  const overrides = parseOverrides(admin.customPermissions);
  overrides[permission] = Boolean(granted);
  await investDb.investor.update({
    where: { id: adminId },
    data: { customPermissions: JSON.stringify(overrides) },
  });
  return getAdminUserPermissions(adminId);
}

/** Remove per-user override so role default applies again. */
export async function clearAdminUserPermissionOverride(adminId, permission) {
  const admin = await investDb.investor.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") throw new Error("Admin account not found");
  const overrides = parseOverrides(admin.customPermissions);
  delete overrides[permission];
  const next = Object.keys(overrides).length ? JSON.stringify(overrides) : null;
  await investDb.investor.update({
    where: { id: adminId },
    data: { customPermissions: next },
  });
  return getAdminUserPermissions(adminId);
}
