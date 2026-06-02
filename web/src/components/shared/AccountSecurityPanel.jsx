import { useState } from "react";
import { Link } from "react-router-dom";
import { investApi, mainApi, setToken } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import { applyStaffSiblingLogin } from "../../lib/staffPortal.js";
import { Field, Alert, PasswordInput } from "../ui.jsx";
import { investPath } from "../../lib/site.js";
import StaffPortalLinks from "./StaffPortalLinks.jsx";

/**
 * Change login email & password from dashboard (invest or main portal).
 */
export default function AccountSecurityPanel({ portal = "invest" }) {
  const auth = useAuth();
  const { invest, main, loginInvest, loginMain, refreshInvest, refreshMain } = auth;
  const user = portal === "invest" ? invest : main;
  const api = portal === "invest" ? investApi : mainApi;
  const onEmailUpdated = portal === "invest" ? loginInvest : loginMain;
  const refresh = portal === "invest" ? refreshInvest : refreshMain;

  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: user?.email || "" });
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdErr("");
    setPwdMsg("");
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdErr("New passwords do not match");
      return;
    }
    setPwdLoading(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword },
      });
      setPwdForm({ currentPassword: "", newPassword: "", confirm: "" });
      setPwdMsg("Password updated successfully.");
    } catch (err) {
      setPwdErr(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const changeEmail = async (e) => {
    e.preventDefault();
    setEmailErr("");
    setEmailMsg("");
    setEmailLoading(true);
    try {
      const res = await api("/auth/change-email", {
        method: "POST",
        body: { currentPassword: emailForm.currentPassword, newEmail: emailForm.newEmail },
      });
      if (res.token) {
        setToken(portal, res.token);
        onEmailUpdated(res.token, res.user);
        applyStaffSiblingLogin(res, auth);
      } else {
        await refresh();
      }
      setEmailForm((f) => ({ ...f, currentPassword: "" }));
      setEmailMsg(res.message || "Email updated. Use the new address next time you sign in.");
    } catch (err) {
      setEmailErr(err.message);
    } finally {
      setEmailLoading(false);
    }
  };


  const isStaff = ["ADMIN", "SUPERADMIN"].includes(user?.role);

  return (
    <div className="card max-w-xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold">Account security</h3>
        <p className="text-sm text-muted-foreground">
          Update your login email and password. Current login: <strong>{user?.email || "—"}</strong>
        </p>
      </div>

      {isStaff && <StaffPortalLinks portal={portal} />}

      <form onSubmit={changeEmail} className="space-y-3 border-b border-border pb-6">
        <h4 className="text-sm font-semibold">Change login email</h4>
        {emailMsg && <Alert type="success">{emailMsg}</Alert>}
        {emailErr && <Alert type="error">{emailErr}</Alert>}
        <Field label="New email">
          <input
            className="input"
            type="email"
            required
            value={emailForm.newEmail}
            onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
          />
        </Field>
        <Field label="Current password (to confirm)">
          <PasswordInput
            required
            autoComplete="current-password"
            value={emailForm.currentPassword}
            onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
          />
        </Field>
        <button type="submit" className="btn-outline" disabled={emailLoading}>
          {emailLoading ? "Updating…" : "Update email"}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-3">
          <h4 className="text-sm font-semibold">Change password</h4>
          <p className="text-xs text-muted-foreground">
            Enter your current password and a new one. Or{" "}
            <Link to={portal === "invest" ? investPath("/forgot-password") : "/forgot-password"} className="font-semibold text-primary underline">
              request a reset link by email
            </Link>
            . Google-only accounts must use the reset link first to set a password.
          </p>
          {pwdMsg && <Alert type="success">{pwdMsg}</Alert>}
          {pwdErr && <Alert type="error">{pwdErr}</Alert>}
          <Field label="Current password">
            <PasswordInput
              required
              autoComplete="current-password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
            />
          </Field>
          <Field label="New password (min 8 characters)">
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              required
              autoComplete="new-password"
              value={pwdForm.confirm}
              onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
            />
          </Field>
          <button type="submit" className="btn-gold" disabled={pwdLoading}>
            {pwdLoading ? "Saving…" : "Update password"}
          </button>
        </form>
    </div>
  );
}
