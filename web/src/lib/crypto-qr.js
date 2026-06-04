import QRCode from "qrcode";

export async function generateWalletQrDataUrl(walletAddress) {
  const addr = String(walletAddress || "").trim();
  if (!addr) return "";
  try {
    return await QRCode.toDataURL(addr, { width: 256, margin: 2, errorCorrectionLevel: "M" });
  } catch {
    return "";
  }
}
