import { getSetting, setSettings, getAllSettings } from "./investSettings.js";
import { getReferralLevelPcts } from "./referral.js";

const KEYS = [
  "referral_commission_pct",
  "referral_level_1_pct",
  "referral_level_2_pct",
  "referral_level_3_pct",
  "referral_level_4_pct",
  "referral_level_5_pct",
  "referral_payout_frequency",
  "referral_min_payout",
  "referral_auto_payout",
];

const DEFAULTS = {
  referral_commission_pct: "2",
  referral_level_1_pct: "2",
  referral_level_2_pct: "1",
  referral_level_3_pct: "0.5",
  referral_level_4_pct: "0",
  referral_level_5_pct: "0",
  referral_payout_frequency: "MANUAL",
  referral_min_payout: "100",
  referral_auto_payout: "false",
};

export const PAYOUT_FREQUENCIES = [
  { id: "MANUAL", label: "Manual — admin pays from Referral Payouts tab" },
  { id: "ON_INVEST", label: "On each investment — credit wallet when referred user invests" },
  { id: "WEEKLY", label: "Weekly batch — auto-pay pending above minimum every 7 days" },
  { id: "MONTHLY", label: "Monthly batch — auto-pay pending above minimum every 30 days" },
];

export async function getReferralSettings() {
  const settings = await getAllSettings(false);
  const levels = await getReferralLevelPcts();
  return {
    levelCommissions: levels.map((pct, i) => ({ level: i + 1, pct })),
    payoutFrequency: settings.referral_payout_frequency || DEFAULTS.referral_payout_frequency,
    minPayout: Number(settings.referral_min_payout || DEFAULTS.referral_min_payout),
    autoPayout: (settings.referral_auto_payout || DEFAULTS.referral_auto_payout) === "true",
    legacyCommissionPct: Number(settings.referral_commission_pct || DEFAULTS.referral_commission_pct),
  };
}

export async function saveReferralSettings(body) {
  const pairs = {};
  for (let i = 1; i <= 5; i++) {
    const k = `referral_level_${i}_pct`;
    if (body[k] != null) pairs[k] = String(body[k]);
    if (body.levelCommissions?.[i - 1]?.pct != null) pairs[k] = String(body.levelCommissions[i - 1].pct);
  }
  if (body.referral_commission_pct != null) pairs.referral_commission_pct = String(body.referral_commission_pct);
  if (body.levelCommissions?.[0]?.pct != null) {
    pairs.referral_level_1_pct = String(body.levelCommissions[0].pct);
    pairs.referral_commission_pct = String(body.levelCommissions[0].pct);
  }
  if (body.payoutFrequency != null) pairs.referral_payout_frequency = body.payoutFrequency;
  if (body.minPayout != null) pairs.referral_min_payout = String(body.minPayout);
  if (body.autoPayout != null) pairs.referral_auto_payout = body.autoPayout ? "true" : "false";
  await setSettings(pairs);
  return getReferralSettings();
}

export async function getPublicReferralSettings() {
  const s = await getReferralSettings();
  return {
    levelCommissions: s.levelCommissions,
    payoutFrequency: s.payoutFrequency,
    minPayout: s.minPayout,
  };
}
