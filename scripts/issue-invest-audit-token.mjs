#!/usr/bin/env node
/** Issue JWT for dashboard audit — run inside API container on VPS. */
import { investDb } from "../server/src/db.js";
import { issueAuthToken } from "../server/src/services/authSession.js";

const role = process.argv[2] || "SUPERADMIN";
const user = await investDb.investor.findFirst({
  where: role === "INVESTOR" ? { role: "INVESTOR", email: process.env.E2E_INVESTOR_EMAIL || "investor@akshayaexim.com" } : { role: { in: ["SUPERADMIN", "ADMIN"] } },
  orderBy: { role: "desc" },
});
if (!user) {
  console.error(JSON.stringify({ error: `No ${role} user found` }));
  process.exit(1);
}
const token = await issueAuthToken("invest", { id: user.id, role: user.role, email: user.email });
console.log(JSON.stringify({ email: user.email, role: user.role, token }));
