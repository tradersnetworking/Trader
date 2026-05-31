import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH } from "../middleware.js";
import { config } from "../config.js";
import { simpleMaturity, compoundedMaturity, monthlyReturn } from "../utils/invest.js";
import { listGateways } from "../payments/gateways.js";

const router = Router();

// Public list of active plans (shown on home page + dashboard cards)
router.get(
  "/plans",
  asyncH(async (_req, res) => {
    const plans = await investDb.plan.findMany({ where: { isActive: true }, orderBy: { minInvestment: "asc" } });
    res.json({ plans });
  })
);

// Returns calculator (no auth) - shows monthly + maturity for an amount
router.get(
  "/plans/:id/calc",
  asyncH(async (req, res) => {
    const plan = await investDb.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const amount = Number(req.query.amount || plan.minInvestment);
    const monthly = monthlyReturn(amount, plan.monthlyRoiPct);
    const simple = simpleMaturity(amount, plan.monthlyRoiPct, plan.lockInDays);
    const compounded = compoundedMaturity(amount, plan.monthlyRoiPct, plan.lockInDays);
    res.json({
      amount,
      monthlyReturn: monthly,
      monthlyRoiPct: plan.monthlyRoiPct,
      annualRoiPct: plan.annualRoiPct,
      lockInDays: plan.lockInDays,
      simple,
      compounded,
      note: "Compounding applies only after the lock-in period is completed.",
    });
  })
);

router.get("/bank-details", (_req, res) => res.json({ bank: config.bank, upi: config.upi }));
router.get("/gateways", (_req, res) => res.json({ gateways: listGateways() }));

export default router;
