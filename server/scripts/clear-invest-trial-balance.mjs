/**
 * Clears invest-portal trial balance (ledger) and resets investor wallet balances to 0.
 * Run: node server/scripts/clear-invest-trial-balance.mjs
 * Docker: docker compose -f deploy/docker-compose.yml exec -T api node /app/server/scripts/clear-invest-trial-balance.mjs
 */
import { investDb } from "../src/db.js";

async function main() {
  const ledgerBefore = await investDb.ledgerEntry.count();
  const walletBefore = await investDb.wallet.aggregate({
    _sum: { available: true, invested: true, earnings: true },
    _count: { id: true },
  });

  const [ledgerDeleted, walletsReset, treasuryDeleted] = await investDb.$transaction([
    investDb.ledgerEntry.deleteMany({}),
    investDb.wallet.updateMany({ data: { available: 0, invested: 0, earnings: 0 } }),
    investDb.treasurySnapshot.deleteMany({}),
  ]);

  const ledgerAfter = await investDb.ledgerEntry.count();
  const walletAfter = await investDb.wallet.aggregate({
    _sum: { available: true, invested: true, earnings: true },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        ledger: { before: ledgerBefore, deleted: ledgerDeleted.count, after: ledgerAfter },
        wallets: {
          count: walletBefore._count.id,
          sumBefore: walletBefore._sum,
          reset: walletsReset.count,
          sumAfter: walletAfter._sum,
        },
        treasurySnapshotsDeleted: treasuryDeleted.count,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => investDb.$disconnect());
