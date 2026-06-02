/** Validate drawn signature (base64 PNG) — reject empty or faint strokes */

export function validateSignatureBase64(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { ok: false, message: "Signature is required. Draw on the pad or upload a clear signature image." };
  }
  if (!dataUrl.startsWith("data:image")) {
    return { ok: false, message: "Invalid signature format. Draw again or upload a PNG/JPG signature." };
  }
  let buf;
  try {
    buf = Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
  } catch {
    return { ok: false, message: "Could not read signature. Please try again." };
  }
  if (buf.length < 400) {
    return { ok: false, message: "Signature is too small. Draw a larger, clearer signature." };
  }
  let ink = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] < 220) ink++;
  }
  if (ink < 80) {
    return {
      ok: false,
      message: "Signature is not clear enough. Draw again with a full stroke, or upload a sharp signature photo.",
    };
  }
  return { ok: true };
}
