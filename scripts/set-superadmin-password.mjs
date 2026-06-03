/**
 * One-off: set super admin email/password on main + invest DBs.
 * Usage (inside API container): node /app/set-sa.mjs
 */
import bcrypt from "bcryptjs";
import { PrismaClient as MainClient } from "./node_modules/.prisma/main/index.js";
import { PrismaClient as InvestClient } from "./node_modules/.prisma/invest/index.js";

const EMAIL = process.env.SUPERADMIN_EMAIL || "superadmin@akshayaexim.com";
const PASSWORD = process.env.SUPERADMIN_PASSWORD;
if (!PASSWORD) {
  console.error(JSON.stringify({ ok: false, error: "Set SUPERADMIN_PASSWORD env var" }));
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(PASSWORD, 10);
const staffFields = {
  passwordHash,
  role: "SUPERADMIN",
  emailVerified: true,
  name: "Super Admin",
};

const mainDb = new MainClient();
const investDb = new InvestClient();

async function upsertMain() {
  const existing = await mainDb.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    await mainDb.user.update({ where: { id: existing.id }, data: staffFields });
    return "updated";
  }
  await mainDb.user.create({ data: { email: EMAIL, ...staffFields } });
  return "created";
}

async function upsertInvest() {
  const existing = await investDb.investor.findUnique({ where: { email: EMAIL } });
  if (existing) {
    await investDb.investor.update({ where: { id: existing.id }, data: staffFields });
    return "updated";
  }
  await investDb.investor.create({ data: { email: EMAIL, ...staffFields } });
  return "created";
}

try {
  const main = await upsertMain();
  const invest = await upsertInvest();
  console.log(JSON.stringify({ ok: true, email: EMAIL, main, invest }));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
} finally {
  await mainDb.$disconnect();
  await investDb.$disconnect();
}
