import { mainDb } from "../db.js";

export async function autoApproveMainOrder(orderId, gatewayRef, amountPaid = null) {
  const order = await mainDb.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === "PAID") return { ok: false, error: "Invalid order" };
  const due = Math.max(0, order.totalAmount - (order.paidAmount || 0));
  const increment = amountPaid != null ? Number(amountPaid) : due;
  const newPaid = Math.min(order.totalAmount, (order.paidAmount || 0) + increment);
  const fullyPaid = newPaid >= order.totalAmount - 0.01;
  const paymentStatus = fullyPaid ? "PAID" : "PARTIAL";
  await mainDb.order.update({
    where: { id: order.id },
    data: {
      paidAmount: newPaid,
      paymentStatus,
      status: fullyPaid && order.status === "PENDING" ? "PAID" : order.status,
      paymentRef: gatewayRef || order.paymentRef,
    },
  });
  const invoices = await mainDb.invoice.findMany({ where: { orderId: order.id, status: { not: "PAID" } } });
  for (const inv of invoices) {
    await mainDb.invoice.update({ where: { id: inv.id }, data: { status: "PAID" } });
  }
  return { ok: true, order };
}

export async function autoApproveTradePayment(tradePaymentId, gatewayRef) {
  const tp = await mainDb.tradePayment.findUnique({ where: { id: tradePaymentId } });
  if (!tp || tp.status === "PAID" || tp.status === "COMPLETED") return { ok: false, error: "Invalid payment" };
  await mainDb.tradePayment.update({
    where: { id: tp.id },
    data: { status: "PAID", gatewayRef: gatewayRef || tp.gatewayRef },
  });
  if (tp.orderId) await autoApproveMainOrder(tp.orderId, gatewayRef);
  return { ok: true, tradePayment: tp };
}

export async function findMainOrderByReceipt(receipt) {
  const ref = String(receipt);
  const byRef = await mainDb.order.findFirst({ where: { OR: [{ paymentRef: ref }, { orderNumber: ref }], paymentStatus: { not: "PAID" } } });
  if (byRef) return byRef.id;
  if (ref.startsWith("AEX-")) {
    const o = await mainDb.order.findFirst({ where: { orderNumber: ref } });
    return o?.id || null;
  }
  return null;
}

export async function findTradePaymentByReceipt(receipt) {
  const ref = String(receipt);
  const byRef = await mainDb.tradePayment.findFirst({ where: { OR: [{ gatewayRef: ref }, { reference: ref }], status: { in: ["PENDING", "PROCESSING"] } } });
  if (byRef) return byRef.id;
  if (ref.startsWith("TRD-")) {
    const tail = ref.replace(/^TRD-/, "");
    const rows = await mainDb.tradePayment.findMany({ where: { status: { in: ["PENDING", "PROCESSING"] } }, orderBy: { createdAt: "desc" }, take: 50 });
    return rows.find((r) => r.id.endsWith(tail))?.id || null;
  }
  return null;
}
