import { config } from "../config.js";
import { getEffectiveGoogleClientId } from "../services/mainSiteSettings.js";

// Verifies a Google ID token (credential from Google Identity Services) using
// Google's tokeninfo endpoint. Returns { email, name, sub } or null.
export async function verifyGoogleIdToken(credential) {
  if (!credential) return null;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const clientId = (await getEffectiveGoogleClientId()) || config.googleClientId;
    if (clientId && data.aud !== clientId) return null;
    if (!data.email) return null;
    return { email: data.email, name: data.name || data.email.split("@")[0], sub: data.sub };
  } catch {
    return null;
  }
}
