import { Router } from "express";
import { investDb } from "../db.js";
import { normalizePlanRoi } from "../utils/invest.js";
import { renderPlanOgPng } from "../services/planOgImage.js";

const router = Router();

router.get("/plan/:id.png", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").replace(/\.png$/i, "");
    if (!id) return res.status(404).end();

    const plan = await investDb.plan.findFirst({ where: { id, isActive: true } });
    if (!plan) return res.status(404).type("text/plain").send("Plan not found");

    const png = await renderPlanOgPng(normalizePlanRoi(plan));
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.send(png);
  } catch (e) {
    next(e);
  }
});

export default router;
