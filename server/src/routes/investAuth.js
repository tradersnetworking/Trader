import { Router } from "express";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { asyncH, authRequired } from "../middleware.js";
import { hashPassword, comparePassword, signToken } from "../utils/auth.js";
import { sendMail } from "../utils/mailer.js";
import { verifyGoogleIdToken } from "../utils/google.js";

const router = Router();
const SCOPE = "invest";

function publicInvestor(u) {
  if (!u) return null;
  const { passwordHash, resetToken, resetExpires, ...rest } = u;
  return rest;
}

router.post(
  "/register",
  asyncH(async (req, res) => {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "name, email, password required" });
    const exists = await investDb.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const investor = await investDb.investor.create({
      data: { email: email.toLowerCase(), passwordHash: hashPassword(password), name, phone, role: "INVESTOR" },
    });
    // create wallet
    await investDb.wallet.create({ data: { investorId: investor.id } });
    await sendMail({ to: investor.email, subject: "Welcome to Akshaya Exim Invest", text: `Hi ${name}, start investing at invest.akshayaexim.com` });
    const token = signToken({ id: investor.id, role: investor.role, email: investor.email }, SCOPE);
    res.json({ token, user: publicInvestor(investor) });
  })
);

router.post(
  "/login",
  asyncH(async (req, res) => {
    const { email, password, staff } = req.body;
    const investor = await investDb.investor.findUnique({ where: { email: (email || "").toLowerCase() } });
    if (!investor || !comparePassword(password, investor.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!investor.isActive) return res.status(403).json({ error: "Account disabled" });
    if (staff && !["ADMIN", "SUPERADMIN"].includes(investor.role)) {
      return res.status(403).json({ error: "Not a staff account" });
    }
    const token = signToken({ id: investor.id, role: investor.role, email: investor.email }, SCOPE);
    res.json({ token, user: publicInvestor(investor) });
  })
);

router.post(
  "/google",
  asyncH(async (req, res) => {
    const profile = await verifyGoogleIdToken(req.body.credential);
    if (!profile) return res.status(401).json({ error: "Invalid Google token" });
    let investor = await investDb.investor.findUnique({ where: { email: profile.email.toLowerCase() } });
    if (!investor) {
      investor = await investDb.investor.create({
        data: { email: profile.email.toLowerCase(), name: profile.name, googleId: profile.sub, emailVerified: true, role: "INVESTOR" },
      });
      await investDb.wallet.create({ data: { investorId: investor.id } });
    }
    const token = signToken({ id: investor.id, role: investor.role, email: investor.email }, SCOPE);
    res.json({ token, user: publicInvestor(investor) });
  })
);

router.post(
  "/forgot-password",
  asyncH(async (req, res) => {
    const { email } = req.body;
    const investor = await investDb.investor.findUnique({ where: { email: (email || "").toLowerCase() } });
    if (investor) {
      const token = nanoid(40);
      await investDb.investor.update({ where: { id: investor.id }, data: { resetToken: token, resetExpires: new Date(Date.now() + 1000 * 60 * 30) } });
      const link = `${process.env.CLIENT_ORIGIN || ""}/invest/reset-password?token=${token}`;
      await sendMail({ to: investor.email, subject: "Reset your password", text: `Reset link (valid 30 min): ${link}` });
    }
    res.json({ ok: true, message: "If the email exists, a reset link was sent." });
  })
);

router.post(
  "/reset-password",
  asyncH(async (req, res) => {
    const { token, password } = req.body;
    const investor = await investDb.investor.findFirst({ where: { resetToken: token, resetExpires: { gt: new Date() } } });
    if (!investor) return res.status(400).json({ error: "Invalid or expired token" });
    await investDb.investor.update({ where: { id: investor.id }, data: { passwordHash: hashPassword(password), resetToken: null, resetExpires: null } });
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    res.json({ user: publicInvestor(investor) });
  })
);

export default router;
