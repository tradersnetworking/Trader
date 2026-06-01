import { investDb } from "../../server/src/db.js";

const clientId = process.env.GOOGLE_CLIENT_ID || process.argv[2];
if (!clientId) {
  console.error("Usage: GOOGLE_CLIENT_ID=... node enable-google-login.mjs");
  process.exit(1);
}

for (const [key, value] of [
  ["main_google_client_id", clientId],
  ["main_google_login_enabled", "true"],
]) {
  await investDb.investSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

console.log("Google login enabled in site settings.");
