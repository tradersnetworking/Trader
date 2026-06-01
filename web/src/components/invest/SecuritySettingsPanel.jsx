import { useEffect, useState } from "react";
import { investSecurityApi } from "../../lib/api.js";
import { Alert, Field } from "../ui.jsx";

export default function SecuritySettingsPanel() {
  const [status, setStatus] = useState({ enabled: false, passkeys: [] });
  const [setup, setSetup] = useState(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => investSecurityApi("/2fa/status").then(setStatus).catch(() => {});
  useEffect(() => { load(); }, []);

  const startSetup = async () => {
    const d = await investSecurityApi("/2fa/setup", { method: "POST" });
    setSetup(d);
  };

  const enable = async () => {
    setErr("");
    try {
      const r = await investSecurityApi("/2fa/enable", { method: "POST", body: { secret: setup.secret, token } });
      setMsg(`2FA enabled. Backup codes: ${r.backupCodes?.join(", ")}`);
      setSetup(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const disable = async () => {
    await investSecurityApi("/2fa/disable", { method: "POST", body: { token } });
    setMsg("2FA disabled.");
    load();
  };

  const addPasskey = async () => {
    setErr("");
    try {
      const opts = await investSecurityApi("/webauthn/register/options", { method: "POST" });
      const { startRegistration } = await import("@simplewebauthn/browser");
      const att = await startRegistration({ optionsJSON: opts });
      await investSecurityApi("/webauthn/register/verify", { method: "POST", body: { ...att, deviceName: "My device" } });
      setMsg("Passkey registered.");
      load();
    } catch (e) {
      setErr(e.message || "Passkey registration cancelled");
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h3 className="font-bold">Security</h3>
      {msg && <Alert type="success">{msg}</Alert>}
      {err && <Alert type="error">{err}</Alert>}

      <div className="card space-y-3 p-4">
        <h4 className="font-semibold">Authenticator app (TOTP)</h4>
        <p className="text-xs text-muted-foreground">Status: {status.enabled ? "Enabled" : "Not enabled"}</p>
        {!status.enabled && !setup && <button type="button" className="btn-outline text-sm" onClick={startSetup}>Set up 2FA</button>}
        {setup && (
          <div className="space-y-2">
            <p className="text-xs break-all font-mono">{setup.uri}</p>
            <Field label="Verification code"><input className="input" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
            <button type="button" className="btn-gold w-full text-sm" onClick={enable}>Enable</button>
          </div>
        )}
        {status.enabled && (
          <div className="space-y-2">
            <Field label="TOTP code to disable"><input className="input" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
            <button type="button" className="btn-outline w-full text-sm" onClick={disable}>Disable 2FA</button>
          </div>
        )}
      </div>

      <div className="card space-y-3 p-4">
        <h4 className="font-semibold">Passkeys (WebAuthn)</h4>
        <ul className="text-sm text-muted-foreground">
          {(status.passkeys || []).map((p) => <li key={p.id}>{p.deviceName} · {new Date(p.createdAt).toLocaleDateString()}</li>)}
          {!status.passkeys?.length && <li>No passkeys yet</li>}
        </ul>
        <button type="button" className="btn-primary text-sm" onClick={addPasskey}>Add passkey</button>
      </div>
    </div>
  );
}

export function PushNotificationsToggle() {
  const [msg, setMsg] = useState("");
  const enable = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMsg("Push not supported in this browser.");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await fetch("/api/invest/security/push/vapid").then((r) => r.json());
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await investSecurityApi("/push/subscribe", { method: "POST", body: sub.toJSON() });
    setMsg("Push notifications enabled.");
  };
  return (
    <div className="card p-4">
      <h4 className="font-semibold">Browser push</h4>
      {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
      <button type="button" className="btn-outline mt-2 text-sm" onClick={enable}>Enable push alerts</button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
