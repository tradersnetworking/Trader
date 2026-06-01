import crypto from "crypto";
import { investDb } from "../db.js";
import { addLedger } from "../routes/investInvestor.js";
import { notifyDepositApproved } from "./investNotifications.js";
import { notifyInvestor } from "./notifications.js";
import { getSetting } from "./investSettings.js";

export async function autoApproveDeposit(depositId, gatewayRef) {
  const dep = await investDb.deposit.findUnique({ where: { id: depositId }, include: { investor: true } });
  if (!dep || dep.status === "APPROVED") return { ok: false, error: "Invalid deposit" };

  await investDb.deposit.update({
    where: { id: dep.id },
    data: { status: "APPROVED", gatewayRef: gatewayRef || dep.gatewayRef, remarks: "Auto-approved via webhook" },
  });
  await addLedger(dep.investorId, {
    type: "DEPOSIT",
    direction: "CREDIT",
    amount: dep.amount,
    reference: dep.id,
    note: `Deposit via ${dep.method} (webhook)`,
  });

  if (dep.remarks?.startsWith("__promo__:")) {
    const [, code, bonusStr] = dep.remarks.split(":");
    const promo = await investDb.promoCode.findUnique({ where: { code } });
    const bonus = Number(bonusStr);
    if (promo && bonus > 0) {
      const { applyPromoCode } = await import("./promoCodes.js");
      await applyPromoCode(promo.id, dep.investorId, dep.amount, bonus);
      await addLedger(dep.investorId, { type: "BONUS", direction: "CREDIT", amount: bonus, reference: promo.id, note: `Promo ${code} bonus` });
    }
  }

  if (dep.investor) notifyDepositApproved(dep.investor, { ...dep, status: "APPROVED" });
  await notifyInvestor(dep.investorId, { title: "Deposit credited", body: `₹${dep.amount.toLocaleString("en-IN")} added to your wallet.`, type: "DEPOSIT" });
  return { ok: true, deposit: dep };
}

export function verifyRazorpaySignature(body, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export async function handleRazorpayWebhook(payload) {
  const event = payload.event;
  if (event === "payment.captured" || event === "order.paid") {
    const payment = payload.payload?.payment?.entity || payload.payload?.order?.entity;
    const receipt = payment?.order_id || payment?.receipt;
    if (!receipt) return { ok: false };
    const depId = await findDepositByReceipt(receipt);
    if (depId) return autoApproveDeposit(depId, payment?.id);
  }
  return { ok: true, ignored: true };
}

async function findDepositByReceipt(receipt) {
  const ref = String(receipt);
  const byGateway = await investDb.deposit.findFirst({ where: { gatewayRef: ref, status: "PENDING" } });
  if (byGateway) return byGateway.id;
  const tail = ref.replace(/^DEP-/, "");
  const dep = await investDb.deposit.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 50 });
  return dep.find((d) => d.id.endsWith(tail))?.id || null;
}

export function phonePeChecksum(payload, saltKey, saltIndex) {
  const hash = crypto.createHash("sha256").update(`${payload}/pg/v1/pay${saltKey}`).digest("hex");
  return `${hash}###${saltIndex}`;
}

export async function createPhonePeOrder({ amount, merchantTransactionId, redirectUrl }) {
  const merchantId = process.env.PHONEPE_MERCHANT_ID || (await getSetting("gateway_phonepe_merchant_id"));
  const saltKey = process.env.PHONEPE_SALT_KEY || (await getSetting("gateway_phonepe_salt_key"));
  const saltIndex = process.env.PHONEPE_SALT_INDEX || (await getSetting("gateway_phonepe_salt_index")) || "1";
  if (!merchantId || !saltKey) {
    return { mock: true, gateway: "phonepe", redirectUrl: redirectUrl || "/dashboard?tab=money&moneyTab=deposit", merchantTransactionId };
  }
  const payload = Buffer.from(JSON.stringify({
    merchantId,
    merchantTransactionId,
    merchantUserId: merchantTransactionId,
    amount: Math.round(amount * 100),
    redirectUrl,
    redirectMode: "REDIRECT",
    paymentInstrument: { type: "PAY_PAGE" },
  })).toString("base64");
  const checksum = phonePeChecksum(payload, saltKey, saltIndex);
  const base = process.env.PHONEPE_ENV === "production" ? "https://api.phonepe.com/apis/hermes" : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  const res = await fetch(`${base}/pg/v1/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-VERIFY": checksum },
    body: JSON.stringify({ request: payload }),
  });
  const data = await res.json();
  return { gateway: "phonepe", ...data, merchantTransactionId };
}

export async function handlePhonePeCallback(base64Response) {
  const json = JSON.parse(Buffer.from(base64Response, "base64").toString());
  if (json.code !== "PAYMENT_SUCCESS") return { ok: false, status: json.code };
  const txnId = json.data?.merchantTransactionId;
  const dep = await investDb.deposit.findFirst({ where: { gatewayRef: txnId, status: "PENDING" } });
  if (dep) return autoApproveDeposit(dep.id, json.data?.transactionId);
  return { ok: true, ignored: true };
}

export async function createPayPalOrder({ amount, currency = "INR", depositId }) {
  const clientId = process.env.PAYPAL_CLIENT_ID || (await getSetting("gateway_paypal_client_id"));
  const secret = process.env.PAYPAL_CLIENT_SECRET || (await getSetting("gateway_paypal_client_secret"));
  const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  if (!clientId || !secret) {
    return { mock: true, gateway: "paypal", orderId: `mock_paypal_${depositId}`, approveUrl: null };
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const { access_token } = await tokenRes.json();
  const orderRes = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "INR", value: Number(amount).toFixed(2) }, reference_id: depositId }],
    }),
  });
  const order = await orderRes.json();
  const approve = order.links?.find((l) => l.rel === "approve")?.href;
  return { gateway: "paypal", orderId: order.id, approveUrl: approve, accessToken: access_token };
}

export async function capturePayPalOrder(orderId, accessToken) {
  const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  const ref = data.purchase_units?.[0]?.reference_id;
  if (ref && data.status === "COMPLETED") return autoApproveDeposit(ref, orderId);
  return { ok: false, data };
}
