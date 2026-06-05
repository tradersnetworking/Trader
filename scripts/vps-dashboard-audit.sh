#!/bin/sh
# Run full dashboard API audit on VPS (admin token from DB — no password needed).
set -e
cd /opt/akshaya-exim
TOKEN=$(docker compose -f deploy/docker-compose.yml exec -T api node --input-type=module -e '
import { investDb } from "./server/src/db.js";
import { issueAuthToken } from "./server/src/services/authSession.js";
const u = await investDb.investor.findFirst({ where: { role: "SUPERADMIN" } });
if (!u) { console.error("no superadmin"); process.exit(1); }
const token = await issueAuthToken("invest", { id: u.id, role: u.role, email: u.email });
process.stdout.write(token);
')
export INVEST_API="${INVEST_API:-http://127.0.0.1:4000}"
export INVEST_ADMIN_TOKEN="$TOKEN"
export INVEST_SKIP_INVESTOR=1
exec node scripts/dashboard-api-audit.mjs
