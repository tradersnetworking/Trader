import { mainDb } from "../db.js";
import { createOrder } from "../payments/gateways.js";

function isIndiaCountry(country) {
  const c = String(country || "").toUpperCase();
  return c === "IN" || c === "INDIA" || c === "IND";
}

const INDIA_DOC_FIELDS = ["photo", "panDocument", "aadhaarFront", "aadhaarBack", "addressProof", "bankProof", "cancelledCheque"];
const INTL_DOC_FIELDS = ["photo", "passportDocument", "companyRegDoc", "addressProof", "bankProof"];

export function kycRequiredFields(country, partnerType) {
  const india = isIndiaCountry(country);
  const base = ["fullName", "phone", "address", "country"];
  if (partnerType === "SUPPLIER" || partnerType === "BOTH") base.push("companyName", "bankName", "bankAccount");
  if (india) return [...base, "panNumber", "gstNumber"];
  return [...base, "passportNumber", "taxId", "swiftCode"];
}

export async function getTradeKyc(userId) {
  return mainDb.tradeKyc.findUnique({ where: { userId }, include: { user: true } });
}

const TRADE_DOC_FIELDS = [
  "photo",
  "panDocument",
  "aadhaarFront",
  "aadhaarBack",
  "passportDocument",
  "companyRegDoc",
  "addressProof",
  "bankProof",
  "cancelledCheque",
];

export async function upsertTradeKyc(userId, body, existing = null) {
  const data = {
    partnerType: body.partnerType || existing?.partnerType || "BUYER",
    country: body.country || existing?.country || "IN",
    phoneCountryCode: body.phoneCountryCode || existing?.phoneCountryCode || "+91",
    fullName: body.fullName ?? existing?.fullName,
    companyName: body.companyName ?? existing?.companyName,
    phone: body.phone ?? existing?.phone,
    email: body.email ?? existing?.email,
    address: body.address ?? existing?.address,
    city: body.city ?? existing?.city,
    state: body.state ?? existing?.state,
    postalCode: body.postalCode ?? existing?.postalCode,
    panNumber: body.panNumber ?? existing?.panNumber,
    aadhaarNumber: body.aadhaarNumber ?? existing?.aadhaarNumber,
    gstNumber: body.gstNumber ?? existing?.gstNumber,
    passportNumber: body.passportNumber ?? existing?.passportNumber,
    taxId: body.taxId ?? existing?.taxId,
    companyRegNo: body.companyRegNo ?? existing?.companyRegNo,
    bankName: body.bankName ?? existing?.bankName,
    bankAccount: body.bankAccount ?? existing?.bankAccount,
    ifscCode: body.ifscCode ?? existing?.ifscCode,
    swiftCode: body.swiftCode ?? existing?.swiftCode,
    photo: body.photo,
    panDocument: body.panDocument,
    aadhaarFront: body.aadhaarFront,
    aadhaarBack: body.aadhaarBack,
    passportDocument: body.passportDocument,
    companyRegDoc: body.companyRegDoc,
    addressProof: body.addressProof,
    bankProof: body.bankProof,
    cancelledCheque: body.cancelledCheque,
    status: "PENDING",
    remarks: null,
  };
  for (const field of TRADE_DOC_FIELDS) {
    if (!data[field] && existing?.[field]) data[field] = existing[field];
  }
  return mainDb.tradeKyc.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function decideTradeKyc(id, status, remarks) {
  return mainDb.tradeKyc.update({
    where: { id },
    data: { status, remarks, verifiedAt: status === "APPROVED" ? new Date() : null },
  });
}

export async function createTradePayment({ userId, direction, amount, method, gateway, partyName, partyEmail, partyPhone, partyPhoneCountryCode, orderId, reference, proofImage, remarks }) {
  const tp = await mainDb.tradePayment.create({
    data: {
      userId: userId || null,
      direction,
      amount: Number(amount),
      method: (method || "RAZORPAY").toUpperCase(),
      gateway: gateway || null,
      partyName,
      partyEmail,
      partyPhone,
      partyPhoneCountryCode: partyPhoneCountryCode || "+91",
      orderId: orderId || null,
      reference,
      proofImage: proofImage || null,
      remarks,
      status: "PENDING",
    },
  });
  let payment = null;
  const online = [
    "RAZORPAY", "CASHFREE", "PAYU", "EASEBUZZ", "JUSPAY", "EXIMPE", "LITEPAY",
    "STRIPE", "PAYGLOCAL", "XFLOWPAY", "HDFC", "AXIS", "ICICI", "YESBANK", "PHONEPE", "PAYPAL",
  ];
  if (online.includes(tp.method) && direction === "COLLECT") {
    payment = await createOrder(tp.method.toLowerCase(), {
      amount: tp.amount,
      currency: "INR",
      receipt: `TRD-${tp.id.slice(-8)}`,
      tradePaymentId: tp.id,
      orderId: orderId || undefined,
      portal: "main",
      kind: "trade",
      productinfo: direction === "COLLECT" ? "Product purchase" : "Supplier payment",
      customer: { id: userId, email: partyEmail, phone: partyPhone, name: partyName },
    });
    const gatewayRef = payment?.merchantTransactionId || payment?.orderId;
    if (gatewayRef) {
      await mainDb.tradePayment.update({ where: { id: tp.id }, data: { gatewayRef: String(gatewayRef), gateway: tp.method } });
      tp.gatewayRef = String(gatewayRef);
    }
  }
  return { tradePayment: tp, payment };
}

export async function updateTradePaymentStatus(id, status, remarks) {
  const tp = await mainDb.tradePayment.update({ where: { id }, data: { status, remarks } });
  if (status === "PAID" && tp.orderId) {
    const { autoApproveMainOrder } = await import("./mainPaymentWebhooks.js");
    await autoApproveMainOrder(tp.orderId, tp.gatewayRef);
  }
  return tp;
}

export { INDIA_DOC_FIELDS, INTL_DOC_FIELDS };
