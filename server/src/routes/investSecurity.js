import { Router } from "express";
import { investDb } from "../db.js";
import { asyncH, authRequired } from "../middleware.js";
import {
  generateTotpSecret,
  enableTotp,
  disableTotp,
  verifyInvestor2FA,
} from "../services/twoFactor.js";
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  listPasskeys,
  deletePasskey,
} from "../services/webauthnService.js";
import { getSecuritySettings } from "../middleware/geoBlock.js";
import { getVapidPublicKey, savePushSubscription } from "../services/pushService.js";

const router = Router();
const SCOPE = "invest";

router.get(
  "/security",
  asyncH(async (_req, res) => {
    res.json(await getSecuritySettings());
  })
);

/* -------- TOTP 2FA -------- */
router.post(
  "/2fa/setup",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id } });
    const { secret, uri } = generateTotpSecret(inv.email);
    res.json({ secret, uri, enabled: inv.totpEnabled });
  })
);

router.post(
  "/2fa/enable",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { secret, token } = req.body;
    const result = await enableTotp(req.user.id, secret, token);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

router.post(
  "/2fa/disable",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id } });
    const result = await disableTotp(req.user.id, req.body.token, inv);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

router.get(
  "/2fa/status",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id } });
    res.json({ enabled: inv.totpEnabled, passkeys: await listPasskeys(req.user.id) });
  })
);

/* -------- WebAuthn passkeys -------- */
router.post(
  "/webauthn/register/options",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    res.json(await getRegistrationOptions(req.user));
  })
);

router.post(
  "/webauthn/register/verify",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    await verifyRegistration(req.user, req.body, req.body.deviceName);
    res.json({ ok: true });
  })
);

router.post(
  "/webauthn/authenticate/options",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    res.json(await getAuthenticationOptions(req.user));
  })
);

router.delete(
  "/webauthn/credentials/:id",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    await deletePasskey(req.user.id, req.params.id);
    res.json({ ok: true });
  })
);

/* -------- Push notifications -------- */
router.get(
  "/push/vapid",
  asyncH(async (_req, res) => {
    res.json({ publicKey: await getVapidPublicKey() });
  })
);

router.post(
  "/push/subscribe",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    await savePushSubscription(req.user.id, req.body);
    res.json({ ok: true });
  })
);

/* -------- Onboarding wizard -------- */
router.get(
  "/onboarding",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const inv = await investDb.investor.findUnique({ where: { id: req.user.id }, include: { onboardingDraft: true, kyc: true } });
    res.json({
      step: inv.onboardingStep || 1,
      complete: inv.onboardingComplete,
      draft: inv.onboardingDraft?.data ? JSON.parse(inv.onboardingDraft.data) : {},
      kycStatus: inv.kyc?.status,
    });
  })
);

router.put(
  "/onboarding",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const { step, data, complete } = req.body;
    if (data) {
      await investDb.onboardingDraft.upsert({
        where: { investorId: req.user.id },
        create: { investorId: req.user.id, step: step || 1, data: JSON.stringify(data) },
        update: { step: step || 1, data: JSON.stringify(data) },
      });
    }
    if (step) await investDb.investor.update({ where: { id: req.user.id }, data: { onboardingStep: Number(step) } });
    if (complete) await investDb.investor.update({ where: { id: req.user.id }, data: { onboardingComplete: true } });
    res.json({ ok: true });
  })
);

router.put(
  "/locale",
  authRequired(SCOPE),
  asyncH(async (req, res) => {
    const locale = String(req.body.locale || "en").slice(0, 5);
    await investDb.investor.update({ where: { id: req.user.id }, data: { locale } });
    res.json({ locale });
  })
);

export default router;
