import QRCode from "qrcode";

/** Build UPI pay URI (same as WalletFinancePanels). */
export function buildUpiPayUri(vpa, payeeName, amount) {
  if (!vpa) return "";
  const params = new URLSearchParams({ pa: vpa, cu: "INR" });
  if (payeeName) params.set("pn", payeeName.slice(0, 80));
  if (amount && Number(amount) > 0) params.set("am", String(Number(amount)));
  return `upi://pay?${params.toString()}`;
}

/** Generate QR data URL for UPI payment (amount optional). */
export async function generateUpiQrDataUrl(vpa, payeeName, amount) {
  const uri = buildUpiPayUri(vpa, payeeName, amount);
  if (!uri) return "";
  return QRCode.toDataURL(uri, { width: 280, margin: 2, errorCorrectionLevel: "M" });
}
