import { investDb } from "../db.js";
import { sendMail } from "../utils/mailer.js";

export async function listNotInvestedInvestors() {
  const rows = await investDb.investor.findMany({
    where: {
      role: "INVESTOR",
      isActive: true,
      subscriptions: { none: { status: { in: ["ACTIVE", "MATURED", "PENDING"] } } },
    },
    include: { kyc: true, wallet: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(({ passwordHash, ...r }) => r);
}

export async function sendNotInvestedEmail({ subject, html, text, investorIds, actor }) {
  const subjectLine = subject || "Start your investment journey with Akshaya EXIM TRADERS";
  const bodyHtml =
    html ||
    `<p>Dear investor,</p><p>You have registered on Akshaya EXIM TRADERS invest portal but haven't started an investment plan yet.</p><p>Explore our plans and begin earning consistent returns with transparent profit sharing.</p><p>— Akshaya EXIM TRADERS Team</p>`;
  const bodyText = text || "You registered but haven't invested yet. Log in to explore investment plans.";

  let targets = await listNotInvestedInvestors();
  if (investorIds?.length) {
    const set = new Set(investorIds);
    targets = targets.filter((i) => set.has(i.id));
  }

  let sent = 0;
  const errors = [];
  for (const inv of targets) {
    if (!inv.email) continue;
    try {
      await sendMail({
        to: inv.email,
        subject: subjectLine.replace(/\{name\}/g, inv.name || "Investor"),
        html: bodyHtml.replace(/\{name\}/g, inv.name || "Investor"),
        text: bodyText.replace(/\{name\}/g, inv.name || "Investor"),
        purpose: "broadcast",
        portal: "invest",
        mailboxId: "invest",
      });
      sent++;
    } catch (e) {
      errors.push({ email: inv.email, error: e.message });
    }
  }

  return { sent, total: targets.length, errors, from: "noreply@akshayaexim.in" };
}
