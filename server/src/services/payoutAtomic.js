import { investDb } from "../db.js";

const RELEASABLE = ["PENDING", "SCHEDULED"];
const REJECTABLE = ["PENDING", "SCHEDULED", "PROCESSING"];

/** Atomically move payout to PROCESSING so double-release cannot occur. */
export async function claimPayoutForRelease(payoutId) {
  const claim = await investDb.payout.updateMany({
    where: { id: payoutId, status: { in: RELEASABLE } },
    data: { status: "PROCESSING" },
  });
  if (claim.count !== 1) {
    const err = new Error("Payout is not in a releasable state (already processing or paid)");
    err.status = 409;
    throw err;
  }
  return investDb.payout.findUnique({ where: { id: payoutId }, include: { investor: true } });
}

/** Atomically reject payout; returns false if already finalized. */
export async function claimPayoutForReject(payoutId, remarks) {
  const claim = await investDb.payout.updateMany({
    where: { id: payoutId, status: { in: REJECTABLE } },
    data: { status: "FAILED", remarks: remarks || "Rejected" },
  });
  return claim.count === 1;
}
