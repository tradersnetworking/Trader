import { sendMail, normalizeMailRecipient } from "../utils/mailer.js";
import { getEmailCommunicationConfig } from "./emailCommunication.js";
import { generateTransactionalReceiptPdf } from "./transactionalReceiptPdf.js";
import { TRANSACTIONAL_TEMPLATES } from "./transactionalEmailTemplates.js";
import { config } from "../config.js";
import { BRAND_INVEST } from "../data/brand.js";

export function fmtInr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function personalizeTemplate(template, ctx) {
  if (!template) return "";
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = ctx[key];
    return v != null && v !== "" ? String(v) : "—";
  });
}

export function buildInvestorContext(investor, fields = {}) {
  const name = investor?.name?.trim() || "Investor";
  return {
    investorName: name,
    investorEmail: investor?.email || "",
    investorId: investor?.id || "",
    portalUrl: config.investPortalUrl,
    brandName: BRAND_INVEST,
    date: fmtDate(new Date()),
    remarks: "Please contact support for details",
    reference: "—",
    ...fields,
  };
}

function emailLayout(title, bodyHtml) {
  const logoUrl = `${config.investPortalUrl}/assets/logo-mark.png`;
  return `<!DOCTYPE html><html><body style="font-family:Inter,Segoe UI,sans-serif;background:#f4f6fb;padding:24px;color:#0a1f44">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
<div style="background:linear-gradient(135deg,#002366,#0056b3);padding:20px 24px;color:#fff;text-align:center">
<img src="${logoUrl}" alt="${BRAND_INVEST}" width="72" height="72" style="display:block;margin:0 auto 12px;object-fit:contain" />
<h1 style="margin:0;font-size:18px">${BRAND_INVEST}</h1>
<p style="margin:4px 0 0;font-size:12px;opacity:.85">${title}</p>
</div>
<div style="padding:24px;font-size:14px;line-height:1.6">${bodyHtml}</div>
<div style="padding:16px 24px;background:#f8fafc;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0">
<a href="${config.investPortalUrl}/dashboard" style="color:#0a3d91">Open Investor Dashboard</a> · invest.akshayaexim.com
</div></div></body></html>`;
}

/**
 * Send a transactional email to exactly one investor with optional PDF receipt.
 */
export async function sendTransactionalEmail({
  investor,
  purpose,
  subjectOverride = null,
  context = {},
  receipt = null,
  extraAttachments = [],
  attachReceipt = true,
}) {
  if (!investor?.email) return { skipped: true, reason: "no_email" };

  const to = normalizeMailRecipient(investor.email);
  if (!to) return { failed: true, error: "Invalid investor email" };

  const comm = await getEmailCommunicationConfig("invest");
  if (comm.autoEmails[purpose]?.enabled === false) {
    return { skipped: true, reason: "disabled" };
  }

  const template = TRANSACTIONAL_TEMPLATES[purpose];
  if (!template) return { failed: true, error: `No template for purpose: ${purpose}` };

  const ctx = buildInvestorContext(investor, context);
  const subject = personalizeTemplate(subjectOverride || comm.autoEmails[purpose]?.subject || template.subject, ctx);
  const bodyHtml = personalizeTemplate(template.bodyHtml, ctx);
  const text = personalizeTemplate(template.bodyText, ctx);
  const html = emailLayout(template.title, bodyHtml);

  const attachments = [...(extraAttachments || [])];
  if (attachReceipt && receipt) {
    try {
      const pdf = await generateTransactionalReceiptPdf({
        title: receipt.title,
        receiptNo: receipt.receiptNo,
        status: receipt.status,
        investor,
        lines: receipt.lines,
      });
      attachments.push({
        filename: receipt.filename || `${purpose}-receipt.pdf`,
        content: pdf,
        contentType: "application/pdf",
      });
    } catch (err) {
      console.error(`[transactional-email] PDF failed (${purpose}):`, err.message);
    }
  }

  const mailboxId = comm.assignments[purpose] || "finance";
  try {
    const result = await sendMail({ to, subject, html, text, purpose, attachments, portal: "invest", mailboxId });
    if (result?.failed) console.error(`[transactional-email] ${purpose} → ${to}:`, result.error);
    return result;
  } catch (err) {
    console.error(`[transactional-email] ${purpose} → ${to}:`, err.message);
    return { failed: true, error: err.message };
  }
}
