import { Router } from "express";
import { nanoid } from "nanoid";
import { investDb } from "../db.js";
import { asyncH, authRequired } from "../middleware.js";
import { hashPassword, comparePassword } from "../utils/auth.js";
import { issueAuthToken, reissueAuthToken, revokeAuthSession } from "../services/authSession.js";
import { sendMail } from "../utils/mailer.js";
import { verifyGoogleIdToken } from "../utils/google.js";
import { publicInvestor } from "../utils/investorUser.js";
import { verifyInvestor2FA } from "../services/twoFactor.js";
import { resolveReferrer, ensureReferralCode, generateReferralCode } from "../services/referral.js";
import {
  generateCaptcha,
  sendRegisterOtp,
  verifyRegisterOtp,
  consumeEmailVerification,
} from "../services/registerVerification.js";
import {
  getLoginAuthenticationOptions,
  verifyLoginAuthentication,
  isWebAuthnSupported,
} from "../services/webauthnService.js";
import { setPending2FA, getPending2FA, consumePending2FA } from "../services/loginPending2fa.js";

const router = Router();
const SCOPE = "invest";

const userInclude = { kyc: { select: { photo: true, selfie: true } } };

router.get(
  "/webauthn/available",
  asyncH(async (_req, res) => {
    res.json({ supported: isWebAuthnSupported() });
  })
);

router.post(
  "/webauthn/login/options",
  asyncH(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
      const result = await getLoginAuthenticationOptions(email);
      res.json({ options: result.options, investorId: result.investorId });
    } catch (e) {
      res.status(400).json({ error: e.message || "Passkey login unavailable" });
    }
  })
);

router.post(
  "/webauthn/login/verify",
  asyncH(async (req, res) => {
    const { email, ...assertion } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
      const investor = await verifyLoginAuthentication(email, assertion);
      const token = await issueAuthToken(SCOPE, { id: investor.id, role: investor.role, email: investor.email });
      res.json({ token, user: publicInvestor(investor) });
    } catch (e) {
      res.status(401).json({ error: e.message || "Passkey login failed" });
    }
  })
);

router.post(
  "/webauthn/login/2fa/options",
  asyncH(async (req, res) => {
    const { email } = req.body;
    if (!email || !getPending2FA(email)) {
      return res.status(400).json({ error: "2FA session expired. Sign in with password again." });
    }
    try {
      const result = await getLoginAuthenticationOptions(email, "auth:2fa");
      res.json({ options: result.options });
    } catch (e) {
      res.status(400).json({ error: e.message || "Passkey 2FA unavailable" });
    }
  })
);

router.post(
  "/webauthn/login/2fa/verify",
  asyncH(async (req, res) => {
    const { email, ...assertion } = req.body;
    const pending = getPending2FA(email);
    if (!pending) return res.status(400).json({ error: "2FA session expired. Sign in with password again." });
    try {
      const investor = await verifyLoginAuthentication(email, assertion, "auth:2fa");
      if (investor.id !== pending.investorId) throw new Error("Passkey verification failed");
      if (pending.staff && !["ADMIN", "SUPERADMIN"].includes(investor.role)) {
        return res.status(403).json({ error: "Not a staff account" });
      }
      consumePending2FA(email);
      const token = await issueAuthToken(SCOPE, { id: investor.id, role: investor.role, email: investor.email });
      res.json({ token, user: publicInvestor(investor) });
    } catch (e) {
      res.status(401).json({ error: e.message || "Passkey 2FA failed" });
    }
  })
);

router.get(
  "/register/captcha",
  asyncH(async (_req, res) => {
    res.json(generateCaptcha());
  })
);

router.post(
  "/register/send-otp",
  asyncH(async (req, res) => {
    const { email, captchaToken, captchaAnswer } = req.body;
    const result = await sendRegisterOtp(email, captchaToken, captchaAnswer);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

router.post(
  "/register/verify-otp",
  asyncH(async (req, res) => {
    const { otpSessionToken, email, code } = req.body;
    const result = await verifyRegisterOtp(otpSessionToken, email, code);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

router.post(
  "/register",
  asyncH(async (req, res) => {
    const { email, password, name, phone, referralCode, verificationToken, signatureData, acceptTerms } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "name, email, password required" });
    if (!verificationToken || !consumeEmailVerification(verificationToken, email)) {
      return res.status(400).json({ error: "Email verification required. Complete OTP step first." });
    }
    if (!acceptTerms) return res.status(400).json({ error: "You must accept the terms and conditions" });
    const exists = await investDb.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const referrer = referralCode ? await resolveReferrer(referralCode) : null;
    const investor = await investDb.investor.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        name,
        phone,
        phoneCountryCode: phoneCountryCode || "+91",
        role: "INVESTOR",
        emailVerified: true,
        referralCode: generateReferralCode(name),
        referredById: referrer?.id || null,
      },
    });
    if (signatureData) {
      await investDb.onboardingDraft.upsert({
        where: { investorId: investor.id },
        create: { investorId: investor.id, data: JSON.stringify({ registrationSignature: signatureData }) },
        update: { data: JSON.stringify({ registrationSignature: signatureData }) },
      });
    }
    // create wallet
    await investDb.wallet.create({ data: { investorId: investor.id } });
    if (referralCode) {
      await investDb.auditLog.create({
        data: {
          action: "REFERRAL_REGISTER",
          entity: "Referral",
          entityId: String(referralCode).trim().toUpperCase(),
          actorId: investor.id,
          actorName: investor.name,
          meta: JSON.stringify({ referredById: referrer?.id || null }),
        },
      }).catch(() => {});
    }
    await sendMail({ to: investor.email, purpose: "registration", subject: "Welcome to Akshaya Exim Invest", text: `Hi ${name}, start investing at invest.akshayaexim.com` });
    const token = await issueAuthToken(SCOPE, { id: investor.id, role: investor.role, email: investor.email });
    res.json({ token, user: publicInvestor(investor) });
  })
);

router.post(
  "/login",
  asyncH(async (req, res) => {
    const { email, password, staff } = req.body;
    const investor = await investDb.investor.findUnique({
      where: { email: (email || "").toLowerCase() },
      include: userInclude,
    });
    if (!investor || !comparePassword(password, investor.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!investor.isActive) return res.status(403).json({ error: "Account disabled" });
    if (staff && !["ADMIN", "SUPERADMIN"].includes(investor.role)) {
      return res.status(403).json({ error: "Not a staff account" });
    }
    if (investor.totpEnabled) {
      const { totpCode } = req.body;
      if (!totpCode) {
        const passkeyCount = await investDb.webAuthnCredential.count({ where: { investorId: investor.id } });
        setPending2FA(investor.email, { investorId: investor.id, staff: !!staff });
        return res.json({
          requires2FA: true,
          passkeyAvailable: passkeyCount > 0,
          email: investor.email,
          message: "Enter your authenticator code or use a passkey",
        });
      }
      const tfa = await verifyInvestor2FA(investor, totpCode);
      if (!tfa.ok) return res.status(401).json({ error: tfa.error || "Invalid 2FA code" });
    }
    const token = await issueAuthToken(SCOPE, { id: investor.id, role: investor.role, email: investor.email });
    res.json({ token, user: publicInvestor(investor) });
  })
);

router.post(
  "/google",
  asyncH(async (req, res) => {
    const profile = await verifyGoogleIdToken(req.body.credential);
    if (!profile) return res.status(401).json({ error: "Invalid Google token" });
    let investor = await investDb.investor.findUnique({ where: { email: profile.email.toLowerCase() }, include: userInclude });
    if (!investor) {
      investor = await investDb.investor.create({
        data: {
          email: profile.email.toLowerCase(),
          name: profile.name,
          googleId: profile.sub,
          emailVerified: true,
          role: "INVESTOR",
          referralCode: generateReferralCode(profile.name),
        },
        include: userInclude,
      });
      await investDb.wallet.create({ data: { investorId: investor.id } });
    }
    const token = await issueAuthToken(SCOPE, { id: investor.id, role: investor.role, email: investor.email });
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
      await sendMail({ to: investor.email, purpose: "password_reset", subject: "Reset your password", text: `Reset link (valid 30 min): ${link}` });
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
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id }, include: userInclude });
    if (investor) await ensureReferralCode(investor.id);
    const fresh = await investDb.investor.findUnique({ where: { id: req.user.id }, include: userInclude });
    res.json({ user: publicInvestor(fresh) });
  })
);

router.post(
  "/change-password",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password required" });
    if (String(newPassword).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    if (!investor?.passwordHash) return res.status(400).json({ error: "No password on file. Use Forgot Password to set one first." });
    if (!comparePassword(currentPassword, investor.passwordHash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    await investDb.investor.update({
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
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    if (!investor?.passwordHash) return res.status(400).json({ error: "No password on file. Use Forgot Password to set one first." });
    if (!comparePassword(currentPassword, investor.passwordHash)) {
      return res.status(401).json({ error: "Password is incorrect" });
    }
    if (normalized === investor.email) return res.status(400).json({ error: "New email is the same as current" });
    const clash = await investDb.investor.findUnique({ where: { email: normalized } });
    if (clash) return res.status(409).json({ error: "Email already in use" });
    const updated = await investDb.investor.update({
      where: { id: req.user.id },
      data: { email: normalized },
    });
    const token = await reissueAuthToken(SCOPE, { id: updated.id, role: updated.role, email: updated.email }, req.user.sid);
    res.json({ ok: true, token, user: publicInvestor(updated), message: "Email updated" });
  })
);

router.post(
  "/logout",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    await revokeAuthSession(SCOPE, req.user.id);
    res.json({ ok: true });
  })
);

export default router;
