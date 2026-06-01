import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { getSetting } from "./investSettings.js";

export function generateReferralCode(name = "INVESTOR") {
  const base = String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "AEX";
  return `AEX-${base}-${nanoid(4).toUpperCase()}`;
}

export async function ensureReferralCode(investorId) {
  const inv = await investDb.investor.findUnique({ where: { id: investorId } });
  if (!inv) return null;
  if (inv.referralCode) return inv.referralCode;
  let code = generateReferralCode(inv.name);
  for (let i = 0; i < 5; i++) {
    const clash = await investDb.investor.findUnique({ where: { referralCode: code } });
    if (!clash) break;
    code = generateReferralCode(inv.name);
  }
  await investDb.investor.update({ where: { id: investorId }, data: { referralCode: code } });
  return code;
}

export async function resolveReferrer(referralCode) {
  if (!referralCode) return null;
  return investDb.investor.findFirst({
    where: { referralCode: String(referralCode).trim().toUpperCase(), role: "INVESTOR" },
  });
}

/** Level 1–5 commission percentages (falls back to referral_commission_pct for L1). */
export async function getReferralLevelPcts() {
  const legacy = Number(await getSetting("referral_commission_pct")) || 2;
  const levels = [];
  for (let i = 1; i <= 5; i++) {
    const raw = await getSetting(`referral_level_${i}_pct`);
    if (raw === null || raw === undefined || raw === "") {
      levels.push(i === 1 ? legacy : 0);
    } else {
      levels.push(Number(raw) || 0);
    }
  }
  return levels;
}

export async function getReferralStats(investorId) {
  const code = await ensureReferralCode(investorId);
  const [referrals, earnings, paidAgg, pendingAgg, activeReferrals] = await Promise.all([
    investDb.investor.count({ where: { referredById: investorId } }),
    investDb.referralEarning.findMany({
      where: { referrerId: investorId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    investDb.referralEarning.aggregate({
      where: { referrerId: investorId, status: "PAID" },
      _sum: { amount: true },
    }),
    investDb.referralEarning.aggregate({
      where: { referrerId: investorId, status: "PENDING" },
      _sum: { amount: true },
    }),
    investDb.investor.count({
      where: {
        referredById: investorId,
        subscriptions: { some: { status: "ACTIVE" } },
      },
    }),
  ]);

  const referredUsers = await investDb.investor.findMany({
    where: { referredById: investorId },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const levelPcts = await getReferralLevelPcts();

  return {
    referralCode: code,
    totalReferrals: referrals,
    activeReferrals,
    pendingReferrals: referrals - activeReferrals,
    totalEarnings: paidAgg._sum.amount || 0,
    pendingEarnings: pendingAgg._sum.amount || 0,
    levelCommissions: levelPcts.map((pct, i) => ({ level: i + 1, pct })),
    earnings,
    referredUsers,
  };
}

export async function getReferralLeaderboard({ limit = 10 } = {}) {
  const grouped = await investDb.referralEarning.groupBy({
    by: ["referrerId"],
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });

  if (!grouped.length) return [];

  const referrerIds = grouped.map((g) => g.referrerId);
  const investors = await investDb.investor.findMany({
    where: { id: { in: referrerIds } },
    select: {
      id: true,
      name: true,
      referralCode: true,
      _count: { select: { referrals: true } },
    },
  });
  const byId = Object.fromEntries(investors.map((i) => [i.id, i]));

  return grouped.map((g, idx) => {
    const inv = byId[g.referrerId];
    const firstName = String(inv?.name || "Investor").split(/\s+/)[0];
    return {
      rank: idx + 1,
      referrerId: g.referrerId,
      name: firstName,
      referralCode: inv?.referralCode || "",
      totalReferrals: inv?._count?.referrals || 0,
      totalEarnings: g._sum.amount || 0,
      earningEvents: g._count.id,
    };
  });
}

/** Credit up to 5 upline levels when a referred user invests. */
export async function creditReferralOnInvestment(investorId, amount, subscriptionId) {
  const inv = await investDb.investor.findUnique({ where: { id: investorId } });
  if (!inv?.referredById) return [];

  const chain = [];
  let refId = inv.referredById;
  while (refId && chain.length < 5) {
    chain.push(refId);
    const up = await investDb.investor.findUnique({
      where: { id: refId },
      select: { referredById: true },
    });
    refId = up?.referredById || null;
  }

  const pcts = await getReferralLevelPcts();
  const created = [];
  for (let i = 0; i < chain.length; i++) {
    const pct = pcts[i] || 0;
    if (pct <= 0) continue;
    const commission = Math.round((Number(amount) * pct) / 100);
    if (commission <= 0) continue;
    const earning = await investDb.referralEarning.create({
      data: {
        referrerId: chain[i],
        referredId: investorId,
        amount: commission,
        status: "PENDING",
        note: `Level ${i + 1}: ${pct}% referral commission on investment`,
      },
    });
    created.push(earning);
  }
  return created;
}
