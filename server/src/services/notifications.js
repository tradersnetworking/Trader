import { investDb } from "../db.js";

export async function createNotification(investorId, { title, body, type = "INFO", link }) {
  return investDb.notification.create({
    data: { investorId, title, body, type, link: link || null },
  });
}

export async function notifyInvestor(investorId, title, body, opts = {}) {
  return createNotification(investorId, { title, body, ...opts });
}

export async function broadcastNotification({ title, body, type = "INFO", link, investorIds }) {
  const ids = investorIds?.length
    ? investorIds
    : (await investDb.investor.findMany({ where: { role: "INVESTOR", isActive: true }, select: { id: true } })).map((i) => i.id);
  if (!ids.length) return { count: 0 };
  await investDb.notification.createMany({
    data: ids.map((investorId) => ({ investorId, title, body, type, link: link || null })),
  });
  return { count: ids.length };
}

export async function getUnreadCount(investorId) {
  return investDb.notification.count({ where: { investorId, readAt: null } });
}

export async function listNotifications(investorId, { limit = 50 } = {}) {
  return investDb.notification.findMany({
    where: { investorId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 50, 200),
  });
}

export async function markRead(investorId, notificationId) {
  return investDb.notification.updateMany({
    where: { id: notificationId, investorId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(investorId) {
  return investDb.notification.updateMany({
    where: { investorId, readAt: null },
    data: { readAt: new Date() },
  });
}
