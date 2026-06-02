/** Client-side signature check (mirrors server) */

export function validateSignatureBase64(dataUrl) {
  if (!dataUrl?.startsWith("data:image")) {
    return "Draw your signature on the pad or upload a clear signature image.";
  }
  try {
    const raw = atob(dataUrl.split(",")[1] || "");
    if (raw.length < 400) return "Signature is too small. Draw a larger, clearer signature.";
    let ink = 0;
    for (let i = 0; i < Math.min(raw.length, 8000); i++) {
      if (raw.charCodeAt(i) < 220) ink++;
    }
    if (ink < 80) return "Signature is not clear enough. Draw again or upload a sharper image.";
  } catch {
    return "Invalid signature. Please try again.";
  }
  return null;
}
