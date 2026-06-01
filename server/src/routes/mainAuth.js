import { Router } from "express";
import { nanoid } from "nanoid";
import { mainDb } from "../db.js";
import { asyncH, authRequired } from "../middleware.js";
import { hashPassword, comparePassword, signToken } from "../utils/auth.js";
import { sendMail } from "../utils/mailer.js";
import { verifyGoogleIdToken } from "../utils/google.js";
import { isGoogleLoginEnabled } from "../services/mainSiteSettings.js";

const router = Router();
const SCOPE = "main";

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, resetToken, resetExpires, ...rest } = u;
  return rest;
}

// Register (buyer/seller). role is always USER here; staff/admin created by super admin.
router.post(
  "/register",
  asyncH(async (req, res) => {
    const { email, password, name, phone, phoneCountryCode, accountType, companyName, gstNumber } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "name, email, password required" });
    const exists = await mainDb.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const user = await mainDb.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        name,
        phone,
        phoneCountryCode: phoneCountryCode || "+91",
        accountType: accountType === "B2B" ? "B2B" : "B2C",
        companyName,
        gstNumber,
        role: "USER",
      },
    });
    await sendMail({
      to: user.email,
      subject: "Welcome to Akshaya Exim Traders",
      text: `Hi ${name}, your account is ready. Start trading on akshayaexim.com`,
      purpose: "registration",
      portal: "main",
    });
    const token = signToken({ id: user.id, role: user.role, email: user.email }, SCOPE);
    res.json({ token, user: publicUser(user) });
  })
);

// Login (also used for staff/admin/superadmin - role decided by stored record)
router.post(
  "/login",
  asyncH(async (req, res) => {
    const { email, password, staff } = req.body;
    const user = await mainDb.user.findUnique({ where: { email: (email || "").toLowerCase() } });
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.isActive) return res.status(403).json({ error: "Account disabled" });
    // staff login page should only allow staff/admin/superadmin
    if (staff && !["STAFF", "ADMIN", "SUPERADMIN"].includes(user.role)) {
      return res.status(403).json({ error: "Not a staff account" });
    }
    const token = signToken({ id: user.id, role: user.role, email: user.email }, SCOPE);
    res.json({ token, user: publicUser(user) });
  })
);

router.post(
  "/google",
  asyncH(async (req, res) => {
    if (!(await isGoogleLoginEnabled())) {
      return res.status(403).json({ error: "Google login is not enabled. Contact administrator." });
    }
    const profile = await verifyGoogleIdToken(req.body.credential);
    if (!profile) return res.status(401).json({ error: "Invalid Google token" });
    let user = await mainDb.user.findUnique({ where: { email: profile.email.toLowerCase() } });
    if (!user) {
      user = await mainDb.user.create({
        data: { email: profile.email.toLowerCase(), name: profile.name, googleId: profile.sub, emailVerified: true, role: "USER" },
      });
    } else {
      if (!user.isActive) return res.status(403).json({ error: "Account disabled" });
      if (!user.googleId) {
        user = await mainDb.user.update({ where: { id: user.id }, data: { googleId: profile.sub, emailVerified: true } });
      }
    }
    const token = signToken({ id: user.id, role: user.role, email: user.email }, SCOPE);
    res.json({ token, user: publicUser(user) });
  })
);

router.post(
  "/forgot-password",
  asyncH(async (req, res) => {
    const { email } = req.body;
    const user = await mainDb.user.findUnique({ where: { email: (email || "").toLowerCase() } });
    if (user) {
      const token = nanoid(40);
      await mainDb.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetExpires: new Date(Date.now() + 1000 * 60 * 30) },
      });
      const link = `${process.env.CLIENT_ORIGIN || ""}/reset-password?token=${token}`;
      await sendMail({ to: user.email, purpose: "password_reset", subject: "Reset your password", text: `Reset link (valid 30 min): ${link}`, portal: "main" });
    }
    res.json({ ok: true, message: "If the email exists, a reset link was sent." });
  })
);

router.post(
  "/reset-password",
  asyncH(async (req, res) => {
    const { token, password } = req.body;
    const user = await mainDb.user.findFirst({ where: { resetToken: token, resetExpires: { gt: new Date() } } });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });
    await mainDb.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password), resetToken: null, resetExpires: null },
    });
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const user = await mainDb.user.findUnique({ where: { id: req.user.id } });
    res.json({ user: publicUser(user) });
  })
);

router.put(
  "/profile",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { name, phone, phoneCountryCode, companyName, gstNumber, accountType, billingAddress } = req.body;
    const data = {};
    if (name != null) data.name = name;
    if (phone != null) data.phone = phone;
    if (phoneCountryCode != null) data.phoneCountryCode = phoneCountryCode;
    if (companyName != null) data.companyName = companyName;
    if (gstNumber != null) data.gstNumber = gstNumber;
    if (billingAddress != null) data.billingAddress = billingAddress;
    if (accountType === "B2B" || accountType === "B2C") data.accountType = accountType;
    const user = await mainDb.user.update({ where: { id: req.user.id }, data });
    res.json({ user: publicUser(user) });
  })
);

router.post(
  "/change-password",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password required" });
    if (String(newPassword).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const user = await mainDb.user.findUnique({ where: { id: req.user.id } });
    if (!user?.passwordHash) return res.status(400).json({ error: "No password on file. Use Forgot Password to set one first." });
    if (!comparePassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    await mainDb.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });
    res.json({ ok: true, message: "Password updated" });
  })
);

router.post(
  "/change-email",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { currentPassword, newEmail } = req.body;
    if (!currentPassword || !newEmail) return res.status(400).json({ error: "Password and new email required" });
    const normalized = String(newEmail).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return res.status(400).json({ error: "Invalid email address" });
    const user = await mainDb.user.findUnique({ where: { id: req.user.id } });
    if (!user?.passwordHash) return res.status(400).json({ error: "No password on file. Use Forgot Password to set one first." });
    if (!comparePassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: "Password is incorrect" });
    }
    if (normalized === user.email) return res.status(400).json({ error: "New email is the same as current" });
    const clash = await mainDb.user.findUnique({ where: { email: normalized } });
    if (clash) return res.status(409).json({ error: "Email already in use" });
    const updated = await mainDb.user.update({
      where: { id: req.user.id },
      data: { email: normalized },
    });
    const token = signToken({ id: updated.id, role: updated.role, email: updated.email }, SCOPE);
    res.json({ ok: true, token, user: publicUser(updated), message: "Email updated" });
  })
);

export default router;
