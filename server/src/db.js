// Two physically separate databases:
//  - mainDb  -> akshayaexim.com / .in   (marketplace)
//  - investDb -> invest.akshayaexim.com / .in (investor portal)
import { PrismaClient as MainClient } from "../node_modules/.prisma/main/index.js";
import { PrismaClient as InvestClient } from "../node_modules/.prisma/invest/index.js";

export const mainDb = new MainClient();
export const investDb = new InvestClient();
