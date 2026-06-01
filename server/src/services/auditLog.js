import { investDb } from "../db.js";

export async function logAudit({ actorId, actorRole, actorName, action, entity, entityId, meta }) {
  return investDb.auditLog.create({
    data: {
      actorId: actorId || null,
      actorRole: actorRole || null,
      actorName: actorName || null,
      action,
      entity: entity || null,
      entityId: entityId || null,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

export async function listAuditLogs({ limit = 100, entity } = {}) {
  const where = entity ? { entity } : {};
  const logs = await investDb.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 100, 500),
  });
  return logs.map((l) => ({ ...l, meta: l.meta ? JSON.parse(l.meta) : null }));
}
