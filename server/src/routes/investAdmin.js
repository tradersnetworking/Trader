import { Router } from "express";
import { registerPlatformDeployRoutes } from "./platformDeployRoutes.js";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { asyncH, authRequired, requireRole, requirePermission, requireAnyPermission } from "../middleware.js";
import { hashPassword } from "../utils/auth.js";
import { revokeAuthSession } from "../services/authSession.js";
import { sendMail } from "../utils/mailer.js";
import {
  annualRoiPct,
  PLAN_TYPES,
  PLAN_CAPITAL,
  lockInDaysFromMonths,
  normalizePlanRoi,
  monthlyRoiForLockInMonths,
  normalizeSettlementCycleId,
  SETTLEMENT_CYCLE_OPTIONS,
} from "../utils/invest.js";
import { listInvestPlans } from "../services/investPlans.js";
import { disburse, payoutGatewayStatus } from "../payments/payouts.js";
import { listGateways } from "../payments/gateways.js";
import { buildAdminVisibilityView, savePaymentModeVisibility } from "../services/paymentModeVisibility.js";
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
import { filterGatewaySettingsPayload, pickGatewaySettings } from "../data/gatewaySettingKeys.js";
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
  adminResetKyc,
  adminUpsertInvestorKyc,
  ADMIN_KYC_FILE_FIELDS,
  adminCancelSubscription,
} from "../services/adminInvestorOps.js";
import {
  payReferralEarningById,
  payAllPendingReferrals,
} from "../services/referralPayoutJob.js";
import {
  getKycDraft,
  saveKycDraft,
  stageKycFileUpload,
  deleteStagedKycUpload,
} from "../services/kycDocumentUploads.js";
import { kycSingleUpload } from "../utils/upload.js";
import { kycUploadRateLimit } from "../middleware/rateLimit.js";
import { isAllowedKycUploadField } from "../constants/kycUploadFields.js";
import {
  getEmailCommunicationBundle,
  saveEmailCommunicationConfig,
  sendPurposeTestEmail,
} from "../services/emailCommunication.js";
import {
  getMailboxBundle,
  saveMailboxConfig,
  testMailboxSmtp,
  testMailboxImap,
} from "../services/mailboxConfig.js";
import {
  getAdditionalDomainsConfig,
  addAdditionalDomain,
  updateAdditionalDomain,
  deleteAdditionalDomain,
  normalizeHostname,
} from "../services/additionalDomains.js";
import {
  getInvestEmailRoutingInfo,
  setInvestEmailRouting,
  applyAdditionalDomainToMailboxes,
  revertInvestMailboxesToSubdomain,
} from "../services/investEmailRouting.js";
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
import {
  getAgreementCompanySettings,
  setAgreementCompanySettings,
} from "../services/agreementCompanySettings.js";

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
    res.json({
      plans: await listInvestPlans({ activeOnly: false }),
      planTypes: PLAN_TYPES_LIST,
      planCapital: PLAN_CAPITAL,
      lockInMonthsOptions: Array.from({ length: 60 }, (_, i) => i + 1),
      settlementCycleOptions: SETTLEMENT_CYCLE_OPTIONS,
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
    const monthlyRoiPct = Number(
      b.monthlyRoiPct ?? b.profitSharePct ?? monthlyRoiForLockInMonths(lockInMonths)
    );
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
        settlementCycles: normalizeSettlementCycleId(b.settlementCycles ?? "MONTHLY"),
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
    if (b.monthlyRoiPct !== undefined) {
      data.monthlyRoiPct = Number(b.monthlyRoiPct);
      data.profitSharePct = Number(b.profitSharePct ?? b.monthlyRoiPct);
      data.annualRoiPct = annualRoiPct(Number(b.monthlyRoiPct));
    }
    if (b.name !== undefined) data.name = b.name;
    if (b.minInvestment !== undefined && b.planType) { /* capital fixed by category */ }
    if (b.maxInvestment !== undefined && b.planType) { /* capital fixed by category */ }
    if (b.settlementCycles !== undefined) {
      data.settlementCycles = normalizeSettlementCycleId(b.settlementCycles);
    }
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
    const { listInvestorsForAdmin } = await import("../services/investorAdminList.js");
    const investors = await listInvestorsForAdmin();
    const roleInvestors = investors.filter((i) => i.role === "INVESTOR");
    res.json({
      investors: roleInvestors,
      allAccounts: investors,
      summary: {
        total: investors.length,
        investors: roleInvestors.length,
        google: roleInvestors.filter((i) => i.authMethod === "google" || i.authMethod === "google_and_password").length,
        password: roleInvestors.filter((i) => i.authMethod === "password" || i.authMethod === "google_and_password").length,
        staff: investors.filter((i) => i.role !== "INVESTOR").length,
      },
    });
  })
);

const RESERVED_INVESTOR_IDS = new Set(["not-invested", "kyc-pending", "create-full", "lists"]);

async function serveNotInvestedList(_req, res) {
  try {
    const { listNotInvestedInvestors } = await import("../services/investorNurture.js");
    res.json({ investors: await listNotInvestedInvestors() });
  } catch (e) {
    console.error("[admin/investors/not-invested]", e);
    res.status(500).json({ error: e.message || "Could not load not-invested list" });
  }
}

async function serveKycPendingList(_req, res) {
  try {
    const { listKycPendingInvestors } = await import("../services/investorNurture.js");
    res.json({ investors: await listKycPendingInvestors() });
  } catch (e) {
    console.error("[admin/investors/kyc-pending]", e);
    res.status(500).json({ error: e.message || "Could not load KYC pending list" });
  }
}

router.get("/investors/lists/not-invested", authRequired(SCOPE), adminOnly, asyncH(serveNotInvestedList));
router.get("/investors/not-invested", authRequired(SCOPE), adminOnly, asyncH(serveNotInvestedList));

router.post(
  "/investors/lists/not-invested/notify",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const { sendNotInvestedNurture } = await import("../services/investorNurture.js");
    try {
      res.json(await sendNotInvestedNurture(req.body));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/investors/not-invested/notify",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const { sendNotInvestedNurture } = await import("../services/investorNurture.js");
    try {
      res.json(await sendNotInvestedNurture(req.body));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
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

router.get("/investors/lists/kyc-pending", authRequired(SCOPE), adminOnly, asyncH(serveKycPendingList));
router.get("/investors/kyc-pending", authRequired(SCOPE), adminOnly, asyncH(serveKycPendingList));

router.post(
  "/investors/lists/kyc-pending/notify",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const { sendKycPendingNurture } = await import("../services/investorNurture.js");
    try {
      res.json(await sendKycPendingNurture(req.body));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/investors/kyc-pending/notify",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const { sendKycPendingNurture } = await import("../services/investorNurture.js");
    try {
      res.json(await sendKycPendingNurture(req.body));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.get(
  "/investors/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    if (RESERVED_INVESTOR_IDS.has(req.params.id)) {
      return res.status(400).json({
        error: `Use GET /admin/investors/lists/${req.params.id === "kyc-pending" ? "kyc-pending" : "not-invested"} instead.`,
      });
    }
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
    let agreements = [];
    let loginSessions = [];
    try {
      const { listAllAgreementsForInvestor } = await import("../services/agreements.js");
      agreements = await listAllAgreementsForInvestor(req.params.id);
    } catch (e) {
      console.error("[admin/investors/:id] agreements", e.message);
    }
    try {
      const { listInvestorLoginSessions } = await import("../services/loginSession.js");
      loginSessions = await listInvestorLoginSessions(req.params.id);
    } catch (e) {
      console.error("[admin/investors/:id] loginSessions", e.message);
    }
    res.json({ investor: { ...user, agreements, loginSessions } });
  })
);

router.post(
  "/investors/:id/reset-password",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    if (req.user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Only Super Admin can reset user passwords" });
    }
    const inv = await investDb.investor.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: "Not found" });
    if (inv.role !== "INVESTOR") return res.status(403).json({ error: "Can only reset investor passwords" });

    const { password, sendResetLink } = req.body;
    if (sendResetLink) {
      const token = nanoid(40);
      await investDb.investor.update({
        where: { id: inv.id },
        data: { resetToken: token, resetExpires: new Date(Date.now() + 1000 * 60 * 60) },
      });
      const link = `${process.env.CLIENT_ORIGIN || ""}/invest/reset-password?token=${token}`;
      await sendMail({
        to: inv.email,
        purpose: "password_reset",
        subject: "Reset your AKSHYA INVESTMENTS password",
        text: `An administrator requested a password reset. Link (valid 1 hour): ${link}`,
      });
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
        action: "INVESTOR_PASSWORD_RESET_LINK",
        entity: "Investor",
        entityId: inv.id,
      });
      return res.json({ ok: true, message: "Password reset link emailed to investor." });
    }

    const newPassword = String(password || "").trim();
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    await investDb.investor.update({
      where: { id: inv.id },
      data: { passwordHash: hashPassword(newPassword), resetToken: null, resetExpires: null },
    });
    await revokeAuthSession(SCOPE, inv.id);
    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      action: "INVESTOR_PASSWORD_RESET",
      entity: "Investor",
      entityId: inv.id,
    });
    res.json({ ok: true, message: "Password updated. User must sign in again on one device." });
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
    if (req.body.isActive !== undefined) {
      if (req.user.role !== "SUPERADMIN") {
        return res.status(403).json({ error: "Only Super Admin can block or unblock users" });
      }
      if (inv.role !== "INVESTOR") {
        return res.status(403).json({ error: "Can only block or unblock investor accounts" });
      }
      data.isActive = Boolean(req.body.isActive);
    }
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

router.get(
  "/investors/:id/kyc/draft",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.params.id } });
    if (!inv || inv.role !== "INVESTOR") return res.status(404).json({ error: "Investor not found" });
    res.json(await getKycDraft(req.params.id));
  })
);

router.put(
  "/investors/:id/kyc/draft",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.params.id } });
    if (!inv || inv.role !== "INVESTOR") return res.status(404).json({ error: "Investor not found" });
    const { step, form } = req.body || {};
    res.json(await saveKycDraft(req.params.id, { step, form }));
  })
);

router.post(
  "/investors/:id/kyc/files/:fieldKey",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  kycUploadRateLimit,
  (req, res, next) => {
    kycSingleUpload(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.params.id } });
    if (!inv || inv.role !== "INVESTOR") return res.status(404).json({ error: "Investor not found" });
    const fieldKey = String(req.params.fieldKey || "");
    if (!isAllowedKycUploadField(fieldKey)) {
      return res.status(400).json({ error: "Invalid document type.", code: "INVALID_FIELD" });
    }
    const result = await stageKycFileUpload(req.params.id, fieldKey, req.file);
    if (!result.ok) return res.status(result.status || 400).json({ error: result.error, code: result.code });
    res.json(result);
  })
);

router.delete(
  "/investors/:id/kyc/files/:fieldKey",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    const fieldKey = String(req.params.fieldKey || "");
    const result = await deleteStagedKycUpload(req.params.id, fieldKey);
    if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
    res.json({ ok: true });
  })
);

router.post(
  "/investors/:id/kyc",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  (req, res, next) => {
    import("../utils/upload.js").then(({ upload }) =>
      upload.fields(ADMIN_KYC_FILE_FIELDS.map((name) => ({ name })))(req, res, next)
    );
  },
  asyncH(async (req, res) => {
    try {
      const investor = await adminUpsertInvestorKyc(req.params.id, req.body, req.files || {}, req.user);
      res.json({ investor, message: "KYC and documents saved." });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.delete(
  "/investors/:id/kyc",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const result = await adminResetKyc(req.params.id, req.user);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/subscriptions/:id/cancel",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_investors"),
  asyncH(async (req, res) => {
    try {
      const subscription = await adminCancelSubscription(req.params.id, req.user, {
        reason: req.body?.reason,
        refundPrincipal: req.body?.refundPrincipal !== false,
      });
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
  requirePermission("manage_settings"),
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
  requirePermission("manage_settings"),
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
    const methodUp = String(dep.method).toUpperCase();
    const manual = ["UPI", "IMPS", "NEFT", "RTGS", "BANK", "CRYPTO"].includes(methodUp);
    if (manual && !dep.proofImage) {
      return res.status(400).json({ error: "Cannot approve manual deposit without payment proof." });
    }
    const creditInr = dep.inrEquivalent != null && dep.inrEquivalent > 0 ? dep.inrEquivalent : dep.amount;
    const claimed = await investDb.deposit.updateMany({
      where: { id: dep.id, status: "PENDING" },
      data: { status: "APPROVED", remarks: req.body.remarks || dep.remarks },
    });
    if (claimed.count !== 1) return res.status(409).json({ error: "Deposit already processed" });
    const note =
      methodUp === "CRYPTO" && dep.cryptoAmount
        ? `Crypto deposit ${dep.cryptoAmount} ${dep.cryptoSymbol || ""} (${dep.cryptoNetwork || ""}) → ₹${creditInr} approved`
        : `Deposit via ${dep.method} approved`;
    await addLedger(dep.investorId, { type: "DEPOSIT", direction: "CREDIT", amount: creditInr, reference: dep.id, note });
    const { creditPlatformCommissionOnDeposit } = await import("../services/platformCommission.js");
    await creditPlatformCommissionOnDeposit(dep.investorId, creditInr, dep.id).catch(() => {});
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
  requirePermission("approve_deposits"),
  asyncH(async (req, res) => {
    const dep = await investDb.deposit.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!dep) return res.status(404).json({ error: "Not found" });
    const remarks = req.body.remarks || "Rejected";
    const claimed = await investDb.deposit.updateMany({
      where: { id: dep.id, status: "PENDING" },
      data: { status: "REJECTED", remarks },
    });
    if (claimed.count !== 1) return res.status(409).json({ error: "Deposit already processed" });
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
    const rows = await investDb.kyc.findMany({ where, include: { investor: true }, orderBy: { createdAt: "desc" } });
    const { attachSectionReviews, isKycRecordFullySubmitted } = await import("../services/kycSections.js");
    const kyc = rows
      .filter((r) => r.status !== "PENDING" || isKycRecordFullySubmitted(r))
      .map(attachSectionReviews);
    res.json({ kyc });
  })
);

router.post(
  "/kyc/:id/section",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("review_kyc"),
  asyncH(async (req, res) => {
    const { section, status, remarks } = req.body;
    const {
      KYC_SECTIONS,
      parseSectionReviews,
      serializeSectionReviews,
      setSectionDecision,
      deriveKycStatusAfterSectionReview,
      attachSectionReviews,
      initSectionReviewsPending,
    } = await import("../services/kycSections.js");
    if (!KYC_SECTIONS.includes(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
    }
    if (status === "REJECTED" && !String(remarks || "").trim()) {
      return res.status(400).json({ error: "Rejection reason is required for this section" });
    }
    const existing = await investDb.kyc.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!["PENDING", "REJECTED"].includes(existing.status)) {
      return res.status(400).json({ error: "KYC is not open for section review" });
    }
    const { assertInvestorKycSubmitReady } = await import("../services/kycSections.js");
    const incomplete = assertInvestorKycSubmitReady(existing, {}, existing);
    if (incomplete) {
      return res.status(400).json({
        error: "Investor has not completed full KYC submission. Cannot review until all sections and documents are present.",
      });
    }
    let reviews = parseSectionReviews(existing) || initSectionReviewsPending();
    reviews = setSectionDecision(reviews, section, status, remarks);
    const nextStatus = deriveKycStatusAfterSectionReview(reviews);
    const kyc = await investDb.kyc.update({
      where: { id: existing.id },
      data: {
        sectionReviews: serializeSectionReviews(reviews),
        status: nextStatus,
        remarks: nextStatus === "REJECTED" ? String(remarks || "").trim() : existing.remarks,
        verifiedAt: null,
      },
    });
    if (existing.investor && status === "REJECTED") {
      const { notifyKycDecision } = await import("../services/investNotifications.js");
      await notifyKycDecision(existing.investor, { ...kyc, status: "REJECTED", remarks });
    }
    res.json({ kyc: attachSectionReviews(kyc) });
  })
);

router.post(
  "/kyc/:id/final",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("review_kyc"),
  asyncH(async (req, res) => {
    const { status, remarks } = req.body;
    const { allSectionsApproved, attachSectionReviews } = await import("../services/kycSections.js");
    const existing = await investDb.kyc.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status === "APPROVED") return res.status(400).json({ error: "Already approved" });
    const { isKycRecordFullySubmitted, assertInvestorKycSubmitReady } = await import("../services/kycSections.js");
    if (!isKycRecordFullySubmitted(existing)) {
      return res.status(400).json({
        error: "Investor has not completed full KYC. Cannot final-review until submission is complete.",
      });
    }
    if (status === "APPROVED") {
      if (!allSectionsApproved(existing)) {
        return res.status(400).json({
          error: "Approve or reject each section first. All four sections must be approved before final approval.",
        });
      }
      const { assertKycHasSignature } = await import("../services/kycSignature.js");
      const sigOk = assertKycHasSignature(existing);
      if (!sigOk.ok) return res.status(400).json({ error: sigOk.message });
    } else if (!String(remarks || "").trim()) {
      return res.status(400).json({ error: "Final rejection reason is required" });
    }
    const kyc = await investDb.kyc.update({
      where: { id: existing.id },
      data: {
        status: status === "APPROVED" ? "APPROVED" : "REJECTED",
        remarks: remarks || null,
        verifiedAt: status === "APPROVED" ? new Date() : null,
      },
    });
    if (status === "APPROVED" && existing.investorId) {
      const { syncApprovedPayoutFromKyc } = await import("../services/investProfileApprovals.js");
      await syncApprovedPayoutFromKyc(existing.investorId, kyc);
      const { autoGenerateAndSignInvestorAgreements } = await import("../services/agreements.js");
      await autoGenerateAndSignInvestorAgreements(existing.investorId, {
        ipAddress: "kyc-approval",
        userAgent: "admin-kyc",
        triggerEvent: "kyc_approved",
      }).catch(() => {});
    }
    if (existing.investor) {
      const { notifyKycDecision } = await import("../services/investNotifications.js");
      await notifyKycDecision(existing.investor, kyc);
    }
    res.json({ kyc: attachSectionReviews(kyc) });
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
    if (status === "APPROVED") {
      const { assertKycHasSignature } = await import("../services/kycSignature.js");
      const sigOk = assertKycHasSignature(existing);
      if (!sigOk.ok) return res.status(400).json({ error: sigOk.message });
    }
    const kyc = await investDb.kyc.update({
      where: { id: req.params.id },
      data: {
        status: status === "APPROVED" ? "APPROVED" : "REJECTED",
        remarks,
        verifiedAt: status === "APPROVED" ? new Date() : null,
      },
    });
    if (status === "APPROVED" && existing.investorId) {
      const { syncApprovedPayoutFromKyc } = await import("../services/investProfileApprovals.js");
      await syncApprovedPayoutFromKyc(existing.investorId, kyc);
      const { autoGenerateAndSignInvestorAgreements } = await import("../services/agreements.js");
      await autoGenerateAndSignInvestorAgreements(existing.investorId, {
        ipAddress: "kyc-approval",
        userAgent: "admin-kyc",
        triggerEvent: "kyc_approved",
      }).catch(() => {});
    }
    if (existing.investor) notifyKycDecision(existing.investor, kyc);
    res.json({ kyc });
  })
);

router.get(
  "/payout-changes",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const changes = await investDb.payoutDetailsChange.findMany({
      where,
      include: { investor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ changes });
  })
);

router.post(
  "/payout-changes/:id/decision",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("review_kyc"),
  asyncH(async (req, res) => {
    const { status, remarks } = req.body;
    const change = await investDb.payoutDetailsChange.findUnique({
      where: { id: req.params.id },
      include: { investor: true },
    });
    if (!change) return res.status(404).json({ error: "Not found" });
    if (change.status !== "PENDING") return res.status(400).json({ error: "Already reviewed" });
    const updated = await investDb.payoutDetailsChange.update({
      where: { id: change.id },
      data: {
        status: status === "APPROVED" ? "APPROVED" : "REJECTED",
        remarks: remarks || null,
        reviewedAt: new Date(),
      },
    });
    if (status === "APPROVED") {
      const { applyPayoutChange } = await import("../services/investProfileApprovals.js");
      await applyPayoutChange(updated);
    }
    res.json({ change: updated });
  })
);

router.get(
  "/kyc-revisions",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const revisions = await investDb.kycRevision.findMany({
      where,
      include: { investor: { select: { id: true, name: true, email: true } }, kyc: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ revisions });
  })
);

router.post(
  "/kyc-revisions/:id/decision",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("review_kyc"),
  asyncH(async (req, res) => {
    const { status, remarks } = req.body;
    const revision = await investDb.kycRevision.findUnique({
      where: { id: req.params.id },
      include: { investor: true, kyc: true },
    });
    if (!revision) return res.status(404).json({ error: "Not found" });
    if (revision.status !== "PENDING") return res.status(400).json({ error: "Already reviewed" });
    const updated = await investDb.kycRevision.update({
      where: { id: revision.id },
      data: {
        status: status === "APPROVED" ? "APPROVED" : "REJECTED",
        remarks: remarks || null,
        reviewedAt: new Date(),
      },
    });
    if (status === "APPROVED") {
      const { applyKycRevision } = await import("../services/investProfileApprovals.js");
      await applyKycRevision(updated);
    } else if (revision.investor) {
      const { notifyKycDecision } = await import("../services/investNotifications.js");
      await notifyKycDecision(revision.investor, { ...revision.kyc, status: "APPROVED", remarks });
    }
    res.json({ revision: updated });
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
    const { claimPayoutForRelease } = await import("../services/payoutAtomic.js");
    let payout;
    try {
      payout = await claimPayoutForRelease(req.params.id);
    } catch (e) {
      if (e.status === 409) return res.status(409).json({ error: e.message });
      throw e;
    }
    if (!payout) return res.status(404).json({ error: "Not found" });
    const { getSetting } = await import("../services/investSettings.js");
    const defaultGw = (await getSetting("default_payout_gateway")) || "RAZORPAYX";
    await investDb.payout.update({ where: { id: payout.id }, data: { gateway: gateway || defaultGw } });
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
  requirePermission("approve_withdrawals"),
  asyncH(async (req, res) => {
    const payout = await investDb.payout.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!payout) return res.status(404).json({ error: "Not found" });
    const remarks = req.body.remarks || "Rejected";
    const { claimPayoutForReject } = await import("../services/payoutAtomic.js");
    const claimed = await claimPayoutForReject(payout.id, remarks);
    if (!claimed) return res.status(409).json({ error: "Payout already finalized — cannot reject again" });
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
    const collection = await listGateways();
    const payouts = await payoutGatewayStatus();
    const { buildAdminVisibilityView } = await import("../services/paymentModeVisibility.js");
    const view = await buildAdminVisibilityView(collection, payouts);
    res.json({ collection, payouts, visibility: view.modes });
  })
);

router.put(
  "/payment-mode-visibility",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_gateways"),
  asyncH(async (req, res) => {
    const { modes } = req.body;
    if (!modes || typeof modes !== "object") {
      return res.status(400).json({ error: "modes object required" });
    }
    await savePaymentModeVisibility(modes);
    const collection = await listGateways();
    const payouts = await payoutGatewayStatus();
    const view = await buildAdminVisibilityView(collection, payouts);
    res.json({ ok: true, modes: view.modes, message: "Payment mode visibility updated." });
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
    const g = await updatePaymentGateway(req.params.id, {
      ...req.body,
      showDeposit: req.body.showDeposit,
      showWithdraw: req.body.showWithdraw,
    });
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
  requirePermission("approve_withdrawals"),
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
  "/settings/gateways",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    const all = await getAllSettings(false);
    res.json({ settings: pickGatewaySettings(all) });
  })
);

router.put(
  "/settings/gateways",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    const filtered = filterGatewaySettingsPayload(req.body);
    if (!Object.keys(filtered).length) {
      const all = await getAllSettings(false);
      return res.json({
        ok: true,
        saved: [],
        message: "No changes to save. Enter a gateway key or ID (secrets left blank are unchanged).",
        settings: pickGatewaySettings(all),
      });
    }
    const all = await setSettings(filtered);
    res.json({
      ok: true,
      saved: Object.keys(filtered),
      message: "Gateway settings saved successfully.",
      settings: pickGatewaySettings(all),
    });
  })
);

router.post(
  "/settings/telegram-test",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    const { testTelegramAlert } = await import("../services/telegramTransactionAlerts.js");
    const result = await testTelegramAlert();
    res.json(result);
  })
);

router.get(
  "/whatsapp-business",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    const { getWhatsAppSettings } = await import("../services/whatsappBusiness.js");
    res.json({ settings: await getWhatsAppSettings(false) });
  })
);

router.put(
  "/whatsapp-business",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const { saveWhatsAppSettings } = await import("../services/whatsappBusiness.js");
    const settings = await saveWhatsAppSettings(req.body.settings || req.body, { includeSecrets: false });
    res.json({ settings });
  })
);

router.post(
  "/whatsapp-business/test",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const { testWhatsAppConnection } = await import("../services/whatsappBusiness.js");
    const phone = req.body.testPhone || req.body.phone;
    if (!phone) return res.status(400).json({ error: "testPhone required (digits with country code)" });
    const result = await testWhatsAppConnection(phone);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  })
);

router.get(
  "/settings/email-communication",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    const [email, mailboxes] = await Promise.all([
      getEmailCommunicationBundle("invest"),
      getMailboxBundle("invest"),
    ]);
    res.json({ ...email, mailboxes });
  })
);

router.post(
  "/settings/email-communication",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const config = await saveEmailCommunicationConfig(req.body.config || req.body, "invest");
    const bundle = await getEmailCommunicationBundle("invest");
    res.json({ config, ...bundle });
  })
);

router.get(
  "/settings/mailboxes",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    res.json(await getMailboxBundle("invest"));
  })
);

router.put(
  "/settings/mailboxes",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const config = await saveMailboxConfig("invest", req.body.config || req.body);
    res.json(await getMailboxBundle("invest"));
  })
);

router.post(
  "/settings/mailboxes/provision",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const { provisionPortalMailboxes } = await import("../services/mailboxProvisioning.js");
    const force = req.body?.force === true;
    const result = await provisionPortalMailboxes("invest", { force, forcePassword: true });
    res.json(result);
  })
);

router.post(
  "/settings/mailboxes/test",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const { mailboxId, type } = req.body;
    if (!mailboxId) return res.status(400).json({ error: "mailboxId required" });
    try {
      const result = type === "imap"
        ? await testMailboxImap("invest", mailboxId)
        : await testMailboxSmtp("invest", mailboxId);
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, message: e.message });
    }
  })
);

router.get(
  "/settings/email-routing",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    res.json(await getInvestEmailRoutingInfo());
  })
);

router.put(
  "/settings/email-routing",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    try {
      const { enabled, domainId } = req.body;
      if (enabled === true) {
        const info = await getInvestEmailRoutingInfo();
        if (!info.canEnableRouting) {
          return res.status(400).json({ error: "Add and enable an additional domain under Site & API Settings first." });
        }
      }
      const routing = await setInvestEmailRouting({ enabled, domainId });
      res.json({ routing });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/settings/mailboxes/apply-additional-domain",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    try {
      const info = await getInvestEmailRoutingInfo();
      const domainInput = req.body?.domain || req.body?.domainId || info.additionalDomainId || info.additionalDomain;
      if (!domainInput) return res.status(400).json({ error: "No enabled additional domain configured" });
      const result = await applyAdditionalDomainToMailboxes(domainInput);
      const cfg = await getAdditionalDomainsConfig();
      const applied = cfg.domains.find((d) => d.enabled && normalizeHostname(d.hostname) === result.domain);
      await setInvestEmailRouting({ enabled: true, domainId: applied?.id || info.additionalDomainId });
      res.json({ ok: true, ...result, routing: await getInvestEmailRoutingInfo() });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/settings/mailboxes/revert-subdomain-email",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (_req, res) => {
    try {
      const result = await revertInvestMailboxesToSubdomain();
      res.json({ ok: true, ...result, routing: await getInvestEmailRoutingInfo() });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.post(
  "/settings/email-communication/test",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    const { purpose, testTo } = req.body;
    if (!testTo?.trim()) return res.status(400).json({ error: "testTo email required" });
    try {
      const result = await sendPurposeTestEmail(purpose || "generic", testTo.trim(), "invest");
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, message: e.message || "Send failed" });
    }
  })
);

router.get(
  "/additional-domains",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    const cfg = await getAdditionalDomainsConfig();
    res.json({ domains: cfg.domains, paymentOrigin: (process.env.PAYMENT_ORIGIN || "https://akshayaexim.com") });
  })
);

router.post(
  "/additional-domains",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    try {
      const entry = await addAdditionalDomain(req.body);
      res.json({ domain: entry, domains: (await getAdditionalDomainsConfig()).domains });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.put(
  "/additional-domains/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    try {
      const routingBefore = await getInvestEmailRoutingInfo();
      const wasRoutingDomain = routingBefore.additionalDomainId === req.params.id;
      const domain = await updateAdditionalDomain(req.params.id, req.body);
      if (routingBefore.routingActive && wasRoutingDomain && req.body.enabled === false) {
        await revertInvestMailboxesToSubdomain();
      }
      res.json({ domain, domains: (await getAdditionalDomainsConfig()).domains });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  })
);

router.delete(
  "/additional-domains/:id",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (req, res) => {
    try {
      const routing = await getInvestEmailRoutingInfo();
      if (routing.additionalDomainId === req.params.id) {
        await revertInvestMailboxesToSubdomain();
      }
      await deleteAdditionalDomain(req.params.id);
      res.json({ ok: true, domains: (await getAdditionalDomainsConfig()).domains });
    } catch (e) {
      res.status(400).json({ error: e.message });
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
  "/agreements/:id/view-url",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const { signAgreementViewToken } = await import("../services/agreementViewToken.js");
    const token = signAgreementViewToken(req.params.id, req.user.id, { isAdmin: true });
    res.json({
      url: `/api/invest/agreement-documents/${req.params.id}?token=${encodeURIComponent(token)}`,
    });
  })
);

router.get(
  "/agreements/:id/view",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    try {
      const buffer = await getAgreementPdfBuffer(req.params.id, req.user.id, { isAdmin: true });
      const ag = await getAgreementById(req.params.id);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", `inline; filename="${ag?.agreementUid || "agreement"}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      return res.status(400).json({ error: err.message || "Could not generate agreement PDF" });
    }
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
    const groups = [...new Set(AGREEMENT_PLACEHOLDERS.map((p) => p.group))];
    res.json({ placeholders: AGREEMENT_PLACEHOLDERS, groups });
  })
);

router.get(
  "/agreement-company-settings",
  authRequired(SCOPE),
  adminOnly,
  requirePermission("manage_settings"),
  asyncH(async (_req, res) => {
    res.json({ settings: await getAgreementCompanySettings() });
  })
);

router.put(
  "/agreement-company-settings",
  authRequired(SCOPE),
  adminOnly,
  superOnly,
  asyncH(async (req, res) => {
    try {
      res.json({ settings: await setAgreementCompanySettings(req.body) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
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
  requirePermission("treasury"),
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
  requirePermission("treasury"),
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
  requireAnyPermission("view_dashboard", "treasury"),
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
  requireAnyPermission("view_dashboard", "treasury"),
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

router.get(
  "/rbac/admins",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (_req, res) => {
    const { listAdminAccounts } = await import("../services/rbac.js");
    res.json({ admins: await listAdminAccounts() });
  })
);

router.get(
  "/rbac/admins/:id",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { getAdminUserPermissions } = await import("../services/rbac.js");
    try {
      res.json(await getAdminUserPermissions(req.params.id));
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message });
    }
  })
);

router.put(
  "/rbac/admins/:id",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const { setAdminUserPermission, clearAdminUserPermissionOverride } = await import("../services/rbac.js");
    const { permission, granted, useRoleDefault } = req.body;
    try {
      let result;
      if (useRoleDefault) {
        result = await clearAdminUserPermissionOverride(req.params.id, permission);
      } else {
        result = await setAdminUserPermission(req.params.id, permission, Boolean(granted));
      }
      await logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        actorName: req.user.name,
        action: "RBAC_ADMIN_USER",
        entity: "Investor",
        entityId: req.params.id,
        meta: JSON.stringify({ permission, granted, useRoleDefault }),
      });
      res.json(result);
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message });
    }
  })
);

router.get(
  "/login-sessions",
  authRequired(SCOPE),
  adminOnly,
  requireAnyPermission("view_dashboard", "manage_investors"),
  asyncH(async (_req, res) => {
    const sessions = await investDb.loginSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { investor: { select: { id: true, name: true, email: true, isActive: true } } },
    });
    res.json({ sessions });
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
  (req, res, next) => {
    import("../utils/upload.js").then(({ upload }) => upload.array("attachments", 5)(req, res, next));
  },
  asyncH(async (req, res) => {
    const { replySupportMail } = await import("../services/supportMail.js");
    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      path: f.path,
    }));
    const { body, subject } = req.body;
    res.json(await replySupportMail(req.params.id, { body, subject, attachments }));
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
  "/payouts/pending-today",
  authRequired(SCOPE),
  adminOnly,
  requireAnyPermission("view_dashboard", "approve_withdrawals"),
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

registerPlatformDeployRoutes(router, { authRequired, asyncH, superOnly, scope: "invest" });

export default router;
