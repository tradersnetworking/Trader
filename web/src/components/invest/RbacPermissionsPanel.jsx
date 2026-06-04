import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";

function PermButtons({ effective, superOnly, onGrant, onDeny, onDefault, busy }) {
  if (superOnly) {
    return <span className="text-xs text-muted-foreground">Super Admin only</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => onGrant()}
        className={`rounded px-2 py-1 text-xs font-semibold ${effective ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-emerald-500/20"}`}
      >
        Granted
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDeny()}
        className={`rounded px-2 py-1 text-xs font-semibold ${!effective ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground hover:bg-rose-500/20"}`}
      >
        Denied
      </button>
      {onDefault && (
        <button type="button" disabled={busy} onClick={() => onDefault()} className="rounded px-2 py-1 text-xs text-muted-foreground underline">
          Role default
        </button>
      )}
    </div>
  );
}

export default function RbacPermissionsPanel() {
  const [matrix, setMatrix] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [adminPerms, setAdminPerms] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMatrix = () =>
    investApi("/admin/rbac")
      .then(setMatrix)
      .catch((e) => setErr(e.message || "Could not load role permissions"));

  const loadAdmins = () =>
    investApi("/admin/rbac/admins")
      .then((d) => {
        setAdmins(d.admins || []);
        if (!selectedAdminId && d.admins?.[0]) setSelectedAdminId(d.admins[0].id);
      })
      .catch((e) => setErr(e.message || "Could not load admin accounts"));

  const loadAdminPerms = (id) => {
    if (!id) {
      setAdminPerms(null);
      return;
    }
    return investApi(`/admin/rbac/admins/${id}`)
      .then(setAdminPerms)
      .catch((e) => setErr(e.message || "Could not load admin permissions"));
  };

  useEffect(() => {
    loadMatrix();
    loadAdmins();
  }, []);

  useEffect(() => {
    if (selectedAdminId) loadAdminPerms(selectedAdminId);
  }, [selectedAdminId]);

  const setRolePerm = async (role, permission, granted) => {
    setBusy(true);
    setErr("");
    try {
      await investApi("/admin/rbac", { method: "PUT", body: { role, permission, granted } });
      await loadMatrix();
      if (selectedAdminId) await loadAdminPerms(selectedAdminId);
      setMsg(`Default ${role} permission updated.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setAdminPerm = async (permission, granted, useRoleDefault = false) => {
    if (!selectedAdminId) return;
    setBusy(true);
    setErr("");
    try {
      const d = await investApi(`/admin/rbac/admins/${selectedAdminId}`, {
        method: "PUT",
        body: { permission, granted, useRoleDefault },
      });
      setAdminPerms(d);
      setMsg(useRoleDefault ? "Using role default for this permission." : "Admin permission saved.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!matrix) {
    return <p className="text-sm text-muted-foreground">Loading permissions…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Set default permissions for all Admin accounts, then grant or deny per admin user as needed.
        </p>
      </div>

      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <div className="card overflow-x-auto">
        <h4 className="border-b border-border p-3 text-sm font-bold">Default — all Admin accounts</h4>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <th className="p-3">Permission</th>
              <th className="p-3">Admin (default)</th>
              <th className="p-3">Super Admin</th>
            </tr>
          </thead>
          <tbody>
            {matrix.permissions.map((p) => {
              const adminGranted = matrix.view[p.key]?.roles.ADMIN;
              return (
                <tr key={p.key} className="border-t border-border">
                  <td className="p-3">{p.label}</td>
                  <td className="p-3">
                    <PermButtons
                      effective={adminGranted}
                      superOnly={p.key === "manage_staff" || p.key === "manage_rbac" || p.key === "manage_plans" || p.key === "manage_gateways" || p.key === "manage_settings"}
                      busy={busy}
                      onGrant={() => setRolePerm("ADMIN", p.key, true)}
                      onDeny={() => setRolePerm("ADMIN", p.key, false)}
                    />
                  </td>
                  <td className="p-3 text-xs text-emerald-600 font-semibold">All granted</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h4 className="border-b border-border p-3 text-sm font-bold">Per admin user</h4>
        <div className="border-b border-border p-3">
          <Field label="Admin account">
            <select className="input max-w-md" value={selectedAdminId} onChange={(e) => setSelectedAdminId(e.target.value)}>
              <option value="">Select admin…</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email}){a.isActive === false ? " — blocked" : ""}
                </option>
              ))}
            </select>
          </Field>
          {admins.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">No Admin accounts yet. Create one under Admin Accounts.</p>
          )}
        </div>
        {adminPerms && (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Permission</th>
                <th className="p-3">Role default</th>
                <th className="p-3">This admin</th>
              </tr>
            </thead>
            <tbody>
              {adminPerms.permissions.map((p) => (
                <tr key={p.key} className="border-t border-border">
                  <td className="p-3">
                    {p.label}
                    {p.hasOverride && <span className="ml-1 text-[10px] text-amber-600">(custom)</span>}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold ${p.roleDefault ? "text-emerald-600" : "text-rose-600"}`}>
                      {p.roleDefault ? "Granted" : "Denied"}
                    </span>
                  </td>
                  <td className="p-3">
                    <PermButtons
                      effective={p.effective}
                      superOnly={p.superOnly}
                      busy={busy}
                      onGrant={() => setAdminPerm(p.key, true)}
                      onDeny={() => setAdminPerm(p.key, false)}
                      onDefault={p.hasOverride ? () => setAdminPerm(p.key, false, true) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
