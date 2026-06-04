import { investDb } from "../db.js";
import { sendMail } from "../utils/mailer.js";
import { investorAuthMethod } from "./investorAdminList.js";

function publicInvestorRow(row) {
  const { passwordHash, resetToken, totpSecret, backupCodes, ...rest } = row;
  return {
    ...rest,
    authMethod: investorAuthMethod(row),
    hasGoogle: Boolean(row.googleId),
    hasPassword: Boolean(passwordHash),
  };
}

const ACTIVE_INVESTMENT_STATUSES = ["ACTIVE", "MATURED", "PENDING"];

function isActiveInvestor(row) {
  return row.isActive !== false;
}

/** No active / matured / pending subscription (registered but not invested). */
export async function listNotInvestedInvestors() {
  const rows = await investDb.investor.findMany({
    where: { role: "INVESTOR" },
    include: {
      kyc: true,
      wallet: true,
      subscriptions: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows
    .filter((r) => {
      if (!isActiveInvestor(r)) return false;
      const subs = r.subscriptions || [];
      return !subs.some((s) => ACTIVE_INVESTMENT_STATUSES.includes(s.status));
    })
    .map(({ subscriptions, ...rest }) => publicInvestorRow(rest));
}

/** Registered investors who have not completed KYC (missing, not submitted, or rejected). */
export async function listKycPendingInvestors() {
  const rows = await investDb.investor.findMany({
    where: { role: "INVESTOR" },
    include: { kyc: true, wallet: true },
    orderBy: { createdAt: "desc" },
  });
  return rows
    .filter((r) => {
      if (!isActiveInvestor(r)) return false;
      const st = r.kyc?.status;
      return !r.kyc || st === "NOT_SUBMITTED" || st === "REJECTED";
    })
    .map(publicInvestorRow);
}

async function resolveTargets(listFn, investorIds) {
  let targets = await listFn();
  if (investorIds?.length) {
    const set = new Set(investorIds);
    targets = targets.filter((i) => set.has(i.id));
  }
  return targets;
}

function personalize(text, name) {
  return String(text || "").replace(/\{name\}/g, name || "Investor");
}

async function sendNurtureEmails(targets, { subject, html, text }) {
  const subjectLine = subject || "Message from AKSHYA INVESTMENTS";
  const bodyHtml = html || `<p>Dear investor,</p><p>Please log in to your AKSHYA INVESTMENTS account.</p>`;
  const bodyText = text || "Please log in to your AKSHYA INVESTMENTS account.";

  let sent = 0;
  const errors = [];
  for (const inv of targets) {
    if (!inv.email) continue;
    try {
      await sendMail({
        to: inv.email,
        subject: personalize(subjectLine, inv.name),
        html: personalize(bodyHtml, inv.name),
        text: personalize(bodyText, inv.name),
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

async function sendNurtureWhatsApp(targets, { message }) {
  const { sendWhatsAppTransactional } = await import("./whatsappBusiness.js");
  const line =
    message ||
    "Dear {name}, please log in to AKSHYA INVESTMENTS to complete your next steps. — AKSHYA INVESTMENTS";

  let sent = 0;
  let skipped = 0;
  const errors = [];
  for (const inv of targets) {
    const result = await sendWhatsAppTransactional(inv, personalize(line, inv.name));
    if (result.ok) sent++;
    else if (result.skipped) skipped++;
    else errors.push({ id: inv.id, phone: inv.phone, error: result.error || result.reason || "failed" });
  }
  return { sent, skipped, total: targets.length, errors };
}

export async function sendNotInvestedNurture({
  subject,
  html,
  text,
  whatsappMessage,
  investorIds,
  sendEmail = true,
  sendWhatsApp = false,
}) {
  const targets = await resolveTargets(listNotInvestedInvestors, investorIds);
  const out = { total: targets.length, email: null, whatsapp: null };
  if (sendEmail) {
    out.email = await sendNurtureEmails(targets, {
      subject: subject || "Start your investment journey with AKSHYA INVESTMENTS",
      html:
        html ||
        `<p>Dear investor,</p><p>You have registered on AKSHYA INVESTMENTS but haven't started an investment plan yet.</p><p>Explore our plans and begin earning consistent returns with transparent profit sharing.</p><p>— AKSHYA INVESTMENTS Team</p>`,
      text: text || "You registered but haven't invested yet. Log in to explore investment plans.",
    });
  }
  if (sendWhatsApp) {
    out.whatsapp = await sendNurtureWhatsApp(targets, {
      message:
        whatsappMessage ||
        "Dear {name}, you registered on AKSHYA INVESTMENTS but have not invested yet. Log in to explore Bronze, Silver, Gold and other plans. — AKSHYA INVESTMENTS",
    });
  }
  return out;
}

export async function sendKycPendingNurture({
  subject,
  html,
  text,
  whatsappMessage,
  investorIds,
  sendEmail = true,
  sendWhatsApp = false,
}) {
  const targets = await resolveTargets(listKycPendingInvestors, investorIds);
  const out = { total: targets.length, email: null, whatsapp: null };
  if (sendEmail) {
    out.email = await sendNurtureEmails(targets, {
      subject: subject || "Complete your KYC — AKSHYA INVESTMENTS",
      html:
        html ||
        `<p>Dear investor,</p><p>You registered on AKSHYA INVESTMENTS but your KYC is not complete yet.</p><p>Log in and complete KYC (identity, bank &amp; payout details) to unlock deposits, investments and withdrawals.</p><p>— AKSHYA INVESTMENTS Team</p>`,
      text:
        text ||
        "You registered but KYC is not complete. Log in to finish KYC and unlock your investor dashboard.",
    });
  }
  if (sendWhatsApp) {
    out.whatsapp = await sendNurtureWhatsApp(targets, {
      message:
        whatsappMessage ||
        "Dear {name}, your KYC on AKSHYA INVESTMENTS is not complete. Please log in and finish KYC (ID, bank & payout) to start investing. — AKSHYA INVESTMENTS",
    });
  }
  return out;
}

/** @deprecated Use sendNotInvestedNurture — kept for existing route */
export async function sendNotInvestedEmail({ subject, html, text, investorIds }) {
  const r = await sendNotInvestedNurture({ subject, html, text, investorIds, sendEmail: true, sendWhatsApp: false });
  return { sent: r.email?.sent ?? 0, total: r.total, errors: r.email?.errors ?? [], from: r.email?.from };
}
