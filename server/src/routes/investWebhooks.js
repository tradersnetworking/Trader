import { Router } from "express";
import { asyncH } from "../middleware.js";
import {
  handleRazorpayWebhook,
  verifyRazorpaySignature,
  handlePhonePeCallback,
  createPhonePeOrder,
  createPayPalOrder,
  capturePayPalOrder,
} from "../services/paymentWebhooks.js";
import { investDb } from "../db.js";
import { getSetting } from "../services/investSettings.js";

const router = Router();

router.post(
  "/razorpay",
  asyncH(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || (await getSetting("gateway_razorpay_webhook_secret"));
    const sig = req.headers["x-razorpay-signature"];
    if (secret && sig) {
      const raw = JSON.stringify(req.body);
      if (!verifyRazorpaySignature(raw, sig, secret)) return res.status(400).json({ error: "Invalid signature" });
    }
    const result = await handleRazorpayWebhook(req.body);
    res.json(result);
  })
);

router.post(
  "/phonepe/callback",
  asyncH(async (req, res) => {
    const response = req.body.response || req.body;
    const result = await handlePhonePeCallback(response);
    res.json(result);
  })
);

router.post(
  "/phonepe/initiate",
  asyncH(async (req, res) => {
    const { depositId, amount, redirectUrl } = req.body;
    const txnId = `PP${depositId?.slice(-8) || Date.now()}`;
    if (depositId) {
      await investDb.deposit.update({ where: { id: depositId }, data: { gatewayRef: txnId, method: "PHONEPE" } });
    }
    res.json(await createPhonePeOrder({ amount: Number(amount), merchantTransactionId: txnId, redirectUrl }));
  })
);

router.post(
  "/paypal/create",
  asyncH(async (req, res) => {
    const { depositId, amount, currency } = req.body;
    const order = await createPayPalOrder({ amount: Number(amount), currency: "INR", depositId });
    if (depositId && order.orderId) {
      await investDb.deposit.update({ where: { id: depositId }, data: { gatewayRef: order.orderId, method: "PAYPAL" } });
    }
    res.json(order);
  })
);

router.post(
  "/paypal/capture",
  asyncH(async (req, res) => {
    const { orderId, accessToken } = req.body;
    res.json(await capturePayPalOrder(orderId, accessToken));
  })
);

export default router;
