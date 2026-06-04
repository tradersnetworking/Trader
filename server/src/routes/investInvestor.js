import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH, authRequired, requireRole } from "../middleware.js";
import { upload, fileUrl } from "../utils/upload.js";
import { maturityDate, simpleMaturity, compoundedMaturity, monthlyReturn, validateSettlementCycle, MIN_WALLET_DEPOSIT } from "../utils/invest.js";
import { validateDepositAmount, validateWithdrawAmount } from "../utils/paymentLimits.js";
import { createOrder } from "../payments/gateways.js";
import { autoApproveDeposit } from "../services/paymentWebhooks.js";
import { getInvestorDashboard, getWalletHistory } from "../services/investDashboard.js";
import {
  listInvestorAgreements,
  generateAgreement,
  generateSubscriptionAgreement,
  signAgreement,
  getAgreementPdfBuffer,
  AGREEMENT_TYPES,
} from "../services/agreements.js";
import { getAgreementSettings } from "../services/agreementSettings.js";
import { signAgreementViewToken, verifyAgreementViewToken } from "../services/agreementViewToken.js";

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0]?.trim()) || req.socket?.remoteAddress || "";
}
import {
  notifyDepositSubmitted,
  notifyInvestmentActivity,
  notifyWithdrawalRequested,
  notifyKycSubmitted,
} from "../services/investNotifications.js";
import { initiateWithdrawal, confirmWithdrawal } from "../services/withdrawalOtp.js";
import { findPendingKycRevision, hasKycRevisionDelegate } from "../utils/investKycRevision.js";
import { getInvestorMaturityChoices } from "../services/maturityPayments.js";
import { getReferralStats, ensureReferralCode, creditReferralOnInvestment, getReferralLeaderboard } from "../services/referral.js";
import { getCertificatePayload } from "../services/investCertificate.js";
import { getInvestorAchievements } from "../services/achievements.js";
import { previewEarlyExit, processEarlyExit } from "../services/earlyExit.js";
import { validatePromoCode, applyPromoCode } from "../services/promoCodes.js";
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  notifyInvestor,
} from "../services/notifications.js";

const router = Router();
const SCOPE = "invest";
const investorOnly = requireRole("INVESTOR", "ADMIN", "SUPERADMIN");

async function getOrCreateWallet(investorId) {
  let w = await investDb.wallet.findUnique({ where: { investorId } });
  if (!w) w = await investDb.wallet.create({ data: { investorId } });
  return w;
}

// Append a ledger entry and update wallet available balance.
export async function addLedger(investorId, { type, direction, amount, reference, note }) {
  const wallet = await getOrCreateWallet(investorId);
  const delta = direction === "CREDIT" ? Number(amount) : -Number(amount);
  const newAvailable = wallet.available + delta;
  await investDb.wallet.update({ where: { investorId }, data: { available: newAvailable } });
  return investDb.ledgerEntry.create({
    data: { investorId, type, direction, amount: Number(amount), balanceAfter: newAvailable, reference, note },
  });
}

/* -------- dashboard summary -------- */
router.get(
  "/dashboard",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    res.json(await getInvestorDashboard(req.user.id, req.query));
  })
);

/* -------- referral program -------- */
router.get(
  "/referral/stats",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    res.json(await getReferralStats(req.user.id));
  })
);

router.get(
  "/achievements",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    res.json(await getInvestorAchievements(req.user.id));
  })
);

router.get(
  "/referral/leaderboard",
  authRequired(SCOPE),
  asyncH(async (_req, res) => {
    res.json({ leaderboard: await getReferralLeaderboard({ limit: 10 }) });
  })
);

/* -------- maturity payout choice (1 day before) -------- */
router.get(
  "/maturity-choices",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const subs = await getInvestorMaturityChoices(req.user.id);
    res.json({ subscriptions: subs });
  })
);

router.post(
  "/maturity/:subId/choice",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const { choice } = req.body; // WALLET | WITHDRAW | REINVEST
    if (!["WALLET", "WITHDRAW", "REINVEST"].includes(choice)) {
      return res.status(400).json({ error: "Invalid choice" });
    }
    const sub = await investDb.subscription.findFirst({
      where: { id: req.params.subId, investorId: req.user.id, status: "ACTIVE" },
    });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    const updated = await investDb.subscription.update({
      where: { id: sub.id },
      data: { maturityAction: choice, maturityActionAt: new Date() },
    });
    await investDb.maturityPayout.updateMany({
      where: { subscriptionId: sub.id },
      data: { investorChoice: choice },
    });
    res.json({ subscription: updated });
  })
);

router.get(
  "/notifications",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const choices = await getInvestorMaturityChoices(req.user.id);
    res.json({ count: choices.length, maturityChoices: choices.length });
  })
);

/* -------- profile / payout details -------- */
router.put(
  "/profile",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { name, phone, upiId, bankName, accountNumber, ifsc, branchName, cryptoWalletAddress, cryptoSymbol, cryptoNetwork } = req.body;
    const inv = await investDb.investor.update({
      where: { id: req.user.id },
      data: {
        name,
        phone,
        upiId,
        bankName,
        accountNumber,
        ifsc,
        cryptoWalletAddress: cryptoWalletAddress?.trim() || undefined,
        cryptoSymbol: cryptoSymbol ? String(cryptoSymbol).toUpperCase() : undefined,
        cryptoNetwork: cryptoNetwork?.trim() || undefined,
      },
    });
    const kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    if (kyc) {
      await investDb.kyc.update({
        where: { investorId: req.user.id },
        data: {
          upiId: upiId ?? kyc.upiId,
          bankName: bankName ?? kyc.bankName,
          bankAccount: accountNumber ?? kyc.bankAccount,
          ifscCode: ifsc ?? kyc.ifscCode,
          branchName: branchName ?? kyc.branchName,
        },
      });
    }
    const { passwordHash, resetToken, ...u } = inv;
    res.json({ user: u });
  })
);

router.get(
  "/payout-details",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const [investor, kyc, pendingChange] = await Promise.all([
      investDb.investor.findUnique({ where: { id: req.user.id } }),
      investDb.kyc.findUnique({ where: { investorId: req.user.id } }),
      investDb.payoutDetailsChange.findFirst({
        where: { investorId: req.user.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({
      active: {
        upiId: investor?.upiId,
        bankName: investor?.bankName,
        accountNumber: investor?.accountNumber,
        ifsc: investor?.ifsc,
        branchName: kyc?.branchName,
        bankProofType: kyc?.bankProofType,
      },
      kycStatus: kyc?.status,
      pendingChange,
    });
  })
);

router.put(
  "/payout-details",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    if (kyc?.status === "APPROVED") {
      return res.status(400).json({
        error: "Bank/UPI changes require admin approval. Submit a change request with proof of account.",
        code: "REQUIRES_APPROVAL",
      });
    }
    const { upiId, bankName, accountNumber, ifsc, branchName } = req.body;
    const inv = await investDb.investor.update({
      where: { id: req.user.id },
      data: {
        upiId: upiId ?? undefined,
        bankName: bankName ?? undefined,
        accountNumber: accountNumber ?? undefined,
        ifsc: ifsc ?? undefined,
      },
    });
    if (kyc) {
      await investDb.kyc.update({
        where: { investorId: req.user.id },
        data: {
          upiId: upiId ?? kyc.upiId,
          bankName: bankName ?? kyc.bankName,
          bankAccount: accountNumber ?? kyc.bankAccount,
          ifscCode: ifsc ?? kyc.ifscCode,
          branchName: branchName ?? kyc.branchName,
        },
      });
    } else {
      await investDb.kyc.create({
        data: {
          investorId: req.user.id,
          upiId,
          bankName,
          bankAccount: accountNumber,
          ifscCode: ifsc,
          branchName,
          status: "NOT_SUBMITTED",
        },
      });
    }
    const { passwordHash, resetToken, ...u } = inv;
    res.json({ user: u, message: "Payout details saved" });
  })
);

router.post(
  "/payout-details/request",
  authRequired(SCOPE),
  upload.fields([
    { name: "cancelledCheque", maxCount: 1 },
    { name: "passbookDocument", maxCount: 1 },
    { name: "bankStatementDocument", maxCount: 1 },
  ]),
  asyncH(async (req, res) => {
    const kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    if (!kyc || kyc.status !== "APPROVED") {
      return res.status(400).json({ error: "Payout change requests are available after KYC is approved." });
    }
    const existing = await investDb.payoutDetailsChange.findFirst({
      where: { investorId: req.user.id, status: "PENDING" },
    });
    if (existing) {
      return res.status(400).json({ error: "You already have a payout change awaiting team approval." });
    }
    const b = req.body;
    const files = req.files || {};
    const bankProofType = String(b.bankProofType || "CHEQUE").toUpperCase();
    const data = {
      investorId: req.user.id,
      upiId: b.upiId?.trim() || null,
      bankName: b.bankName?.trim() || null,
      bankAccount: b.accountNumber?.trim() || b.bankAccount?.trim() || null,
      ifscCode: b.ifscCode?.trim() || b.ifsc?.trim() || null,
      branchName: b.branchName?.trim() || null,
      bankProofType,
      status: "PENDING",
      remarks: null,
    };
    if (files.cancelledCheque?.[0]) data.cancelledCheque = fileUrl(files.cancelledCheque[0].filename);
    if (files.passbookDocument?.[0]) data.passbookDocument = fileUrl(files.passbookDocument[0].filename);
    if (files.bankStatementDocument?.[0]) data.bankStatementDocument = fileUrl(files.bankStatementDocument[0].filename);
    const proofOk =
      (bankProofType === "CHEQUE" && data.cancelledCheque) ||
      (bankProofType === "PASSBOOK" && data.passbookDocument) ||
      (bankProofType === "STATEMENT" && data.bankStatementDocument);
    if (!data.bankName || !data.bankAccount || !data.ifscCode) {
      return res.status(400).json({ error: "Bank name, account number and IFSC are required." });
    }
    if (!proofOk) {
      return res.status(400).json({ error: "Upload proof for the new bank account (cheque, passbook, or statement)." });
    }
    const change = await investDb.payoutDetailsChange.create({ data });
    res.json({ change, message: "Submitted for team approval. Current payout details remain active until approved." });
  })
);

/* -------- KYC -------- */
router.get(
  "/kyc",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    let kyc;
    try {
      kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    } catch (err) {
      console.error("[kyc] GET findUnique failed:", err?.message || err);
      return res.status(503).json({
        error: "KYC service temporarily unavailable. Run database migration (sectionReviews column) or contact support.",
      });
    }
    const [investor, pendingPayoutChange, pendingKycRevision] = await Promise.all([
      investDb.investor.findUnique({ where: { id: req.user.id } }),
      investDb.payoutDetailsChange
        .findFirst({
          where: { investorId: req.user.id, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null),
      findPendingKycRevision(req.user.id),
    ]);
    const { investEligibility, withdrawEligibility } = await import("../utils/investCompliance.js");
    const { canAccessInvestDashboard, needsKycSetup } = await import("../services/investProfileApprovals.js");
    const { syncApprovedPayoutFromKyc } = await import("../services/investProfileApprovals.js");
    const { ensureSectionReviewsOnRecord } = await import("../services/kycSections.js");
    const { publicInvestor } = await import("../utils/investorUser.js");

    let investorOut = investor;
    if (kyc && kyc.status !== "NOT_SUBMITTED") {
      const sync = {};
      if (kyc.fullName?.trim()) sync.name = kyc.fullName.trim();
      if (kyc.phone) sync.phone = kyc.phone;
      if (kyc.upiId) sync.upiId = kyc.upiId;
      if (kyc.bankName) sync.bankName = kyc.bankName;
      if (kyc.bankAccount) sync.accountNumber = kyc.bankAccount;
      if (kyc.ifscCode) sync.ifsc = kyc.ifscCode;
      if (Object.keys(sync).length) {
        await investDb.investor.update({ where: { id: req.user.id }, data: sync });
      }
    }
    if (kyc?.status === "APPROVED") {
      await syncApprovedPayoutFromKyc(req.user.id, kyc);
    }
    investorOut = await investDb.investor.findUnique({
      where: { id: req.user.id },
      include: {
        kyc: {
          select: {
            status: true,
            photo: true,
            selfie: true,
            fullName: true,
            phone: true,
            phoneCountryCode: true,
            upiId: true,
            bankName: true,
            bankAccount: true,
            ifscCode: true,
          },
        },
      },
    });

    const kycOut = ensureSectionReviewsOnRecord(kyc);
    res.json({
      kyc: kycOut,
      investor: publicInvestor(investorOut),
      pendingPayoutChange,
      pendingKycRevision,
      dashboardAccess: { canAccess: canAccessInvestDashboard(kyc), needsKycSetup: needsKycSetup(kyc) },
      eligibility: investEligibility(investorOut, kyc),
      withdrawEligibility: withdrawEligibility(investorOut, kyc),
    });
  })
);

router.post(
  "/kyc",
  authRequired(SCOPE),
  upload.fields([
    { name: "panDocument" },
    { name: "aadhaarDocument" },
    { name: "aadhaarFront" },
    { name: "aadhaarBack" },
    { name: "photo" },
    { name: "selfie" },
    { name: "addressProof" },
    { name: "signature" },
    { name: "cancelledCheque" },
    { name: "passbookDocument" },
    { name: "bankStatementDocument" },
    { name: "passportDocument" },
    { name: "driversLicenseDocument" },
  ]),
  asyncH(async (req, res) => {
    const b = req.body;
    const files = req.files || {};
    const existing = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    const { validateMulterFile, KYC_DOC_LABELS } = await import("../utils/documentQuality.js");
    const { validateSignatureBase64 } = await import("../utils/signatureQuality.js");
    const { parseKycBody } = await import("../utils/kycFields.js");

    const {
      sectionsRequiredForSubmit,
      validateKycSections,
      mergeApprovedSectionData,
      initSectionReviewsPending,
      resetSectionsForResubmit,
      serializeSectionReviews,
      parseSectionReviews,
      docFieldsForSections,
      attachSectionReviews,
    } = await import("../services/kycSections.js");

    const requiredSections = sectionsRequiredForSubmit(existing);

    const data = mergeApprovedSectionData(
      {
        ...parseKycBody(b, existing),
        idNumber: b.idNumber || b.panNumber || b.aadhaarNumber || null,
        status: "PENDING",
        remarks: null,
      },
      existing
    );

    const fileMap = {
      panDocument: "panDocument",
      aadhaarDocument: "aadhaarDocument",
      aadhaarFront: "aadhaarFront",
      aadhaarBack: "aadhaarBack",
      photo: "photo",
      selfie: "selfie",
      addressProof: "addressProof",
      signature: "signature",
      cancelledCheque: "cancelledCheque",
      passbookDocument: "passbookDocument",
      bankStatementDocument: "bankStatementDocument",
      passportDocument: "passportDocument",
      driversLicenseDocument: "driversLicenseDocument",
    };
    for (const [field, key] of Object.entries(fileMap)) {
      if (files[field]?.[0]) data[key] = fileUrl(files[field][0].filename);
      else if (existing?.[key]) data[key] = existing[key];
    }

    const docCheckFields = new Set(docFieldsForSections(requiredSections));
    const docChecks = await Promise.all(
      [...docCheckFields].map(async (field) => {
        const upload = files[field]?.[0];
        if (!upload) return null;
        const check = await validateMulterFile(upload, KYC_DOC_LABELS[field] || field);
        return check.ok ? null : check;
      })
    );
    const docFail = docChecks.find(Boolean);
    if (docFail) return res.status(400).json({ error: docFail.message, code: docFail.code });

    const signatureData = b.signatureData?.trim() || existing?.signatureData || null;
    const signatureMethod = b.signatureMethod || (files.signature?.[0] ? "upload" : signatureData ? "draw" : existing?.signatureMethod);
    if (b.signatureData && requiredSections.includes("signature")) {
      const sigCheck = validateSignatureBase64(b.signatureData);
      if (!sigCheck.ok) return res.status(400).json({ error: sigCheck.message, code: "SIGNATURE_UNCLEAR" });
      data.signatureData = b.signatureData;
      data.signatureMethod = "draw";
    } else if (existing?.signatureData) {
      data.signatureData = existing.signatureData;
      data.signatureMethod = existing.signatureMethod || "draw";
    }
    if (signatureMethod) data.signatureMethod = signatureMethod;

    const { processSignatureForAgreement, processSignatureDataUrlForAgreement } = await import(
      "../services/signatureProcess.js"
    );
    if (files.signature?.[0]?.path) {
      data.signatureForAgreement = await processSignatureForAgreement(files.signature[0].path);
    } else if (b.signatureData && requiredSections.includes("signature")) {
      data.signatureForAgreement = await processSignatureDataUrlForAgreement(b.signatureData);
    } else if (existing?.signatureForAgreement) {
      data.signatureForAgreement = existing.signatureForAgreement;
    }

    data.panNumber = data.panNumber ? String(data.panNumber).trim().toUpperCase() : "";
    data.aadhaarNumber = data.aadhaarNumber ? String(data.aadhaarNumber).replace(/\s/g, "") : "";

    const { assertInvestorKycSubmitReady } = await import("../services/kycSections.js");
    const submitErr = assertInvestorKycSubmitReady(data, files, existing);
    if (submitErr) {
      return res.status(400).json({
        ...submitErr,
        error: submitErr.error || "Complete all KYC steps and uploads before submitting for review.",
      });
    }

    const sectionErr = validateKycSections(data, files, existing, requiredSections);
    if (sectionErr) return res.status(400).json(sectionErr);

    const { validateKycDocumentsOcr } = await import("../services/kycOcr.js");
    const ocrErr = await validateKycDocumentsOcr(data, files, existing);
    if (ocrErr) return res.status(400).json(ocrErr);

    let reviews = parseSectionReviews(existing) || initSectionReviewsPending();
    if (existing?.status === "REJECTED") {
      reviews = resetSectionsForResubmit(reviews, requiredSections);
    } else {
      reviews = initSectionReviewsPending();
    }
    data.sectionReviews = serializeSectionReviews(reviews);

    const kyc = await investDb.kyc.upsert({
      where: { investorId: req.user.id },
      create: { investorId: req.user.id, ...data },
      update: data,
    });
    if (b.bankName || b.bankAccount || b.ifscCode || b.upiId) {
      await investDb.investor.update({
        where: { id: req.user.id },
        data: {
          bankName: b.bankName || undefined,
          accountNumber: b.bankAccount || undefined,
          ifsc: b.ifscCode || undefined,
          upiId: b.upiId || undefined,
          phone: b.phone || undefined,
        },
      });
    }
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    notifyKycSubmitted(investor);
    const { ensureSectionReviewsOnRecord } = await import("../services/kycSections.js");
    res.json({ kyc: ensureSectionReviewsOnRecord(kyc), message: "KYC submitted for team review." });
  })
);

router.post(
  "/kyc/revision",
  authRequired(SCOPE),
  upload.fields([
    { name: "panDocument" },
    { name: "aadhaarDocument" },
    { name: "aadhaarFront" },
    { name: "aadhaarBack" },
    { name: "photo" },
    { name: "selfie" },
    { name: "addressProof" },
    { name: "signature" },
    { name: "cancelledCheque" },
    { name: "passbookDocument" },
    { name: "bankStatementDocument" },
    { name: "passportDocument" },
    { name: "driversLicenseDocument" },
  ]),
  asyncH(async (req, res) => {
    const kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    if (!kyc || kyc.status !== "APPROVED") {
      return res.status(400).json({ error: "Document updates after approval must be submitted as a change request." });
    }
    if (!hasKycRevisionDelegate()) {
      return res.status(503).json({ error: "KYC revision service unavailable. Run database migration and restart the API." });
    }
    const pending = await findPendingKycRevision(req.user.id);
    if (pending) {
      return res.status(400).json({ error: "You already have a KYC update awaiting team approval." });
    }
    const b = req.body;
    const files = req.files || {};
    const { parseKycBody } = await import("../utils/kycFields.js");
    const data = {
      investorId: req.user.id,
      kycId: kyc.id,
      ...parseKycBody(b, kyc),
      status: "PENDING",
      remarks: null,
    };
    const fileMap = {
      panDocument: "panDocument",
      aadhaarDocument: "aadhaarDocument",
      aadhaarFront: "aadhaarFront",
      aadhaarBack: "aadhaarBack",
      photo: "photo",
      selfie: "selfie",
      addressProof: "addressProof",
      signature: "signature",
      cancelledCheque: "cancelledCheque",
      passbookDocument: "passbookDocument",
      bankStatementDocument: "bankStatementDocument",
      passportDocument: "passportDocument",
      driversLicenseDocument: "driversLicenseDocument",
    };
    for (const [field, key] of Object.entries(fileMap)) {
      if (files[field]?.[0]) data[key] = fileUrl(files[field][0].filename);
      else if (kyc[key]) data[key] = kyc[key];
    }
    if (b.signatureData?.trim()) {
      data.signatureData = b.signatureData.trim();
      data.signatureMethod = "draw";
    }
    const revision = await investDb.kycRevision.create({ data });
    res.json({
      revision,
      message: "KYC update submitted for team approval. Your current approved KYC remains active until then.",
    });
  })
);

/* -------- wallet + ledger -------- */
router.get(
  "/wallet",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const wallet = await getOrCreateWallet(req.user.id);
    res.json({ wallet });
  })
);

router.get(
  "/ledger",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const where = { investorId: req.user.id };
    if (req.query.type) where.type = String(req.query.type).toUpperCase();
    const [entries, total, summary] = await Promise.all([
      investDb.ledgerEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
      investDb.ledgerEntry.count({ where }),
      investDb.ledgerEntry.groupBy({
        by: ["type", "direction"],
        where: { investorId: req.user.id },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    res.json({
      ledger: entries,
      total,
      summary: summary.map((s) => ({ type: s.type, direction: s.direction, count: s._count, volume: s._sum.amount || 0 })),
    });
  })
);

router.get(
  "/wallet/history",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    res.json(await getWalletHistory(req.user.id, req.query));
  })
);

/* -------- agreements -------- */
/** Tokenized PDF stream for iframe preview (no Authorization header required). */
router.get(
  "/agreement-documents/:id",
  asyncH(async (req, res) => {
    const rawToken = String(req.query.token || "");
    if (!rawToken) return res.status(401).json({ error: "Missing view token" });
    let payload;
    try {
      payload = verifyAgreementViewToken(rawToken);
    } catch {
      return res.status(401).json({ error: "Invalid or expired view link. Close and open the PDF again." });
    }
    if (payload.agreementId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const buffer = await getAgreementPdfBuffer(req.params.id, payload.userId, { isAdmin: payload.isAdmin });
      const ag = await investDb.agreement.findUnique({
        where: { id: req.params.id },
        select: { agreementUid: true },
      });
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
  "/agreements",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    res.json({ agreements: await listInvestorAgreements(req.user.id), types: AGREEMENT_TYPES });
  })
);

router.get(
  "/agreements/:id/view-url",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const token = signAgreementViewToken(req.params.id, req.user.id, { isAdmin: false });
    res.json({
      url: `/api/invest/agreement-documents/${req.params.id}?token=${encodeURIComponent(token)}`,
    });
  })
);

router.post(
  "/agreements/generate",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const agreement = await generateAgreement(req.user.id, req.body.type, {
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || "",
      triggerEvent: "user_requested",
    });
    res.json({ agreement });
  })
);

router.get(
  "/agreements/settings/public",
  authRequired(SCOPE),
  asyncH(async (_req, res) => {
    res.json(await getAgreementSettings());
  })
);

router.get(
  "/agreements/:id/view",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    try {
      const buffer = await getAgreementPdfBuffer(req.params.id, req.user.id);
      const ag = await investDb.agreement.findUnique({ where: { id: req.params.id }, select: { agreementUid: true } });
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
  asyncH(async (req, res) => {
    const settings = await getAgreementSettings();
    if (!settings.userDownloadEnabled) {
      return res.status(403).json({ error: "Agreement downloads are disabled by the platform." });
    }
    const buffer = await getAgreementPdfBuffer(req.params.id, req.user.id);
    const ag = await investDb.agreement.findUnique({ where: { id: req.params.id }, select: { agreementUid: true } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${ag?.agreementUid || "agreement"}.pdf"`);
    res.send(buffer);
  })
);

router.post(
  "/agreements/:id/sign",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    let signatureData = req.body.signatureData;
    if (req.body.useKycSignature) {
      const { getInvestorKycSignatureBase64 } = await import("../services/kycSignature.js");
      signatureData = await getInvestorKycSignatureBase64(req.user.id);
      if (!signatureData) {
        return res.status(400).json({ error: "No KYC signature on file. Complete KYC with a clear signature first." });
      }
    }
    if (!signatureData) return res.status(400).json({ error: "Signature is required" });
    const agreement = await signAgreement(req.user.id, req.params.id, signatureData, {
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || "",
      method: req.body.method || (req.body.useKycSignature ? "kyc" : "draw"),
      useKycSignature: Boolean(req.body.useKycSignature),
    });
    res.json({ agreement, pdfHash: agreement.pdfHash });
  })
);

/* -------- deposits (online gateway OR manual bank transfer proof) -------- */
const MANUAL_DEPOSIT_METHODS = new Set(["UPI", "IMPS", "NEFT", "RTGS", "BANK", "CRYPTO"]);
const ONLINE_DEPOSIT_GATEWAYS = new Set([
  "RAZORPAY", "CASHFREE", "PAYU", "EASEBUZZ", "JUSPAY", "EXIMPE",
  "HDFC", "AXIS", "ICICI", "YESBANK", "PHONEPE", "PAYPAL", "LITEPAY",
  "STRIPE", "PAYGLOCAL", "XFLOWPAY", "PINLABS",
]);

router.post(
  "/deposits",
  authRequired(SCOPE),
  upload.single("proofImage"),
  asyncH(async (req, res) => {
    const { amount, method, reference, planId, promoCode, paymentAccountId, cryptoAmount, cryptoSymbol, cryptoNetwork } = req.body;
    const methodUpper = String(method || "UPI").toUpperCase();
    let depositAmount = Number(amount);
    let cryptoMeta = null;

    if (methodUpper === "CRYPTO") {
      const { cryptoAmountToInr } = await import("../services/cryptoRates.js");
      const { isValidCryptoPair, parseCryptoFromGateway } = await import("../services/cryptoAssets.js");
      const sym = String(cryptoSymbol || "").toUpperCase();
      const net = String(cryptoNetwork || "").trim();
      if (!isValidCryptoPair(sym, net)) {
        return res.status(400).json({ error: "Unsupported crypto asset or network." });
      }
      const conv = await cryptoAmountToInr(cryptoAmount, sym);
      if (!conv.ok) return res.status(400).json({ error: conv.error });
      depositAmount = conv.inr;
      cryptoMeta = {
        cryptoSymbol: sym,
        cryptoNetwork: net,
        cryptoAmount: Number(cryptoAmount),
        inrEquivalent: conv.inr,
        txHash: reference?.trim() || null,
      };
      if (paymentAccountId) {
        const acct = await investDb.paymentGateway.findFirst({
          where: { id: paymentAccountId, type: "crypto", isEnabled: true },
        });
        if (!acct) return res.status(400).json({ error: "Invalid crypto wallet selected." });
        const { parseExtraConfig } = await import("../services/paymentGateways.js");
        const c = parseCryptoFromGateway({ extraConfig: parseExtraConfig(acct.extraConfig) });
        if (c.symbol && c.symbol !== sym) {
          return res.status(400).json({ error: "Selected wallet does not match coin." });
        }
      }
    }

    const depositCheck = validateDepositAmount(depositAmount, methodUpper === "CRYPTO" ? "BANK" : methodUpper);
    if (!depositCheck.ok) {
      return res.status(400).json({ error: depositCheck.error, code: depositCheck.code });
    }
    const isManual = MANUAL_DEPOSIT_METHODS.has(methodUpper);
    const { getInvestorPaymentOptions } = await import("../services/paymentModeVisibility.js");
    const payOpts = await getInvestorPaymentOptions();

    if (isManual) {
      if (methodUpper === "UPI" && !payOpts.depositCategories.upi) {
        return res.status(400).json({ error: "UPI deposits are not available at this time." });
      }
      if (methodUpper === "CRYPTO" && !payOpts.depositCategories.crypto) {
        return res.status(400).json({ error: "Crypto deposits are not available at this time." });
      }
      if (["IMPS", "NEFT", "RTGS", "BANK"].includes(methodUpper) && !payOpts.depositCategories.bank) {
        return res.status(400).json({ error: "Bank transfer deposits are not available at this time." });
      }
      if (payOpts.bankTransferTypes[methodUpper] === false) {
        return res.status(400).json({ error: `${methodUpper} deposits are not available at this time.` });
      }
      if (methodUpper !== "CRYPTO" && !req.file) {
        return res.status(400).json({ error: "Payment proof (screenshot or PDF) is required for UPI and bank transfers." });
      }
      if (methodUpper === "CRYPTO") {
        if (!req.file) {
          return res.status(400).json({ error: "Upload payment proof (screenshot of transfer confirmation)." });
        }
        if (!reference?.trim()) {
          return res.status(400).json({ error: "Transaction hash / TX ID is required for crypto deposits." });
        }
        if (!cryptoAmount || Number(cryptoAmount) <= 0) {
          return res.status(400).json({ error: "Enter the crypto amount you sent." });
        }
      } else if (!reference?.trim()) {
        return res.status(400).json({ error: "UTR / transaction reference is required for manual deposits." });
      }
      if (paymentAccountId) {
        const acct = await investDb.paymentGateway.findFirst({
          where: { id: paymentAccountId, isEnabled: true },
        });
        if (!acct) return res.status(400).json({ error: "Invalid payment account selected." });
        const expectedType = methodUpper === "UPI" ? "upi" : methodUpper === "CRYPTO" ? "crypto" : "bank";
        if (acct.type !== expectedType) {
          return res.status(400).json({ error: "Selected account does not match deposit method." });
        }
      }
    }

    let remarks = null;
    if (promoCode?.trim()) {
      const result = await validatePromoCode(promoCode, {
        amount: depositAmount,
        appliesTo: "DEPOSIT",
        investorId: req.user.id,
      });
      if (!result.ok) return res.status(400).json({ error: result.error });
      remarks = `__promo__:${result.promo.code}:${result.bonus}`;
    }
    const dep = await investDb.deposit.create({
      data: {
        investorId: req.user.id,
        amount: depositAmount,
        method: methodUpper,
        reference: reference?.trim() || null,
        planId: planId || null,
        proofImage: req.file ? fileUrl(req.file.filename) : null,
        paymentAccountId: paymentAccountId || null,
        status: "PENDING",
        remarks,
        ...(cryptoMeta
          ? {
              cryptoSymbol: cryptoMeta.cryptoSymbol,
              cryptoNetwork: cryptoMeta.cryptoNetwork,
              cryptoAmount: cryptoMeta.cryptoAmount,
              inrEquivalent: cryptoMeta.inrEquivalent,
              txHash: cryptoMeta.txHash,
            }
          : {}),
      },
    });
    let payment = null;
    if (ONLINE_DEPOSIT_GATEWAYS.has(methodUpper)) {
      const { assertDepositGatewayAllowed } = await import("../services/paymentModeVisibility.js");
      await assertDepositGatewayAllowed(methodUpper);
      payment = await createOrder(methodUpper.toLowerCase(), {
        amount: dep.amount,
        currency: dep.method === "PAYPAL" ? "INR" : "INR",
        receipt: "DEP-" + dep.id.slice(-8),
        depositId: dep.id,
        portal: "invest",
        kind: "deposit",
        customer: { id: req.user.id, email: req.user.email, phone: req.user.phone, name: req.user.name },
      });
      const gatewayRef = payment?.merchantTransactionId || payment?.orderId || payment?.data?.merchantTransactionId;
      if (gatewayRef) {
        await investDb.deposit.update({ where: { id: dep.id }, data: { gatewayRef: String(gatewayRef) } });
        dep.gatewayRef = String(gatewayRef);
      }
    }
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    notifyDepositSubmitted(investor, dep);
    if (payment?.mock && ONLINE_DEPOSIT_GATEWAYS.has(methodUpper)) {
      await autoApproveDeposit(dep.id, payment.orderId || dep.gatewayRef);
      dep.status = "APPROVED";
    }
    res.json({ deposit: dep, payment, autoApproved: dep.status === "APPROVED" && payment?.mock });
  })
);

router.get(
  "/deposits",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const deposits = await investDb.deposit.findMany({ where: { investorId: req.user.id }, orderBy: { createdAt: "desc" } });
    res.json({ deposits });
  })
);

/* -------- subscriptions (invest in a plan using wallet balance) -------- */
router.post(
  "/subscribe",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const { planId, amount, settlementCycle } = req.body;
    const plan = await investDb.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) return res.status(404).json({ error: "Plan not available" });
    const amt = Number(amount);
    if (amt < plan.minInvestment || amt > plan.maxInvestment) {
      return res.status(400).json({ error: `Amount must be between ${plan.minInvestment} and ${plan.maxInvestment}` });
    }
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.available < amt) {
      return res.status(400).json({ error: "Insufficient wallet balance. Please deposit first." });
    }
    // KYC must be approved before investing
    const gate = await (await import("../utils/investCompliance.js")).assertCanInvest(req.user.id, investDb);
    if (!gate.ok) {
      return res.status(403).json({ error: gate.error, code: gate.code, missing: gate.missing });
    }
    const cycleCheck = validateSettlementCycle(plan, settlementCycle);
    if (!cycleCheck.ok) return res.status(400).json({ error: cycleCheck.error });
    const start = new Date();
    const sub = await investDb.subscription.create({
      data: {
        investorId: req.user.id,
        planId: plan.id,
        amount: amt,
        settlementCycle: cycleCheck.cycle,
        monthlyRoiPct: plan.monthlyRoiPct,
        lockInDays: plan.lockInDays,
        startDate: start,
        maturityDate: maturityDate(start, plan.lockInDays),
        status: "ACTIVE",
      },
    });
    // Move funds from available -> invested, record ledger
    await addLedger(req.user.id, { type: "INVESTMENT", direction: "DEBIT", amount: amt, reference: sub.id, note: `Invested in ${plan.name}` });
    await investDb.wallet.update({ where: { investorId: req.user.id }, data: { invested: { increment: amt } } });
    await creditReferralOnInvestment(req.user.id, amt, sub.id);
    let agreement = null;
    let agreementError = null;
    try {
      agreement = await generateSubscriptionAgreement(req.user.id, sub.id, {
        ipAddress: clientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });
    } catch (e) {
      agreementError = e.message || "Agreement could not be generated";
      console.error("[subscribe] agreement generation failed:", e);
    }
    await notifyInvestor(req.user.id, "Investment confirmed", `You invested ${amt} in ${plan.name}.`, { type: "SUCCESS", link: "investments" });
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    notifyInvestmentActivity(investor, { planName: plan.name, amount: amt, settlementCycle: cycleCheck.cycle, source: "investor" });
    res.json({ subscription: sub, agreement, agreementError });
  })
);

router.get(
  "/subscriptions",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const subs = await investDb.subscription.findMany({
      where: { investorId: req.user.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    const withProjection = subs.map((s) => {
      const matured = new Date() >= new Date(s.maturityDate);
      const projection = matured
        ? compoundedMaturity(s.amount, s.monthlyRoiPct, s.lockInDays)
        : simpleMaturity(s.amount, s.monthlyRoiPct, s.lockInDays);
      return { ...s, matured, monthlyReturn: monthlyReturn(s.amount, s.monthlyRoiPct), projection };
    });
    res.json({ subscriptions: withProjection });
  })
);

router.get(
  "/subscriptions/:id",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const sub = await investDb.subscription.findFirst({
      where: { id: req.params.id, investorId: req.user.id },
      include: {
        plan: true,
        roiPayouts: { orderBy: { createdAt: "desc" }, take: 24 },
        maturityPayouts: { orderBy: { dueDate: "desc" }, take: 12 },
        agreements: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!sub) return res.status(404).json({ error: "Investment not found" });
    const matured = new Date() >= new Date(sub.maturityDate);
    const projection = matured
      ? compoundedMaturity(sub.amount, sub.monthlyRoiPct, sub.lockInDays)
      : simpleMaturity(sub.amount, sub.monthlyRoiPct, sub.lockInDays);
    const ledger = await investDb.ledgerEntry.findMany({
      where: { investorId: req.user.id, reference: sub.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({
      subscription: {
        ...sub,
        matured,
        monthlyReturn: monthlyReturn(sub.amount, sub.monthlyRoiPct),
        projection,
        totalRoiPaid: sub.roiPayouts.reduce((n, p) => n + p.amount, 0),
      },
      ledger,
    });
  })
);

router.get(
  "/subscriptions/:id/early-exit/preview",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const result = await previewEarlyExit(req.params.id, req.user.id);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

router.post(
  "/subscriptions/:id/early-exit",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const result = await processEarlyExit(req.params.id, req.user.id);
    if (!result.ok) return res.status(400).json({ error: result.error });
    await notifyInvestor(req.user.id, "Early exit processed", result.message, { type: "INFO", link: "money" });
    res.json(result);
  })
);

router.get(
  "/subscriptions/:id/certificate",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const payload = await getCertificatePayload(req.params.id, req.user.id);
    if (!payload) return res.status(404).json({ error: "Investment not found" });
    res.json({ certificate: payload });
  })
);

/* -------- payout / withdrawal request (2-step: initiate + confirm with email OTP) -------- */
router.post(
  "/payouts/initiate",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const { amount, mode, password, totpCode } = req.body;
    const { getInvestorPaymentOptions } = await import("../services/paymentModeVisibility.js");
    const payOpts = await getInvestorPaymentOptions();
    const modeUpper = String(mode || "UPI").toUpperCase();
    if (modeUpper === "UPI" && payOpts.withdrawMethods.UPI === false) {
      return res.status(400).json({ error: "UPI withdrawals are not available at this time." });
    }
    if (modeUpper === "CRYPTO" && payOpts.withdrawMethods.CRYPTO === false) {
      return res.status(400).json({ error: "Crypto withdrawals are not available at this time." });
    }
    if (modeUpper !== "UPI" && modeUpper !== "CRYPTO" && payOpts.withdrawMethods.BANK === false) {
      return res.status(400).json({ error: "Bank withdrawals are not available at this time." });
    }
    const gate = await (await import("../utils/investCompliance.js")).assertCanWithdraw(req.user.id, investDb);
    if (!gate.ok) return res.status(403).json({ error: gate.error, code: gate.code, missing: gate.missing });

    const inv = gate.investor;
    const destination =
      modeUpper === "UPI"
        ? inv.upiId
        : modeUpper === "CRYPTO"
          ? inv.cryptoWalletAddress
          : inv.accountNumber;
    if (!destination) {
      const hint =
        modeUpper === "CRYPTO"
          ? "crypto wallet address and chain in Profile"
          : `${mode} payout details`;
      return res.status(400).json({ error: `Please add your ${hint} first.` });
    }
    if (modeUpper === "CRYPTO" && (!inv.cryptoSymbol || !inv.cryptoNetwork)) {
      return res.status(400).json({ error: "Please set crypto coin and network (chain) in Profile before withdrawing." });
    }
    const withdrawCheck = validateWithdrawAmount(amount, modeUpper);
    if (!withdrawCheck.ok) {
      return res.status(400).json({ error: withdrawCheck.error, code: withdrawCheck.code });
    }
    const result = await initiateWithdrawal(inv, { amount, mode, destination, password, totpCode });
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

router.post(
  "/payouts/confirm",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const { confirmationToken, emailOtp, amount, mode, destination } = req.body;
    const modeUpper = String(mode || "UPI").toUpperCase();
    const withdrawCheck = validateWithdrawAmount(amount, modeUpper);
    if (!withdrawCheck.ok) {
      return res.status(400).json({ error: withdrawCheck.error, code: withdrawCheck.code });
    }
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id } });
    const confirmed = await confirmWithdrawal(inv, { confirmationToken, emailOtp, amount, mode, destination });
    if (!confirmed.ok) return res.status(400).json({ error: confirmed.error });
    const amt = confirmed.amount;
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.available < amt) return res.status(400).json({ error: "Insufficient available balance" });
    const payoutMode = String(mode || "UPI").toUpperCase();
    const dest =
      confirmed.destination ||
      (payoutMode === "UPI"
        ? inv.upiId
        : payoutMode === "CRYPTO"
          ? `${inv.cryptoWalletAddress}|${inv.cryptoSymbol}|${inv.cryptoNetwork}`
          : inv.accountNumber);
    const payout = await investDb.payout.create({
      data: {
        investorId: req.user.id,
        amount: amt,
        mode: payoutMode === "CRYPTO" ? "CRYPTO" : payoutMode === "UPI" ? "UPI" : "BANK",
        destination: dest,
        status: "PENDING",
        remarks:
          payoutMode === "CRYPTO"
            ? `Crypto withdraw: ${inv.cryptoSymbol} on ${inv.cryptoNetwork}`
            : null,
      },
    });
    await addLedger(req.user.id, { type: "PAYOUT", direction: "DEBIT", amount: amt, reference: payout.id, note: "Withdrawal requested" });
    notifyWithdrawalRequested(inv, payout);
    res.json({ payout });
  })
);

router.post(
  "/payouts",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    if (!req.body.confirmationToken) {
      return res.status(400).json({ error: "Use POST /payouts/initiate then POST /payouts/confirm with email OTP" });
    }
    const { confirmationToken, emailOtp, amount, mode, destination } = req.body;
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id } });
    const confirmed = await confirmWithdrawal(inv, { confirmationToken, emailOtp, amount, mode, destination });
    if (!confirmed.ok) return res.status(400).json({ error: confirmed.error });
    const amt = confirmed.amount;
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.available < amt) return res.status(400).json({ error: "Insufficient available balance" });
    const payoutMode = String(mode || "UPI").toUpperCase();
    const dest =
      confirmed.destination ||
      (payoutMode === "UPI"
        ? inv.upiId
        : payoutMode === "CRYPTO"
          ? `${inv.cryptoWalletAddress}|${inv.cryptoSymbol}|${inv.cryptoNetwork}`
          : inv.accountNumber);
    const payout = await investDb.payout.create({
      data: {
        investorId: req.user.id,
        amount: amt,
        mode: payoutMode === "CRYPTO" ? "CRYPTO" : payoutMode === "UPI" ? "UPI" : "BANK",
        destination: dest,
        status: "PENDING",
        remarks:
          payoutMode === "CRYPTO"
            ? `Crypto withdraw: ${inv.cryptoSymbol} on ${inv.cryptoNetwork}`
            : null,
      },
    });
    await addLedger(req.user.id, { type: "PAYOUT", direction: "DEBIT", amount: amt, reference: payout.id, note: "Withdrawal requested" });
    notifyWithdrawalRequested(inv, payout);
    res.json({ payout });
  })
);

router.get(
  "/payouts",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const payouts = await investDb.payout.findMany({ where: { investorId: req.user.id }, orderBy: { createdAt: "desc" } });
    res.json({ payouts });
  })
);

/* -------- support tickets -------- */
router.get(
  "/tickets",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const tickets = await investDb.supportTicket.findMany({
      where: { investorId: req.user.id },
      include: { replies: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ tickets });
  })
);

router.post(
  "/tickets",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { subject, message, category, priority } = req.body;
    if (!subject?.trim() || !message?.trim()) return res.status(400).json({ error: "Subject and message required" });
    const ticket = await investDb.supportTicket.create({
      data: {
        investorId: req.user.id,
        subject: subject.trim(),
        message: message.trim(),
        category: category || "GENERAL",
        priority: priority || "NORMAL",
      },
    });
    res.json({ ticket });
  })
);

router.post(
  "/tickets/:id/reply",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const ticket = await investDb.supportTicket.findFirst({ where: { id: req.params.id, investorId: req.user.id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const reply = await investDb.ticketReply.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user.id,
        authorName: req.user.name,
        authorRole: "INVESTOR",
        message: String(req.body.message || "").trim(),
      },
    });
    await investDb.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
    res.json({ reply });
  })
);

/* -------- in-app notifications -------- */
router.get(
  "/notifications/list",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const notifications = await listNotifications(req.user.id);
    const unreadCount = await getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  })
);

router.post(
  "/notifications/:id/read",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    await markRead(req.user.id, req.params.id);
    res.json({ ok: true });
  })
);

router.post(
  "/notifications/read-all",
  authRequired(SCOPE),
  asyncH(async (_req, res) => {
    await markAllRead(req.user.id);
    res.json({ ok: true });
  })
);

/* -------- promo codes -------- */
router.post(
  "/promo/validate",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { code, amount, appliesTo } = req.body;
    const result = await validatePromoCode(code, {
      amount: Number(amount),
      appliesTo: (appliesTo || "DEPOSIT").toUpperCase(),
      investorId: req.user.id,
    });
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ promo: result.promo, bonus: result.bonus });
  })
);

/* -------- wallet statement CSV / PDF -------- */
async function loadWalletStatementData(investorId) {
  const [investor, wallet, entries] = await Promise.all([
    investDb.investor.findUnique({
      where: { id: investorId },
      select: { id: true, name: true, email: true },
    }),
    investDb.wallet.findUnique({ where: { investorId } }),
    investDb.ledgerEntry.findMany({
      where: { investorId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);
  return { investor, wallet, entries };
}

router.get(
  "/wallet/statement.csv",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { entries } = await loadWalletStatementData(req.user.id);
    const lines = ["Date,Type,Direction,Amount,Balance After,Reference,Note"];
    for (const e of entries) {
      lines.push(
        [
          e.createdAt.toISOString(),
          e.type,
          e.direction,
          e.amount,
          e.balanceAfter,
          `"${(e.reference || "").replace(/"/g, "'")}"`,
          `"${(e.note || "").replace(/"/g, "'")}"`,
        ].join(",")
      );
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=wallet-statement.csv");
    res.send(lines.join("\n"));
  })
);

router.get(
  "/wallet/statement.pdf",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { generateWalletStatementPdf } = await import("../services/walletStatementPdf.js");
    const data = await loadWalletStatementData(req.user.id);
    const buffer = await generateWalletStatementPdf(data);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=wallet-statement-${stamp}.pdf`);
    res.send(buffer);
  })
);

export default router;
