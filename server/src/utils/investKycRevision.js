import { investDb } from "../db.js";

/** Safe access when Prisma client or DB table is not yet migrated. */
export function hasKycRevisionDelegate() {
  return Boolean(investDb.kycRevision?.findFirst);
}

export async function findPendingKycRevision(investorId) {
  if (!hasKycRevisionDelegate()) return null;
  try {
    return await investDb.kycRevision.findFirst({
      where: { investorId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return null;
  }
}
