import { nanoid } from "nanoid";
import { config } from "../config.js";

export function invoiceNumber() {
  return `AEX-INV-${nanoid(8).toUpperCase()}`;
}

export function calcInvoiceTotals(items, taxPct = 0) {
  const lines = (items || []).map((it) => {
    const qty = Number(it.qty || it.quantity || 0);
    const rate = Number(it.rate || it.price || 0);
    const amount = Math.round(qty * rate * 100) / 100;
    return { ...it, qty, rate, amount };
  });
  const subtotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const tax = Math.round(subtotal * (Number(taxPct) / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + tax) * 100) / 100;
  return { lines, subtotal, taxAmount: tax, totalAmount };
}

export function parseInvoiceItems(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw || "[]") : raw || [];
  } catch {
    return [];
  }
}

export function serializeInvoice(inv) {
  if (!inv) return null;
  return {
    ...inv,
    items: parseInvoiceItems(inv.items),
  };
}

export function sellerDetails() {
  return {
    name: config.bank.accountName || "Akshaya Exim Traders",
    address: "Global Export & Import • India",
    gst: process.env.COMPANY_GST || "",
    email: process.env.SUPPORT_EMAIL || "support@akshayaexim.com",
    phone: process.env.COMPANY_PHONE || "",
    bank: config.bank,
    upi: config.upi,
  };
}
