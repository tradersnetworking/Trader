import { useState } from "react";
import { investApi } from "../../lib/api.js";
import { useAuth } from "../../lib/store.jsx";
import GoogleButton from "../GoogleButton.jsx";
import { Alert, Field, PasswordInput } from "../ui.jsx";

export default function GoogleAccountLink({ portal = "invest" }) {
  const { invest, refreshInvest } = useAuth();
  const user = portal === "invest" ? invest : null;
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlinkPwd, setUnlinkPwd] = useState("");

  if (portal !== "invest" || !user) return null;

  const onLinked = async (credential) => {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await investApi("/auth/google/link", {
        method: "POST",
        body: { credential },
      });
      await refreshInvest();
      setMsg(res.message || "Google account connected.");
    } catch (e) {
      setErr(e.message || "Could not connect Google account");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await investApi("/auth/google/unlink", {
        method: "POST",
        body: { currentPassword: unlinkPwd },
      });
      await refreshInvest();
      setUnlinkPwd("");
      setMsg(res.message || "Google account disconnected.");
    } catch (e) {
      setErr(e.message || "Could not disconnect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-b border-border pb-6">
      <h4 className="text-sm font-semibold">Google sign-in</h4>
      <p className="text-xs text-muted-foreground">
        Connect the Google account that uses <strong>{user.email}</strong> so you can sign in with one tap.
        If you change your login email, Google is disconnected automatically — connect again with the new email.
      </p>
      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      {user.googleLinked ? (
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Google account connected</p>
          <form onSubmit={unlink} className="space-y-2">
            <Field label="Password to disconnect Google">
              <PasswordInput
                required
                autoComplete="current-password"
                value={unlinkPwd}
                onChange={(e) => setUnlinkPwd(e.target.value)}
              />
            </Field>
            <button type="submit" className="btn-outline text-sm" disabled={busy}>
              {busy ? "…" : "Disconnect Google"}
            </button>
          </form>
        </div>
      ) : (
        <div className={busy ? "pointer-events-none opacity-60" : ""}>
          <GoogleButton scope="invest" onCredential={onLinked} />
        </div>
      )}
    </div>
  );
}
