import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH } from "../middleware.js";
import { normalizePlanRoi, planCalcPreview, validateSettlementCycle } from "../utils/invest.js";
import { listGateways } from "../payments/gateways.js";
import { getSetting } from "../services/investSettings.js";
import { getPrimaryBankDetails, getDepositAccountsForInvestor } from "../services/paymentGateways.js";
import { verifyCertificateToken, getCertificatePayload } from "../services/investCertificate.js";
import { getReferralLeaderboard } from "../services/referral.js";
import { getPublicPortalConfig } from "../services/additionalDomains.js";

const router = Router();

// Public list of active plans (shown on home page + dashboard cards)
router.get(
  "/plans",
  asyncH(async (_req, res) => {
    const plans = await investDb.plan.findMany({
      where: { isActive: true },
      orderBy: [{ planType: "asc" }, { lockInDays: "asc" }],
    });
    res.json({ plans: plans.map(normalizePlanRoi) });
  })
);

router.get(
  "/plans/:id/calc",
  asyncH(async (req, res) => {
    const plan = await investDb.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const amount = Number(req.query.amount || plan.minInvestment);
    if (amount < plan.minInvestment || amount > plan.maxInvestment) {
      return res.status(400).json({
        error: `Amount must be between ₹${plan.minInvestment.toLocaleString("en-IN")} and ₹${plan.maxInvestment.toLocaleString("en-IN")}`,
      });
    }
    const settlementCycle = req.query.settlementCycle || "MONTHLY";
    res.json(planCalcPreview(amount, normalizePlanRoi(plan), settlementCycle));
  })
);

router.get("/bank-details", asyncH(async (_req, res) => res.json(await getPrimaryBankDetails())));
router.get("/deposit-accounts", asyncH(async (_req, res) => res.json({ accounts: await getDepositAccountsForInvestor() })));
router.get("/gateways", asyncH(async (_req, res) => {
  const { getSetting } = await import("../services/investSettings.js");
  res.json({
    gateways: await listGateways(),
    defaultDepositGateway: (await getSetting("default_deposit_gateway")) || "RAZORPAY",
  });
}));

router.get(
  "/maintenance",
  asyncH(async (_req, res) => {
    const enabled = (await getSetting("maintenance_mode")) === "true";
    res.json({ enabled, message: (await getSetting("maintenance_message")) || "Platform under maintenance. Please check back soon." });
  })
);

router.get(
  "/partners",
  asyncH(async (_req, res) => {
    const partners = await investDb.sitePartner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    res.json({ partners });
  })
);

router.get(
  "/portal-config",
  asyncH(async (_req, res) => {
    res.json(await getPublicPortalConfig());
  })
);

router.get(
  "/homepage",
  asyncH(async (_req, res) => {
    const keys = [
      "homepage_hero_title", "homepage_hero_subtitle", "homepage_about_title", "homepage_about_body",
      "homepage_show_calculator", "homepage_show_partners", "homepage_show_trust_stats",
      "about_company_name", "about_company_tagline", "about_company_credentials",
    ];
    const out = {};
    for (const k of keys) out[k] = await getSetting(k);
    res.json({ homepage: out });
  })
);

router.get(
  "/mobile-app",
  asyncH(async (_req, res) => {
    const apkUrl = (await getSetting("android_apk_url")) || "/assets/apk/akshaya-invest.apk";
    res.json({
      appName: "Akshaya Invest",
      androidApkUrl: apkUrl,
      version: (await getSetting("android_app_version")) || "1.0.0",
      pwaEnabled: true,
    });
  })
);

router.get(
  "/verify-certificate",
  asyncH(async (req, res) => {
    const subscriptionId = verifyCertificateToken(req.query.token);
    if (!subscriptionId) return res.status(400).json({ valid: false, error: "Invalid or tampered certificate token" });
    const payload = await getCertificatePayload(subscriptionId);
    if (!payload) return res.status(404).json({ valid: false, error: "Certificate not found" });
    res.json({
      valid: true,
      certificateNumber: payload.certificateNumber,
      investorName: payload.investorName,
      planName: payload.planName,
      amount: payload.amount,
      startDate: payload.startDate,
      maturityDate: payload.maturityDate,
      status: payload.status,
    });
  })
);

router.post(
  "/referral/track",
  asyncH(async (req, res) => {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const event = String(req.body?.event || "CLICK").toUpperCase();
    if (!code) return res.status(400).json({ error: "code required" });
    await investDb.auditLog.create({
      data: {
        action: `REFERRAL_${event}`,
        entity: "Referral",
        entityId: code,
        meta: JSON.stringify({
          ip: req.ip,
          userAgent: req.headers["user-agent"]?.slice(0, 200),
        }),
      },
    });
    res.json({ ok: true });
  })
);

router.get(
  "/referral/leaderboard",
  asyncH(async (_req, res) => {
    res.json({ leaderboard: await getReferralLeaderboard({ limit: 10 }) });
  })
);

export default router;
