import webpush from "web-push";
import { investDb } from "../db.js";
import { getSetting, setSettings } from "./investSettings.js";

let configured = false;

async function ensureVapid() {
  if (configured) return;
  let publicKey = await getSetting("vapid_public_key");
  let privateKey = await getSetting("vapid_private_key");
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    await setSettings({ vapid_public_key: publicKey, vapid_private_key: privateKey });
  }
  webpush.setVapidDetails("mailto:support@akshayaexim.com", publicKey, privateKey);
  configured = true;
  return publicKey;
}

export async function getVapidPublicKey() {
  return ensureVapid();
}

export async function savePushSubscription(investorId, sub) {
  return investDb.pushSubscription.upsert({
    where: { investorId_endpoint: { investorId, endpoint: sub.endpoint } },
    create: { investorId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function sendPushToUser(investorId, { title, body, url }) {
  await ensureVapid();
  const subs = await investDb.pushSubscription.findMany({ where: { investorId } });
  const payload = JSON.stringify({ title, body, url: url || "/dashboard" });
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
    } catch {
      await investDb.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
    }
  }
}
