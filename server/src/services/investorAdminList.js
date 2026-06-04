import { investDb } from "../db.js";

/** How the investor account signs in (Google vs email/password). */
export function investorAuthMethod(investor) {
  const hasGoogle = Boolean(investor?.googleId);
  const hasPassword = Boolean(investor?.passwordHash);
  if (hasGoogle && hasPassword) return "google_and_password";
  if (hasGoogle) return "google";
  if (hasPassword) return "password";
  return "unknown";
}

function publicInvestorRow(investor) {
  const { passwordHash, resetToken, totpSecret, backupCodes, ...rest } = investor;
  return {
    ...rest,
    authMethod: investorAuthMethod(investor),
    hasGoogle: Boolean(investor.googleId),
    hasPassword: Boolean(passwordHash),
  };
}

/** List all investors for admin (ensures wallet exists, includes Google + registered users). */
export async function listInvestorsForAdmin() {
  let investors = await investDb.investor.findMany({
    orderBy: { createdAt: "desc" },
    include: { wallet: true, kyc: true },
  });

  const missingWallet = investors.filter((i) => !i.wallet);
  if (missingWallet.length) {
    await investDb.wallet.createMany({
      data: missingWallet.map((i) => ({ investorId: i.id })),
      skipDuplicates: true,
    });
    investors = await investDb.investor.findMany({
      orderBy: { createdAt: "desc" },
      include: { wallet: true, kyc: true },
    });
  }

  return investors.map(publicInvestorRow);
}
