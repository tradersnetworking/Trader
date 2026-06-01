// Two physically separate databases:
//  - mainDb  -> akshayaexim.com / .in   (marketplace)
//  - investDb -> invest.akshayaexim.com / .in (investor portal)
import { createRequire } from "node:module";
import { PrismaClient as MainClient } from "../node_modules/.prisma/main/index.js";
import { PrismaClient as InvestSqliteClient } from "../node_modules/.prisma/invest/index.js";

const require = createRequire(import.meta.url);
const usePg = String(process.env.INVEST_DATABASE_URL || "").startsWith("postgres");

let InvestPgClient = null;
if (usePg) {
  try {
    InvestPgClient = require("../node_modules/.prisma/invest-pg/index.js").PrismaClient;
  } catch {
    console.warn("[db] INVEST_DATABASE_URL is postgres but invest-pg Prisma client missing — run npm run prisma:generate");
  }
}

export const mainDb = new MainClient();
export const investDb = usePg && InvestPgClient ? new InvestPgClient() : new InvestSqliteClient();
