#!/bin/sh
# Run full dashboard API audit on VPS (admin token from DB — no password needed).
set -e
cd /opt/akshaya-exim
COMPOSE="docker compose -f deploy/docker-compose.yml"
TOKEN=$($COMPOSE exec -T api node --input-type=module -e '
import { investDb } from "./server/src/db.js";
import { issueAuthToken } from "./server/src/services/authSession.js";
const u = await investDb.investor.findFirst({ where: { role: "SUPERADMIN" } });
if (!u) { console.error("no superadmin"); process.exit(1); }
const token = await issueAuthToken("invest", { id: u.id, role: u.role, email: u.email });
process.stdout.write(token);
')
$COMPOSE cp scripts/dashboard-api-audit.mjs api:/tmp/dashboard-api-audit.mjs
$COMPOSE exec -T \
  -e INVEST_API=http://127.0.0.1:4000 \
  -e INVEST_ADMIN_TOKEN="$TOKEN" \
  -e INVEST_SKIP_INVESTOR=1 \
  api node /tmp/dashboard-api-audit.mjs
