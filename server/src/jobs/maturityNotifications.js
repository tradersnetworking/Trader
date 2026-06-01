import { investDb } from "../db.js";
import { config } from "../config.js";
import { notifyMaturityReminder, notifyPlanMatured, notifyMaturityChoicePrompt } from "../services/investNotifications.js";
import { ensureMaturityPayout, calcMaturityProfit } from "../services/maturityPayments.js";

const MS_DAY = 86400000;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function runMaturityNotificationJob() {
  const now = new Date();
  const reminderDays = config.maturityReminderDays || 7;
  const reminderEnd = new Date(now.getTime() + reminderDays * MS_DAY);

  const upcoming = await investDb.subscription.findMany({
    where: {
      status: "ACTIVE",
      maturityReminderSent: false,
      maturityDate: { gt: now, lte: reminderEnd },
    },
    include: { investor: true, plan: true },
  });

  for (const sub of upcoming) {
    if (!sub.investor?.email) continue;
    const daysLeft = Math.max(1, Math.ceil((new Date(sub.maturityDate) - now) / MS_DAY));
    await notifyMaturityReminder(sub.investor, sub, sub.plan, daysLeft);
    await investDb.subscription.update({ where: { id: sub.id }, data: { maturityReminderSent: true } });
  }

  // 1 day before maturity — prompt investor to choose payout option
  const tomorrow = new Date(startOfDay().getTime() + MS_DAY);
  const dayAfterTomorrow = new Date(startOfDay().getTime() + 2 * MS_DAY);
  const choiceDue = await investDb.subscription.findMany({
    where: {
      status: "ACTIVE",
      maturityChoicePromptSent: false,
      maturityDate: { gte: tomorrow, lte: dayAfterTomorrow },
    },
    include: { investor: true, plan: true },
  });

  for (const sub of choiceDue) {
    if (sub.investor?.email) {
      const { profitAmount } = calcMaturityProfit(sub);
      await notifyMaturityChoicePrompt(sub.investor, sub, sub.plan, profitAmount);
    }
    await investDb.subscription.update({ where: { id: sub.id }, data: { maturityChoicePromptSent: true } });
  }

  // Matured today — create payout records
  const due = await investDb.subscription.findMany({
    where: {
      status: "ACTIVE",
      maturityDate: { lte: now },
      maturedNotifiedAt: null,
    },
    include: { investor: true, plan: true },
  });

  for (const sub of due) {
    await ensureMaturityPayout(sub);
    if (sub.investor?.email) await notifyPlanMatured(sub.investor, sub, sub.plan);
    await investDb.subscription.update({
      where: { id: sub.id },
      data: { status: "MATURED", maturedNotifiedAt: now, compounding: true },
    });
  }

  if (upcoming.length || choiceDue.length || due.length) {
    console.log(`[maturity-job] reminders:${upcoming.length} choice:${choiceDue.length} matured:${due.length}`);
  }
}

export function startMaturityNotificationScheduler() {
  const intervalMs = Number(process.env.MATURITY_JOB_INTERVAL_MS || 6 * 60 * 60 * 1000);
  setTimeout(() => runMaturityNotificationJob().catch((e) => console.error("[maturity-job]", e.message)), 15000);
  setInterval(() => runMaturityNotificationJob().catch((e) => console.error("[maturity-job]", e.message)), intervalMs);
  console.log(`  Maturity email job scheduled (every ${intervalMs / 3600000}h)`);
}
