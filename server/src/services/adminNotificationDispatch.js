import { investDb } from "../db.js";
import { broadcastNotification, notifyInvestor } from "./notifications.js";
import { sendMail } from "../utils/mailer.js";
import { personalizeContent, resolveNotificationContent } from "./adminNotificationTemplates.js";

function parseChannels(raw) {
  const channels = raw && typeof raw === "object" ? raw : {};
  return {
    app: channels.app === true || channels.inApp === true,
    email: channels.email === true,
    whatsapp: channels.whatsapp === true,
  };
}

async function resolveInvestorTargets(investorIds) {
  const where = { role: "INVESTOR", isActive: true };
  if (investorIds?.length) where.id = { in: investorIds };
  return investDb.investor.findMany({
    where,
    include: { kyc: { select: { phone: true, whatsappNumber: true, whatsappCountryCode: true, phoneCountryCode: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function sendAppNotifications(targets, content) {
  if (!targets.length) return { sent: 0, total: 0 };
  const { title, body, type, link } = content.app;
  if (!title?.trim()) return { sent: 0, total: targets.length, error: "In-app title is required" };
  let sent = 0;
  for (const inv of targets) {
    const personal = personalizeContent(content, inv.name);
    await notifyInvestor(inv.id, personal.app.title, personal.app.body || "", {
      type: personal.app.type || "INFO",
      link: personal.app.link || null,
    });
    sent++;
  }
  return { sent, total: targets.length };
}

async function sendEmailNotifications(targets, content) {
  let sent = 0;
  const errors = [];
  for (const inv of targets) {
    if (!inv.email) continue;
    const personal = personalizeContent(content, inv.name);
    if (!personal.email.subject?.trim()) continue;
    try {
      const result = await sendMail({
        to: inv.email,
        subject: personal.email.subject,
        html: personal.email.html,
        text: personal.email.text,
        purpose: "broadcast",
        portal: "invest",
      });
      if (result?.failed) errors.push({ email: inv.email, error: result.error });
      else sent++;
    } catch (e) {
      errors.push({ email: inv.email, error: e.message });
    }
  }
  return { sent, total: targets.length, errors };
}

async function sendWhatsAppNotifications(targets, content) {
  const { sendWhatsAppTransactional } = await import("./whatsappBusiness.js");
  let sent = 0;
  let skipped = 0;
  const errors = [];
  for (const inv of targets) {
    const personal = personalizeContent(content, inv.name);
    if (!personal.whatsapp.message?.trim()) {
      skipped++;
      continue;
    }
    const result = await sendWhatsAppTransactional(inv, personal.whatsapp.message);
    if (result.ok) sent++;
    else if (result.skipped) skipped++;
    else errors.push({ id: inv.id, error: result.error || result.reason || "failed" });
  }
  return { sent, skipped, total: targets.length, errors };
}

/**
 * Send admin notifications to one or more investors across selected channels.
 */
export async function sendAdminNotifications({
  investorIds,
  channels: rawChannels,
  templateId = "custom",
  title,
  body,
  type,
  link,
  emailSubject,
  emailText,
  emailHtml,
  whatsappMessage,
}) {
  const channels = parseChannels(rawChannels);
  if (!channels.app && !channels.email && !channels.whatsapp) {
    throw new Error("Select at least one channel: in-app, email, or WhatsApp");
  }

  const content = resolveNotificationContent(templateId, {
    title,
    body,
    type,
    link,
    emailSubject,
    emailText,
    emailHtml,
    whatsappMessage,
  });

  if (channels.app && !content.app.title?.trim()) {
    throw new Error("In-app notification title is required");
  }
  if (channels.email && !content.email.subject?.trim()) {
    throw new Error("Email subject is required");
  }
  if (channels.whatsapp && !content.whatsapp.message?.trim()) {
    throw new Error("WhatsApp message is required");
  }

  const targets = await resolveInvestorTargets(investorIds);
  if (!targets.length) throw new Error("No matching investors found");

  const result = { total: targets.length, templateId, channels, app: null, email: null, whatsapp: null };

  if (channels.app) {
    if (targets.length === 1) {
      result.app = await sendAppNotifications(targets, content);
    } else {
      const { title: t, body: b, type: ty, link: lk } = content.app;
      const broadcast = await broadcastNotification({
        title: t,
        body: b || "",
        type: ty || "INFO",
        link: lk || null,
        investorIds: targets.map((i) => i.id),
      });
      result.app = { sent: broadcast.count, total: targets.length };
    }
  }

  if (channels.email) result.email = await sendEmailNotifications(targets, content);
  if (channels.whatsapp) result.whatsapp = await sendWhatsAppNotifications(targets, content);

  return result;
}
