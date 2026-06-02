import { api } from "./api.js";

export function isWebAuthnSupported() {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

/** Passkey login for invest portal — email must match registered passkey. */
export async function loginWithPasskey(email) {
  if (!isWebAuthnSupported()) throw new Error("Passkeys are not supported in this browser");
  const emailNorm = email.trim().toLowerCase();
  const { options } = await api("invest", "/auth/webauthn/login/options", {
    method: "POST",
    body: { email: emailNorm },
  });
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const assertion = await startAuthentication({ optionsJSON: options });
  return api("invest", "/auth/webauthn/login/verify", {
    method: "POST",
    body: { email: emailNorm, id: assertion.id, rawId: assertion.rawId, type: assertion.type, response: assertion.response, clientExtensionResults: assertion.clientExtensionResults, authenticatorAttachment: assertion.authenticatorAttachment },
  });
}

/** Passkey as second factor after password login when TOTP is enabled. */
export async function verify2FAWithPasskey(email) {
  if (!isWebAuthnSupported()) throw new Error("Passkeys are not supported in this browser");
  const emailNorm = email.trim().toLowerCase();
  const { options } = await api("invest", "/auth/webauthn/login/2fa/options", {
    method: "POST",
    body: { email: emailNorm },
  });
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const assertion = await startAuthentication({ optionsJSON: options });
  return api("invest", "/auth/webauthn/login/2fa/verify", {
    method: "POST",
    body: { email: emailNorm, id: assertion.id, rawId: assertion.rawId, type: assertion.type, response: assertion.response, clientExtensionResults: assertion.clientExtensionResults, authenticatorAttachment: assertion.authenticatorAttachment },
  });
}
