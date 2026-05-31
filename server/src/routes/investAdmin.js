import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH, authRequired, requireRole } from "../middleware.js";
import { hashPassword } from "../utils/auth.js";
import { annualRoiPct } from "../utils/invest.js";
import { disburse, payoutGatewayStatus } from "../payments/payouts.js";
import { addLedger } from "./investInvestor.js";

const router = Router();
const SCOPE = "invest";
const adminOnly = requireRole("ADMIN", "SUPERADMIN");
const superOnly = requireRole("SUPERADMIN");

const PLAN_TYPES = ["STARTER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

/* ---------------- Plans CRUD (super admin only) ---------------- */
router.get(
  "/plans",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (_req, res) => {
    const plans = await investDb.plan.findMany({ orderBy: { minInvestment: "asc" } });
    res.json({ plans, planTypes: PLAN_TYPES });
  })
);

router.post(
  "/plans",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const b = req.body;
    if (!PLAN_TYPES.includes(b.planType)) return res.status(400).json({ error: "Invalid plan type" });
    const lockInDays = Number(b.lockInDays);
    if (lockInDays % 30 !== 0) return res.status(400).json({ error: "Lock-in period must be a multiple of 30 days" });
    const monthlyRoiPct = Number(b.monthlyRoiPct ?? b.profitSharePct);
    const plan = await investDb.plan.create({
      data: {
        planType: b.planType,
        name: b.name || `${b.planType} Plan`,
        lockInDays,
        minInvestment: Number(b.minInvestment),
        maxInvestment: Number(b.maxInvestment),
        profitSharePct: Number(b.profitSharePct ?? monthlyRoiPct),
        monthlyRoiPct,
        annualRoiPct: Number(b.annualRoiPct ?? annualRoiPct(monthlyRoiPct)),
        settlementCycles: b.settlementCycles || "MONTHLY",
        color: b.color || "#0a3d91",
        description: b.description || null,
        isActive: b.isActive !== false,
      },
    });
    res.json({ plan });
  })
);

router.put(
  "/plans/:id",
  authRequired(SCOPE),
  superOnly,
  asyncH(async (req, res) => {
    const b = req.body;
    const data = {};
    if (b.planType && PLAN_TYPES.includes(b.planType)) data.planType = b.planType;
    if (b.name !== undefined) data.name = b.name;
    if (b.lockInDays !== undefined) {
      if (Number(b.lockInDays) % 30 !== 0) return res.status(400).json({ error: "Lock-in must be multiple of 30 days" });
      data.lockInDays = Number(b.lockInDays);
    }
    if (b.minInvestment !== undefined) data.minInvestment = Number(b.minInvestment);
    if (b.maxInvestment !== undefined) data.maxInvestment = Number(b.maxInvestment);
    if (b.monthlyRoiPct !== undefined) {
      data.monthlyRoiPct = Number(b.monthlyRoiPct);
      data.annualRoiPct = b.annualRoiPct !== undefined ? Number(b.annualRoiPct) : annualRoiPct(Number(b.monthlyRoiPct));
    }
    if (b.profitSharePct !== undefined) data.profitSharePct = Number(b.profitSharePct);
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
  superOnly,
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

// Only super admin can create admin/staff accounts on the portal
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
        role: ["ADMIN", "SUPERADMIN"].includes(role) ? role : "ADMIN",
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
    res.json({ deposits });
  })
);

router.post(
  "/deposits/:id/approve",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const dep = await investDb.deposit.findUnique({ where: { id: req.params.id } });
    if (!dep) return res.status(404).json({ error: "Not found" });
    if (dep.status === "APPROVED") return res.status(400).json({ error: "Already approved" });
    await investDb.deposit.update({ where: { id: dep.id }, data: { status: "APPROVED", remarks: req.body.remarks || null } });
    // Credit the investor wallet
    await addLedger(dep.investorId, { type: "DEPOSIT", direction: "CREDIT", amount: dep.amount, reference: dep.id, note: `Deposit via ${dep.method} approved` });
    res.json({ ok: true });
  })
);

router.post(
  "/deposits/:id/reject",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    await investDb.deposit.update({ where: { id: req.params.id }, data: { status: "REJECTED", remarks: req.body.remarks || "Rejected" } });
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
  asyncH(async (req, res) => {
    const { status, remarks } = req.body; // APPROVED | REJECTED
    const kyc = await investDb.kyc.update({
      where: { id: req.params.id },
      data: { status: status === "APPROVED" ? "APPROVED" : "REJECTED", remarks },
    });
    res.json({ kyc });
  })
);

/* ---------------- Payouts: release to UPI/bank via gateway ---------------- */
router.get(
  "/payouts",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const where = req.query.status ? { status: String(req.query.status) } : {};
    const payouts = await investDb.payout.findMany({ where, include: { investor: true }, orderBy: { createdAt: "desc" } });
    res.json({ payouts, gateways: payoutGatewayStatus() });
  })
);

// Admin/super admin releases the payout to the investor's UPI/bank using a payout gateway.
router.post(
  "/payouts/:id/release",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const { gateway } = req.body; // RAZORPAYX | CASHFREE
    const payout = await investDb.payout.findUnique({ where: { id: req.params.id }, include: { investor: true } });
    if (!payout) return res.status(404).json({ error: "Not found" });
    if (payout.status === "SUCCESS") return res.status(400).json({ error: "Already paid" });
    await investDb.payout.update({ where: { id: payout.id }, data: { status: "PROCESSING", gateway: gateway || "RAZORPAYX" } });
    const result = await disburse(gateway || "RAZORPAYX", {
      amount: payout.amount,
      mode: payout.mode,
      destination: payout.destination,
      reference: payout.id,
    });
    const status = result.ok ? result.status || "SUCCESS" : "FAILED";
    const updated = await investDb.payout.update({
      where: { id: payout.id },
      data: { status, gatewayRef: result.gatewayRef, remarks: result.mock ? "Processed in mock mode" : null },
    });
    res.json({ payout: updated, result });
  })
);

router.post(
  "/payouts/:id/reject",
  authRequired(SCOPE),
  adminOnly,
  asyncH(async (req, res) => {
    const payout = await investDb.payout.findUnique({ where: { id: req.params.id } });
    if (!payout) return res.status(404).json({ error: "Not found" });
    await investDb.payout.update({ where: { id: payout.id }, data: { status: "FAILED", remarks: req.body.remarks || "Rejected" } });
    // refund the held amount back to wallet
    await addLedger(payout.investorId, { type: "REFUND", direction: "CREDIT", amount: payout.amount, reference: payout.id, note: "Withdrawal rejected - refunded" });
    res.json({ ok: true });
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

/* ---------------- Stats ---------------- */
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

export default router;
