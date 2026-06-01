import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH, authRequired, requireRole, requirePermission } from "../middleware.js";
import { hashPassword } from "../utils/auth.js";
import { annualRoiPct, PLAN_TYPES, PLAN_CAPITAL, lockInDaysFromMonths, normalizePlanRoi } from "../utils/invest.js";
import { disburse, payoutGatewayStatus } from "../payments/payouts.js";
import { listGateways } from "../payments/gateways.js";
import {
  listPaymentGateways,
  createPaymentGateway,
  updatePaymentGateway,
  deletePaymentGateway,
} from "../services/paymentGateways.js";
import { logAudit, listAuditLogs } from "../services/auditLog.js";
import { broadcastNotification, notifyInvestor } from "../services/notifications.js";
import { listPromoCodes, applyPromoCode } from "../services/promoCodes.js";
import { getAdminDashboard, getPlatformLedger } from "../services/investDashboard.js";
import { getFinancialReports } from "../services/financialReports.js";
import {
  notifyDepositApproved,
  notifyDepositRejected,
  notifyKycDecision,
  notifyWithdrawalReleased,
  notifyWithdrawalRejected,
  notifyWithdrawalRequested,
} from "../services/investNotifications.js";
import { addLedger } from "./investInvestor.js";
import {
  getTodayMaturityStats,
  getTodayPendingPayments,
  getUpcomingPayments,
  approveMaturityPayout,
  rejectMaturityPayout,
  onMaturityPayoutReleased,
} from "../services/maturityPayments.js";
import { getAllSettings, setSettings } from "../services/investSettings.js";
import {
  exportInvestData,
  formatExport,
  importInvestData,
  INVEST_DATASETS,
} from "../services/dataPortability.js";
import {
  getReferralSettings,
  saveReferralSettings,
} from "../services/referralSettings.js";
import {
  createInvestorFull,
  updateInvestorFull,
  adminAssignSubscription,
  updateSubscriptionRoi,
  scheduleManualPayout,
  completeScheduledPayout,
  cancelScheduledPayout,
  adminWalletOperation,
} from "../services/adminInvestorOps.js";
import {
  payReferralEarningById,
  payAllPendingReferrals,
} from "../services/referralPayoutJob.js";
import {
  getEmailCommunicationBundle,
  saveEmailCommunicationConfig,
  sendPurposeTestEmail,
} from "../services/emailCommunication.js";
import {
  getTemplates,
  updateTemplate,
  listAllAgreements,
  revokeAgreement,
  adminGenerateForInvestor,
  getAgreementPdfBuffer,
  previewTemplateContent,
  getAgreementById,
  AGREEMENT_TYPES,
  AGREEMENT_PLACEHOLDERS,
  getDefaultTemplate,
  templateContentToMarkdown,
} from "../services/agreements.js";
import { getAgreementSettings, updateAgreementSettings } from "../services/agreementSettings.js";

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0]?.trim()) || req.socket?.remoteAddress || "";
}

const router = Router();
const SCOPE = "invest";
const adminOnly = requireRole("ADMIN", "SUPERADMIN");
const superOnly = requireRole("SUPERADMIN");

router.get(
  "/permissions",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    const { getPermissionsForInvestor } = await import("../services/rbac.js");
    res.json({ permissions: await getPermissionsForInvestor(investor), role: investor?.role });
  })
);

const PLAN_TYPES_LIST = PLAN_TYPES;

/* ---------------- Plans CRUD (super admin only) ---------------- */
router.get(
  "/plans",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const plans = await investDb.plan.findMany({ orderBy: { lockInDays: "asc" } });
    res.json({
      plans: plans.map(normalizePlanRoi),
      planTypes: PLAN_TYPES_LIST,
      planCapital: PLAN_CAPITAL,
      lockInMonthsOptions: Array.from({ length: 60 }, (_, i) => i + 1),
    });
  })
);

router.post(
  "/plans",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_plans"),
  asyncH(async (req, res) => {
    const b = req.body;
    if (!PLAN_TYPES_LIST.includes(b.planType)) return res.status(400).json({ error: "Invalid plan category" });
    const cap = PLAN_CAPITAL[b.planType];
    const lockInMonths = Number(b.lockInMonths ?? b.lockInDays / 30 ?? 12);
    if (lockInMonths < 1 || lockInMonths > 60) return res.status(400).json({ error: "Lock-in must be 1–60 months" });
    const lockInDays = lockInDaysFromMonths(lockInMonths);
    const monthlyRoiPct = Number(b.monthlyRoiPct ?? b.profitSharePct ?? cap.monthlyRoiPct);
    const names = { STARTER: "Starter", BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", PLATINUM: "Platinum", DIAMOND: "Diamond" };
    const plan = await investDb.plan.create({
      data: {
        planType: b.planType,
        name: b.name || `${names[b.planType]} • ${lockInMonths} Month${lockInMonths > 1 ? "s" : ""}`,
        lockInDays,
        minInvestment: cap.min,
        maxInvestment: cap.max,
        profitSharePct: Number(b.profitSharePct ?? monthlyRoiPct),
        monthlyRoiPct,
        annualRoiPct: Number(b.annualRoiPct ?? annualRoiPct(monthlyRoiPct)),
        settlementCycles: b.settlementCycles || "MONTHLY",
        color: b.color || cap.color,
        description: b.description || `${cap.label} • ${lockInMonths}-month lock-in sub-category`,
        isActive: b.isActive !== false,
      },
    });
    res.json({ plan });
  })
);

router.put(
  "/plans/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_plans"),
  asyncH(async (req, res) => {
    const b = req.body;
    const data = {};
    if (b.planType && PLAN_TYPES_LIST.includes(b.planType)) {
      data.planType = b.planType;
      const cap = PLAN_CAPITAL[b.planType];
      data.minInvestment = cap.min;
      data.maxInvestment = cap.max;
      if (!b.color) data.color = cap.color;
    }
    if (b.lockInMonths !== undefined || b.lockInDays !== undefined) {
      const m = Number(b.lockInMonths ?? b.lockInDays / 30);
      if (m < 1 || m > 60) return res.status(400).json({ error: "Lock-in must be 1–60 months" });
      data.lockInDays = lockInDaysFromMonths(m);
    }
    if (b.name !== undefined) data.name = b.name;
    if (b.minInvestment !== undefined && b.planType) { /* capital fixed by category */ }
    if (b.maxInvestment !== undefined && b.planType) { /* capital fixed by category */ }
    if (b.monthlyRoiPct !== undefined) {
      data.monthlyRoiPct = Number(b.monthlyRoiPct);
      data.profitSharePct = Number(b.profitSharePct ?? b.monthlyRoiPct);
      data.annualRoiPct = annualRoiPct(Number(b.monthlyRoiPct));
    }
    if (b.settlementCycles !== undefined) data.settlementCycles = b.settlementCycles;
    if (b.color !== undefined) data.color = b.color;
    if (b.description !== undefined) data.description = b.description;
    if (b.isActive !== undefined) data.isActive = b.isActive;
    const plan = await investDb.plan.update({ where: { id: req.params.id }, data });
    res.json({ plan });
  })
);

router.delete(
  "/plans/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_plans"),
  asyncH(async (req, res) => {
    await investDb.plan.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

/* ---------------- Investors ---------------- */
router.get(
  "/investors",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const investors = await investDb.investor.findMany({
      orderBy: { createdAt: "desc" },
      include: { wallet: true, kyc: true },
    });
    res.json({ investors: investors.map(({ passwordHash, resetToken, ...i }) => i) });
  })
);

router.get(
  "/investors/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({
      where: { id: req.params.id },
      include: {
        wallet: true,
        kyc: true,
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 20 },
        deposits: { orderBy: { createdAt: "desc" }, take: 10 },
        payouts: { orderBy: { createdAt: "desc" }, take: 10 },
        tickets: { orderBy: { updatedAt: "desc" }, take: 5 },
        _count: { select: { referrals: true, subscriptions: true } },
      },
    });
    if (!inv) return res.status(404).json({ error: "Not found" });
    const { passwordHash, resetToken, totpSecret, backupCodes, ...user } = inv;
    res.json({ investor: user });
  })
);

router.patch(
  "/investors/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: "Not found" });
    if (["SUPERADMIN"].includes(inv.role) && req.user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Cannot modify super admin accounts" });
    }
    if (req.body.kyc || req.body.bankName !== undefined) {
      const updated = await updateInvestorFull(req.params.id, req.body, req.user);
      const { passwordHash, resetToken, totpSecret, backupCodes, ...user } = updated;
      return res.json({ investor: user });
    }
    const data = {};
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (req.body.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body.phone !== undefined) data.phone = req.body.phone || null;
    const updated = await investDb.investor.update({ where: { id: inv.id }, data });
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name, action: "INVESTOR_UPDATE", entity: "Investor", entityId: inv.id, meta: JSON.stringify(data) });
    const { passwordHash, resetToken, totpSecret, backupCodes, ...user } = updated;
    res.json({ investor: user });
  })
);

router.post(
  "/investors/create-full",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const result = await createInvestorFull(req.body, req.user);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.put(
  "/investors/:id/full",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const investor = await updateInvestorFull(req.params.id, req.body, req.user);
      const { passwordHash, resetToken, totpSecret, backupCodes, ...user } = investor;
      res.json({ investor: user });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/investors/:id/subscribe",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const subscription = await adminAssignSubscription(req.params.id, req.body, req.user);
      res.json({ subscription });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.patch(
  "/subscriptions/:id/roi",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const subscription = await updateSubscriptionRoi(req.params.id, req.body, req.user);
      res.json({ subscription });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/payouts/schedule",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const payout = await scheduleManualPayout(req.body, req.user);
      res.json({ payout });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/payouts/:id/mark-done",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const payout = await completeScheduledPayout(req.params.id, req.user);
      res.json({ payout });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/payouts/:id/cancel-scheduled",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const payout = await cancelScheduledPayout(req.params.id, req.user);
      res.json({ payout });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/wallet/adjust",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const wallet = await adminWalletOperation(req.body, req.user);
      res.json({ wallet });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.get(
  "/notifications/recent",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const notifications = await investDb.notification.findMany({
      include: { investor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json({ notifications });
  })
);

router.post(
  "/notifications/send",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("broadcast_notifications"),
  asyncH(async (req, res) => {
    const { investorId, title, body, type, link } = req.body;
    if (!investorId || !title) return res.status(400).json({ error: "investorId and title required" });
    const n = await notifyInvestor(investorId, title, body || "", { type: type || "INFO", link: link || null });
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name, action: "NOTIFY_USER", entity: "Notification", entityId: n?.id, meta: JSON.stringify({ investorId, title }) });
    res.json({ notification: n });
  })
);

router.get(
  "/export",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const datasets = req.query.datasets ? String(req.query.datasets).split(",").filter(Boolean) : null;
    const format = String(req.query.format || "json").toLowerCase();
    const payload = await exportInvestData(datasets);
    const { content, mime, ext } = formatExport(payload, format);
    if (format === "json") return res.json(payload);
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="akshaya-invest-export.${ext}"`);
    res.send(content);
  })
);

router.get(
  "/export/datasets",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json({ datasets: INVEST_DATASETS });
  })
);

router.post(
  "/import",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const result = await importInvestData(req.body, { actorId: req.user.id });
    res.json(result);
  })
);

// Admin can create investor accounts only (not ADMIN / SUPERADMIN)
router.post(
  "/users",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: "Email, name and password are required" });
    const normalized = email.toLowerCase();
    if (await investDb.investor.findUnique({ where: { email: normalized } })) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const inv = await investDb.investor.create({
      data: { email: normalized, name, passwordHash: hashPassword(password), role: "INVESTOR" },
    });
    await investDb.wallet.create({ data: { investorId: inv.id } });
    const { passwordHash, ...u } = inv;
    res.json({ user: u });
  })
);

// Only super admin can create admin accounts on the portal
router.post(
  "/staff",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { email, name, password, role } = req.body;
    const inv = await investDb.investor.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: hashPassword(password),
        role: "ADMIN",
      },
    });
    const { passwordHash, ...u } = inv;
    res.json({ user: u });
  })
);

/* ---------------- Deposits: approve/reject (admin or super) ---------------- */
router.get(
  "/deposits",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const deposits = await investDb.deposit.findMany({ where, include: { investor: true }, orderBy: { createdAt: "desc" } });
    const accountIds = [...new Set(deposits.map((d) => d.paymentAccountId).filter(Boolean))];
    const accounts = accountIds.length
      ? await investDb.paymentGateway.findMany({ where: { id: { in: accountIds } } })
      : [];
    const acctMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
    res.json({
      deposits: deposits.map((d) => ({
        ...d,
        paymentAccount: d.paymentAccountId ? acctMap[d.paymentAccountId] || null : null,
      })),
    });
  })
);

router.post(
  "/deposits/:id/approve",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("approve_deposits"),
  asyncH(async (req, res) => {
    const dep = await investDb.deposit.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!dep) return res.status(404).json({ error: "Not found" });
    if (dep.status === "APPROVED") return res.status(400).json({ error: "Already approved" });
    const manual = ["UPI", "IMPS", "NEFT", "RTGS", "BANK"].includes(String(dep.method).toUpperCase());
    if (manual && !dep.proofImage) {
      return res.status(400).json({ error: "Cannot approve manual deposit without payment proof." });
    }
    await investDb.deposit.update({ where: { id: dep.id }, data: { status: "APPROVED", remarks: req.body.remarks || dep.remarks } });
    await addLedger(dep.investorId, { type: "DEPOSIT", direction: "CREDIT", amount: dep.amount, reference: dep.id, note: `Deposit via ${dep.method} approved` });
    if (dep.remarks?.startsWith("__promo__:")) {
      const [, code, bonusStr] = dep.remarks.split(":");
      const promo = await investDb.promoCode.findUnique({ where: { code } });
      const bonus = Number(bonusStr);
      if (promo && bonus > 0) {
        await applyPromoCode(promo.id, dep.investorId, dep.amount, bonus);
        await addLedger(dep.investorId, { type: "BONUS", direction: "CREDIT", amount: bonus, reference: promo.id, note: `Promo ${code} bonus` });
      }
    }
    notifyDepositApproved(dep.investor, { ...dep, status: "APPROVED" });
    res.json({ ok: true });
  })
);

router.post(
  "/deposits/:id/reject",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const dep = await investDb.deposit.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!dep) return res.status(404).json({ error: "Not found" });
    const remarks = req.body.remarks || "Rejected";
    await investDb.deposit.update({ where: { id: req.params.id }, data: { status: "REJECTED", remarks } });
    if (dep.investor) notifyDepositRejected(dep.investor, { ...dep, status: "REJECTED" }, remarks);
    res.json({ ok: true });
  })
);

/* ---------------- KYC: approve/reject ---------------- */
router.get(
  "/kyc",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const kyc = await investDb.kyc.findMany({ where, include: { investor: true }, orderBy: { createdAt: "desc" } });
    res.json({ kyc });
  })
);

router.post(
  "/kyc/:id/decision",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("review_kyc"),
  asyncH(async (req, res) => {
    const { status, remarks } = req.body;
    const existing = await investDb.kyc.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const kyc = await investDb.kyc.update({
      where: { id: req.params.id },
      data: {
        status: status === "APPROVED" ? "APPROVED" : "REJECTED",
        remarks,
        verifiedAt: status === "APPROVED" ? new Date() : null,
      },
    });
    if (existing.investor) notifyKycDecision(existing.investor, kyc);
    res.json({ kyc });
  })
);

/* ---------------- Payouts: release to UPI/bank via gateway ---------------- */
router.post(
  "/payouts/direct",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("approve_withdrawals"),
  asyncH(async (req, res) => {
    const { investorId, amount, mode, remarks } = req.body;
    const inv = await investDb.investor.findUnique({ where: { id: investorId } });
    if (!inv) return res.status(404).json({ error: "Investor not found" });
    const payoutMode = (mode || "UPI").toUpperCase() === "BANK" ? "BANK" : "UPI";
    const destination = payoutMode === "UPI" ? inv.upiId : inv.accountNumber;
    if (!destination) {
      return res.status(400).json({ error: `Investor has no ${payoutMode} payout details on file.` });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: "Invalid amount" });
    const wallet = await investDb.wallet.findUnique({ where: { investorId } });
    if (!wallet || wallet.available < amt) {
      return res.status(400).json({ error: "Insufficient available balance" });
    }
    const payout = await investDb.payout.create({
      data: {
        investorId,
        amount: amt,
        mode: payoutMode,
        destination,
        status: "PENDING",
        remarks: remarks || "Admin-initiated withdrawal",
      },
    });
    await addLedger(investorId, {
      type: "PAYOUT",
      direction: "DEBIT",
      amount: amt,
      reference: payout.id,
      note: "Admin-initiated withdrawal",
    });
    notifyWithdrawalRequested(inv, payout);
    const full = await investDb.payout.findUnique({ where: { id: payout.id }, include: { investor: true } });
    res.json({ payout: full });
  })
);

router.get(
  "/payouts",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const payouts = await investDb.payout.findMany({ where, include: { investor: true }, orderBy: { createdAt: "desc" } });
    res.json({ payouts, gateways: await payoutGatewayStatus() });
  })
);

// Admin/super admin releases the payout to the investor's UPI/bank using a payout gateway.
router.post(
  "/payouts/:id/release",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("approve_withdrawals"),
  asyncH(async (req, res) => {
    const { gateway } = req.body; // RAZORPAYX | CASHFREE
    const payout = await investDb.payout.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!payout) return res.status(404).json({ error: "Not found" });
    if (payout.status === "SUCCESS") return res.status(400).json({ error: "Already paid" });
    const { getSetting } = await import("../services/investSettings.js");
    const defaultGw = (await getSetting("default_payout_gateway")) || "RAZORPAYX";
    await investDb.payout.update({ where: { id: payout.id }, data: { status: "PROCESSING", gateway: gateway || defaultGw } });
    const bankAccount =
      payout.mode === "BANK" && payout.investor
        ? {
            name: payout.investor.name,
            account_number: payout.investor.accountNumber || payout.destination,
            ifsc: payout.investor.ifsc,
          }
        : payout.destination;
    const result = await disburse(gateway || "RAZORPAYX", {
      amount: payout.amount,
      mode: payout.mode,
      destination: payout.mode === "UPI" ? payout.destination : bankAccount,
      reference: payout.id,
    });
    const status = result.ok ? result.status || "SUCCESS" : "FAILED";
    const updated = await investDb.payout.update({
      where: { id: payout.id },
      data: { status, gatewayRef: result.gatewayRef, remarks: result.mock ? "Processed in mock mode" : null },
    });
    if (status === "SUCCESS" && payout.investor) {
      notifyWithdrawalReleased(payout.investor, updated);
      await onMaturityPayoutReleased(updated);
    }
    res.json({ payout: updated, result });
  })
);

router.post(
  "/payouts/:id/reject",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const payout = await investDb.payout.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!payout) return res.status(404).json({ error: "Not found" });
    const remarks = req.body.remarks || "Rejected";
    await investDb.payout.update({ where: { id: payout.id }, data: { status: "FAILED", remarks } });
    await addLedger(payout.investorId, { type: "REFUND", direction: "CREDIT", amount: payout.amount, reference: payout.id, note: "Withdrawal rejected - refunded" });
    if (payout.investor) notifyWithdrawalRejected(payout.investor, { ...payout, status: "FAILED" }, remarks);
    res.json({ ok: true });
  })
);

router.get(
  "/subscriptions",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = String(req.query.status).toUpperCase();
    if (req.query.investorId) where.investorId = String(req.query.investorId);
    const subs = await investDb.subscription.findMany({
      where,
      include: {
        plan: true,
        investor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(req.query.limit) || 200, 500),
    });
    const stats = {
      total: subs.length,
      active: subs.filter((s) => s.status === "ACTIVE").length,
      totalAmount: subs.reduce((n, s) => n + s.amount, 0),
    };
    res.json({ subscriptions: subs, stats });
  })
);

/* ---------------- Manual credit a return (profit) to investor ---------------- */
router.post(
  "/credit-return",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const { investorId, amount, note } = req.body;
    await addLedger(investorId, { type: "RETURN", direction: "CREDIT", amount: Number(amount), note: note || "Monthly return credited" });
    await investDb.wallet.update({ where: { investorId }, data: { earnings: { increment: Number(amount) } } });
    res.json({ ok: true });
  })
);

/* ---------------- Payment gateways status ---------------- */
router.get(
  "/gateways",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json({ collection: await listGateways(), payouts: await payoutGatewayStatus() });
  })
);

router.get(
  "/payment-gateways",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json({ gateways: await listPaymentGateways() });
  })
);

router.post(
  "/payment-gateways",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_gateways"),
  asyncH(async (req, res) => {
    const g = await createPaymentGateway(req.body);
    res.json({ gateway: g });
  })
);

router.patch(
  "/payment-gateways/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_gateways"),
  asyncH(async (req, res) => {
    const g = await updatePaymentGateway(req.params.id, req.body);
    res.json({ gateway: g });
  })
);

router.delete(
  "/payment-gateways/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_gateways"),
  asyncH(async (req, res) => {
    res.json(await deletePaymentGateway(req.params.id));
  })
);

/* ---------------- Dashboard & ledger ---------------- */
router.get(
  "/dashboard",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    res.json(await getAdminDashboard(req.query));
  })
);

router.get(
  "/ledger",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    res.json(await getPlatformLedger({
      type: req.query.type,
      limit: req.query.limit,
      investorId: req.query.investorId,
    }));
  })
);

router.get(
  "/financial-reports",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("treasury"),
  asyncH(async (_req, res) => {
    res.json(await getFinancialReports());
  })
);

/* ---------------- Maturity profit payments ---------------- */
router.get(
  "/maturity-payments/today",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const stats = await getTodayMaturityStats();
    res.json(stats);
  })
);

router.get(
  "/maturity-payments/pending",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const payouts = await getTodayPendingPayments();
    res.json({ payouts });
  })
);

router.get(
  "/maturity-payments/upcoming",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const payouts = await getUpcomingPayments(6);
    res.json({ payouts });
  })
);

router.post(
  "/maturity-payments/:id/approve",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const payout = await approveMaturityPayout(req.params.id, req.body.remarks);
    res.json({ payout });
  })
);

router.post(
  "/maturity-payments/:id/reject",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const payout = await rejectMaturityPayout(req.params.id, req.body.remarks);
    res.json({ payout });
  })
);

/* ---------------- Notifications summary ---------------- */
router.get(
  "/notifications",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const [today, pendingDeposits, pendingKyc, pendingPayouts, openTickets] = await Promise.all([
      getTodayMaturityStats(),
      investDb.deposit.count({ where: { status: "PENDING" } }),
      investDb.kyc.count({ where: { status: "PENDING" } }),
      investDb.payout.count({ where: { status: "PENDING" } }),
      investDb.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);
    res.json({
      count: today.count + pendingDeposits + pendingKyc + pendingPayouts + openTickets,
      maturityToday: today.count,
      pendingDeposits,
      pendingKyc,
      pendingPayouts,
      todayMaturityTotal: today.totalDue,
    });
  })
);

/* ---------------- Site / SMTP / API settings (super admin) ---------------- */
router.get(
  "/settings",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    res.json({ settings: await getAllSettings(false) });
  })
);

router.put(
  "/settings",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const settings = await setSettings(req.body);
    res.json({ settings });
  })
);

router.get(
  "/settings/email-communication",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    res.json(await getEmailCommunicationBundle());
  })
);

router.post(
  "/settings/email-communication",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const config = await saveEmailCommunicationConfig(req.body.config || req.body);
    const bundle = await getEmailCommunicationBundle();
    res.json({ config, ...bundle });
  })
);

router.post(
  "/settings/email-communication/test",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const { purpose, testTo } = req.body;
    if (!testTo?.trim()) return res.status(400).json({ error: "testTo email required" });
    try {
      const result = await sendPurposeTestEmail(purpose || "generic", testTo.trim());
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, message: e.message || "Send failed" });
    }
  })
);

/* ---------------- Stats (legacy) ---------------- */
router.get(
  "/stats",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const [investors, plans, activeSubs, pendingKyc, pendingDeposits, pendingPayouts] = await Promise.all([
      investDb.investor.count({ where: { role: "INVESTOR" } }),
      investDb.plan.count(),
      investDb.subscription.count({ where: { status: "ACTIVE" } }),
      investDb.kyc.count({ where: { status: "PENDING" } }),
      investDb.deposit.count({ where: { status: "PENDING" } }),
      investDb.payout.count({ where: { status: "PENDING" } }),
    ]);
    const invested = await investDb.subscription.aggregate({ _sum: { amount: true }, where: { status: "ACTIVE" } });
    res.json({
      stats: { investors, plans, activeSubs, pendingKyc, pendingDeposits, pendingPayouts, totalInvested: invested._sum.amount || 0 },
    });
  })
);

/* ---------------- Agreements (admin) ---------------- */
router.get(
  "/agreements",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const agreements = await listAllAgreements({ status: req.query.status });
    res.json({ agreements });
  })
);

router.get(
  "/agreement-templates",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json({ templates: await getTemplates(), types: AGREEMENT_TYPES });
  })
);

router.put(
  "/agreement-templates/:type",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const template = await updateTemplate(req.params.type, req.body);
    res.json({ template });
  })
);

router.post(
  "/agreements/generate",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const { investorId, type } = req.body;
    const agreement = await adminGenerateForInvestor(investorId, type, {
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || "",
    });
    res.json({ agreement });
  })
);

router.get(
  "/agreements/:id/view",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const buffer = await getAgreementPdfBuffer(req.params.id, req.user.id, { isAdmin: true });
    const ag = await getAgreementById(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${ag?.agreementUid || "agreement"}.pdf"`);
    res.send(buffer);
  })
);

router.get(
  "/agreements/:id/download",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const buffer = await getAgreementPdfBuffer(req.params.id, req.user.id, { isAdmin: true });
    const ag = await getAgreementById(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${ag?.agreementUid || "agreement"}.pdf"`);
    res.send(buffer);
  })
);

router.get(
  "/agreement-templates/placeholders",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json({ placeholders: AGREEMENT_PLACEHOLDERS });
  })
);

router.get(
  "/agreement-templates/default/:type",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const def = getDefaultTemplate(req.params.type);
    if (!def) return res.status(404).json({ error: "Unknown type" });
    res.json({ template: { type: def.type, title: def.title, content: templateContentToMarkdown(def) } });
  })
);

router.post(
  "/agreement-templates/preview",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const { investorId, type, title, content, subscriptionId } = req.body;
    if (!investorId) return res.status(400).json({ error: "investorId required" });
    const preview = await previewTemplateContent({
      investorId,
      type,
      title,
      content,
      subscriptionId,
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || "",
    });
    res.json(preview);
  })
);

router.get(
  "/agreement-settings",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json(await getAgreementSettings());
  })
);

router.put(
  "/agreement-settings",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    res.json(await updateAgreementSettings(req.body));
  })
);

router.post(
  "/agreements/:id/revoke",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const agreement = await revokeAgreement(req.params.id);
    res.json({ agreement });
  })
);

/* ---------------- Support tickets (admin) ---------------- */
router.get(
  "/tickets",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: req.query.status } : {};
    const tickets = await investDb.supportTicket.findMany({
      where,
      include: { investor: { select: { id: true, name: true, email: true } }, replies: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ tickets });
  })
);

router.post(
  "/tickets/:id/reply",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  asyncH(async (req, res) => {
    const ticket = await investDb.supportTicket.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!ticket) return res.status(404).json({ error: "Not found" });
    const reply = await investDb.ticketReply.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user.id,
        authorName: req.user.name,
        authorRole: req.user.role,
        message: String(req.body.message || "").trim(),
      },
    });
    await investDb.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "IN_PROGRESS", updatedAt: new Date() },
    });
    await notifyInvestor(ticket.investorId, "Support reply", `New reply on: ${ticket.subject}`, { type: "INFO", link: "support" });
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name, action: "TICKET_REPLY", entity: "SupportTicket", entityId: ticket.id });
    res.json({ reply });
  })
);

router.post(
  "/tickets/:id/close",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  asyncH(async (req, res) => {
    const ticket = await investDb.supportTicket.update({
      where: { id: req.params.id },
      data: { status: "CLOSED" },
    });
    res.json({ ticket });
  })
);

/* ---------------- Promo codes (super admin) ---------------- */
router.get(
  "/promo-codes",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    res.json({ promos: await listPromoCodes() });
  })
);

router.post(
  "/promo-codes",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const b = req.body;
    const promo = await investDb.promoCode.create({
      data: {
        code: String(b.code).trim().toUpperCase(),
        description: b.description || null,
        bonusPct: Number(b.bonusPct || 0),
        bonusFlat: Number(b.bonusFlat || 0),
        maxUses: b.maxUses != null ? Number(b.maxUses) : null,
        minAmount: Number(b.minAmount || 0),
        appliesTo: (b.appliesTo || "DEPOSIT").toUpperCase(),
        isActive: b.isActive !== false,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      },
    });
    res.json({ promo });
  })
);

router.patch(
  "/promo-codes/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const data = {};
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (req.body.description !== undefined) data.description = req.body.description;
    const promo = await investDb.promoCode.update({ where: { id: req.params.id }, data });
    res.json({ promo });
  })
);

router.delete(
  "/promo-codes/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    await investDb.promoCode.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

/* ---------------- Broadcast notifications ---------------- */
router.post(
  "/notifications/broadcast",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("broadcast_notifications"),
  asyncH(async (req, res) => {
    const { title, body, type, link } = req.body;
    const result = await broadcastNotification({ title, body, type, link });
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name, action: "BROADCAST", entity: "Notification", meta: { title, count: result.count } });
    res.json(result);
  })
);

/* ---------------- Audit logs ---------------- */
router.get(
  "/audit-logs",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("view_audit"),
  asyncH(async (req, res) => {
    res.json({ logs: await listAuditLogs({ limit: req.query.limit, entity: req.query.entity }) });
  })
);

/* ---------------- Homepage partners CMS ---------------- */
router.get(
  "/partners",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json({ partners: await investDb.sitePartner.findMany({ orderBy: { sortOrder: "asc" } }) });
  })
);

router.post(
  "/partners",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const b = req.body;
    const partner = await investDb.sitePartner.create({
      data: { name: b.name, logoUrl: b.logoUrl || null, website: b.website || null, sortOrder: Number(b.sortOrder || 0), isActive: b.isActive !== false },
    });
    res.json({ partner });
  })
);

router.patch(
  "/partners/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const b = req.body;
    const partner = await investDb.sitePartner.update({
      where: { id: req.params.id },
      data: {
        ...(b.name !== undefined && { name: b.name }),
        ...(b.logoUrl !== undefined && { logoUrl: b.logoUrl }),
        ...(b.website !== undefined && { website: b.website }),
        ...(b.sortOrder !== undefined && { sortOrder: Number(b.sortOrder) }),
        ...(b.isActive !== undefined && { isActive: Boolean(b.isActive) }),
      },
    });
    res.json({ partner });
  })
);

router.delete(
  "/partners/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    await investDb.sitePartner.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

/* ---------------- Referral earnings payout (admin) ---------------- */
router.get(
  "/referral-settings",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    res.json(await getReferralSettings());
  })
);

router.put(
  "/referral-settings",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const settings = await saveReferralSettings(req.body);
    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      action: "REFERRAL_SETTINGS_UPDATE",
      entity: "InvestSetting",
    });
    res.json(settings);
  })
);

router.post(
  "/referral-earnings/pay-all",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const result = await payAllPendingReferrals({
      actor: { actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name },
      minAmount: req.body?.minAmount,
    });
    res.json(result);
  })
);

router.post(
  "/referral-earnings/:id/pay",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    try {
      await payReferralEarningById(req.params.id, {
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
      });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message || "Invalid earning" });
    }
  })
);

router.get(
  "/referral-earnings",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const earnings = await investDb.referralEarning.findMany({
      include: { referrer: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ earnings });
  })
);

router.get(
  "/referral-analytics",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const [clicks, registrations, recent] = await Promise.all([
      investDb.auditLog.count({ where: { action: "REFERRAL_CLICK" } }),
      investDb.auditLog.count({ where: { action: "REFERRAL_REGISTER" } }),
      investDb.auditLog.findMany({
        where: { action: { startsWith: "REFERRAL_" } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);
    const conversionRate = clicks > 0 ? Math.round((registrations / clicks) * 1000) / 10 : 0;
    res.json({ clicks, registrations, conversionRate, recent });
  })
);

/* ---------------- Treasury & reconciliation ---------------- */
router.get(
  "/treasury",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("treasury"),
  asyncH(async (_req, res) => {
    const { getTreasurySnapshot } = await import("../services/treasury.js");
    res.json(await getTreasurySnapshot());
  })
);

router.post(
  "/treasury/reconcile",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("treasury"),
  asyncH(async (req, res) => {
    const { runReconciliation } = await import("../services/treasury.js");
    const result = await runReconciliation();
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name, action: "TREASURY_RECONCILE", entity: "TreasurySnapshot", entityId: result.snapshot.id });
    res.json(result);
  })
);

/* ---------------- Cohort analytics ---------------- */
router.get(
  "/analytics/cohorts",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("analytics"),
  asyncH(async (req, res) => {
    const { getCohortAnalytics } = await import("../services/cohortAnalytics.js");
    res.json(await getCohortAnalytics(Number(req.query.months) || 12));
  })
);

/* ---------------- RBAC ---------------- */
router.get(
  "/rbac",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (_req, res) => {
    const { getRoleMatrix } = await import("../services/rbac.js");
    res.json(await getRoleMatrix());
  })
);

router.put(
  "/rbac",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { setPermission } = await import("../services/rbac.js");
    const { role, permission, granted } = req.body;
    await setPermission(role, permission, Boolean(granted));
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name, action: "RBAC_UPDATE", entity: "RolePermission", meta: JSON.stringify({ role, permission, granted }) });
    res.json({ ok: true });
  })
);

/* ---------------- Support mail desk ---------------- */
router.get(
  "/support-mail",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  asyncH(async (_req, res) => {
    const { listMailMessages } = await import("../services/supportMail.js");
    res.json({ messages: await listMailMessages() });
  })
);

router.post(
  "/support-mail/sync",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  asyncH(async (_req, res) => {
    const { syncSupportInbox } = await import("../services/supportMail.js");
    res.json(await syncSupportInbox());
  })
);

router.post(
  "/support-mail/:id/reply",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  asyncH(async (req, res) => {
    const { replySupportMail } = await import("../services/supportMail.js");
    res.json(await replySupportMail(req.params.id, req.body));
  })
);

router.post(
  "/support-mail/compose",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("support_tickets"),
  (req, res, next) => {
    import("../utils/upload.js").then(({ upload }) => upload.array("attachments", 5)(req, res, next));
  },
  asyncH(async (req, res) => {
    const { composeSupportMail } = await import("../services/supportMail.js");
    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      path: f.path,
    }));
    const { to, subject, body } = req.body;
    res.json(await composeSupportMail({ to, subject, body, attachments }));
  })
);

router.get(
  "/investors/not-invested",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (_req, res) => {
    const { listNotInvestedInvestors } = await import("../services/investorNurture.js");
    res.json({ investors: await listNotInvestedInvestors() });
  })
);

router.post(
  "/investors/not-invested/email",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const { sendNotInvestedEmail } = await import("../services/investorNurture.js");
    res.json(await sendNotInvestedEmail({ ...req.body, actor: req.user }));
  })
);

router.get(
  "/payouts/pending-today",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("approve_withdrawals"),
  asyncH(async (_req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const payouts = await investDb.payout.findMany({
      where: {
        status: { in: ["PENDING", "SCHEDULED"] },
        createdAt: { gte: start, lte: end },
      },
      include: { investor: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ payouts });
  })
);

/* ---------------- Manual ROI run ---------------- */
router.post(
  "/roi/run",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { runRoiEngineCycle } = await import("../services/roiEngine.js");
    res.json(await runRoiEngineCycle());
  })
);

export default router;
