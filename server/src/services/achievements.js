import { investDb } from "../db.js";
import { PLAN_TYPES } from "../utils/invest.js";

/** Cumulative invested amount milestones (INR). */
export const INVESTMENT_MILESTONES = [
  { id: "first_investment", label: "First Investment", threshold: 1, icon: "🎯", description: "Started your investment journey" },
  { id: "invest_1l", label: "₹1 Lakh Club", threshold: 100_000, icon: "💫", description: "Total invested ₹1,00,000+" },
  { id: "invest_5l", label: "₹5 Lakh Club", threshold: 500_000, icon: "⭐", description: "Total invested ₹5,00,000+" },
  { id: "invest_10l", label: "₹10 Lakh Club", threshold: 1_000_000, icon: "🌟", description: "Total invested ₹10,00,000+" },
  { id: "invest_50l", label: "₹50 Lakh Club", threshold: 5_000_000, icon: "🏆", description: "Total invested ₹50,00,000+" },
  { id: "invest_1cr", label: "₹1 Crore Club", threshold: 10_000_000, icon: "👑", description: "Total invested ₹1,00,00,000+" },
];

/** Tier badges from highest plan category subscribed. */
export const TIER_BADGES = {
  STARTER: { id: "tier_starter", label: "Starter Investor", icon: "🌱", color: "#2e7d32" },
  BRONZE: { id: "tier_bronze", label: "Bronze Investor", icon: "🥉", color: "#a9622b" },
  SILVER: { id: "tier_silver", label: "Silver Investor", icon: "🥈", color: "#8a9099" },
  GOLD: { id: "tier_gold", label: "Gold Investor", icon: "🥇", color: "#d4a017" },
  PLATINUM: { id: "tier_platinum", label: "Platinum Investor", icon: "💎", color: "#2f6db5" },
  DIAMOND: { id: "tier_diamond", label: "Diamond Investor", icon: "💠", color: "#7b3fb0" },
};

const TIER_RANK = Object.fromEntries(PLAN_TYPES.map((t, i) => [t, i]));

export async function getInvestorAchievements(investorId) {
  const [subs, referralCount, wallet] = await Promise.all([
    investDb.subscription.findMany({
      where: { investorId, status: { in: ["ACTIVE", "MATURED"] } },
      include: { plan: { select: { planType: true, name: true } } },
    }),
    investDb.investor.count({ where: { referredById: investorId } }),
    investDb.wallet.findUnique({ where: { investorId } }),
  ]);

  const totalInvested = subs.reduce((n, s) => n + s.amount, 0);
  const activeCount = subs.filter((s) => s.status === "ACTIVE").length;
  const totalEarnings = wallet?.earnings || 0;

  let highestTier = null;
  for (const s of subs) {
    const t = s.plan?.planType;
    if (!t) continue;
    if (!highestTier || (TIER_RANK[t] ?? 0) > (TIER_RANK[highestTier] ?? 0)) highestTier = t;
  }

  const milestones = INVESTMENT_MILESTONES.map((m) => {
    const unlocked =
      m.id === "first_investment" ? subs.length > 0 : totalInvested >= m.threshold;
    const progress =
      m.id === "first_investment"
        ? subs.length > 0
          ? 100
          : 0
        : Math.min(100, Math.round((totalInvested / m.threshold) * 100));
    return { ...m, unlocked, progress: unlocked ? 100 : progress };
  });

  const tierBadge = highestTier ? { ...TIER_BADGES[highestTier], planType: highestTier, unlocked: true } : null;

  const referralMilestones = [
    { id: "ref_1", label: "First Referral", threshold: 1, icon: "🤝", unlocked: referralCount >= 1 },
    { id: "ref_5", label: "5 Referrals", threshold: 5, icon: "📣", unlocked: referralCount >= 5 },
    { id: "ref_10", label: "10 Referrals", threshold: 10, icon: "🚀", unlocked: referralCount >= 10 },
  ].map((m) => ({ ...m, progress: Math.min(100, Math.round((referralCount / m.threshold) * 100)) }));

  const unlocked = [
    ...milestones.filter((m) => m.unlocked),
    ...(tierBadge ? [tierBadge] : []),
    ...referralMilestones.filter((m) => m.unlocked),
  ];

  return {
    totalInvested,
    activeInvestments: activeCount,
    totalEarnings,
    referralCount,
    highestTier,
    milestones,
    tierBadge,
    referralMilestones,
    unlocked,
    unlockedCount: unlocked.length,
  };
}
