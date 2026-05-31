import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH, authRequired, requireRole } from "../middleware.js";
import { upload, fileUrl } from "../utils/upload.js";
import { maturityDate, simpleMaturity, compoundedMaturity, monthlyReturn } from "../utils/invest.js";
import { createOrder } from "../payments/gateways.js";

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

/* -------- profile / payout details -------- */
router.put(
  "/profile",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { name, phone, upiId, bankName, accountNumber, ifsc } = req.body;
    const inv = await investDb.investor.update({
      where: { id: req.user.id },
      data: { name, phone, upiId, bankName, accountNumber, ifsc },
    });
    const { passwordHash, resetToken, ...u } = inv;
    res.json({ user: u });
  })
);

/* -------- KYC -------- */
router.get(
  "/kyc",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    res.json({ kyc });
  })
);

router.post(
  "/kyc",
  authRequired(SCOPE),
  upload.fields([{ name: "panDocument" }, { name: "aadhaarDocument" }, { name: "photo" }]),
  asyncH(async (req, res) => {
    const b = req.body;
    const files = req.files || {};
    const data = {
      panNumber: b.panNumber,
      aadhaarNumber: b.aadhaarNumber,
      fullName: b.fullName,
      dob: b.dob,
      address: b.address,
      status: "PENDING",
      remarks: null,
    };
    if (files.panDocument) data.panDocument = fileUrl(files.panDocument[0].filename);
    if (files.aadhaarDocument) data.aadhaarDocument = fileUrl(files.aadhaarDocument[0].filename);
    if (files.photo) data.photo = fileUrl(files.photo[0].filename);
    const kyc = await investDb.kyc.upsert({
      where: { investorId: req.user.id },
      create: { investorId: req.user.id, ...data },
      update: data,
    });
    res.json({ kyc });
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
    const entries = await investDb.ledgerEntry.findMany({ where: { investorId: req.user.id }, orderBy: { createdAt: "desc" } });
    res.json({ ledger: entries });
  })
);

/* -------- deposits (online gateway OR manual bank transfer proof) -------- */
router.post(
  "/deposits",
  authRequired(SCOPE),
  upload.single("proofImage"),
  asyncH(async (req, res) => {
    const { amount, method, reference, planId } = req.body;
    const dep = await investDb.deposit.create({
      data: {
        investorId: req.user.id,
        amount: Number(amount),
        method: (method || "UPI").toUpperCase(),
        reference,
        planId: planId || null,
        proofImage: req.file ? fileUrl(req.file.filename) : null,
        status: "PENDING",
      },
    });
    // For online gateways, also create a payment order to checkout.
    let payment = null;
    const onlineGateways = ["RAZORPAY", "CASHFREE", "PAYU", "JUSPAY", "EXIMPE", "UPI"];
    if (onlineGateways.includes(dep.method)) {
      payment = await createOrder(dep.method.toLowerCase(), {
        amount: dep.amount,
        currency: "INR",
        receipt: "DEP-" + dep.id.slice(-8),
        customer: { id: req.user.id, email: req.user.email },
      });
    }
    res.json({ deposit: dep, payment });
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
    const kyc = await investDb.kyc.findUnique({ where: { investorId: req.user.id } });
    if (!kyc || kyc.status !== "APPROVED") {
      return res.status(403).json({ error: "KYC must be approved before investing." });
    }
    const start = new Date();
    const sub = await investDb.subscription.create({
      data: {
        investorId: req.user.id,
        planId: plan.id,
        amount: amt,
        settlementCycle: (settlementCycle || "MONTHLY").toUpperCase(),
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
    res.json({ subscription: sub });
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

/* -------- payout / withdrawal request -------- */
router.post(
  "/payouts",
  authRequired(SCOPE),
  investorOnly,
  asyncH(async (req, res) => {
    const { amount, mode } = req.body;
    const amt = Number(amount);
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.available < amt) return res.status(400).json({ error: "Insufficient available balance" });
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id } });
    const destination = mode === "UPI" ? inv.upiId : inv.accountNumber;
    if (!destination) return res.status(400).json({ error: `Please add your ${mode} payout details first.` });
    const payout = await investDb.payout.create({
      data: { investorId: req.user.id, amount: amt, mode: mode === "UPI" ? "UPI" : "BANK", destination, status: "PENDING" },
    });
    // Hold the funds immediately
    await addLedger(req.user.id, { type: "PAYOUT", direction: "DEBIT", amount: amt, reference: payout.id, note: "Withdrawal requested" });
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

export default router;
