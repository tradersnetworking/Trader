import { investDb } from "../db.js";
import { settlementPayoutAmount, settlementCycleMs } from "../utils/invest.js";
import { notifyInvestorWithPush } from "../services/roiEngine.js";
import { sendMail } from "../utils/mailer.js";

const MS_DAY = 86400000;

function nextPayoutDate(sub) {
  const cycle = sub.settlementCycle || "MONTHLY";
  const last = sub.lastRoiPaidAt ? new Date(sub.lastRoiPaidAt) : new Date(sub.startDate);
  const next = new Date(last.getTime() + settlementCycleMs(cycle));
  return next;
}

/** Notify investors ~1 day before scheduled ROI credit */
export async function runRoiPayoutReminderJob() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + MS_DAY);
  const subs = await investDb.subscription.findMany({
    where: { status: "ACTIVE", maturityDate: { gt: now } },
    include: { plan: true, investor: true },
  });

  let sent = 0;
  for (const sub of subs) {
    const due = nextPayoutDate(sub);
    if (due < now || due > tomorrow) continue;
    const cycle = sub.settlementCycle || "MONTHLY";
    const amount = settlementPayoutAmount(sub.amount, sub.monthlyRoiPct, cycle);
    if (amount <= 0 || !sub.investor?.email) continue;

    const already = await investDb.notification.findFirst({
      where: {
        investorId: sub.investorId,
        title: "Upcoming ROI payout",
        createdAt: { gte: new Date(now.getTime() - MS_DAY) },
      },
    });
    if (already) continue;

    const body = `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${cycle.toLowerCase()} return for ${sub.plan?.name || "your investment"} is scheduled around ${due.toLocaleDateString("en-IN")}.`;
    await notifyInvestorWithPush(sub.investorId, {
      title: "Upcoming ROI payout",
      body,
      type: "INFO",
      link: "investments",
    });
    await sendMail({
      to: sub.investor.email,
      purpose: "roi_reminder",
      subject: "Upcoming profit payout — AKASHYA INVESTMENTS",
      html: `<p>Hi ${sub.investor.name},</p><p>${body}</p><p>Amount will be credited to your earnings wallet when due.</p>`,
    }).catch(() => {});
    sent++;
  }
  return { remindersSent: sent, at: now.toISOString() };
}
