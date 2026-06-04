import QRCode from "qrcode";

export function normalizeVpa(vpa) {
  return String(vpa || "").trim();
}

export function isValidStoredQrUrl(url) {
  const t = String(url || "").trim();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("data:image/")
  );
}

function upiQueryString(vpa, payeeName, amount) {
  const id = normalizeVpa(vpa);
  if (!id) return "";
  const params = new URLSearchParams({ pa: id, cu: "INR" });
  const name = String(payeeName || "").trim();
  if (name) params.set("pn", name.slice(0, 80));
  if (amount != null && Number(amount) > 0) params.set("am", String(Number(amount)));
  return params.toString();
}

/** Build UPI pay URI (amount optional). */
export function buildUpiPayUri(vpa, payeeName, amount) {
  const q = upiQueryString(vpa, payeeName, amount);
  return q ? `upi://pay?${q}` : "";
}

/** Deep links for common UPI apps (mobile). */
export function buildUpiAppLinks(vpa, payeeName, amount) {
  const q = upiQueryString(vpa, payeeName, amount);
  if (!q) return [];
  const generic = `upi://pay?${q}`;
  return [
    { id: "gpay", label: "GPay", href: `tez://upi/pay?${q}` },
    { id: "phonepe", label: "PhonePe", href: `phonepe://pay?${q}` },
    { id: "paytm", label: "Paytm", href: `paytmmp://pay?${q}` },
    { id: "bhim", label: "BHIM", href: `bhim://pay?${q}` },
    { id: "upi", label: "Any UPI", href: generic },
  ];
}

/** Generate QR data URL for UPI payment (amount optional). */
export async function generateUpiQrDataUrl(vpa, payeeName, amount) {
  const uri = buildUpiPayUri(vpa, payeeName, amount);
  if (!uri) return "";
  try {
    return await QRCode.toDataURL(uri, { width: 280, margin: 2, errorCorrectionLevel: "M" });
  } catch {
    return "";
  }
}
