#!/bin/sh
set -e
cd /app/server

mkdir -p /data

ensure_db_file() {
  target="$1"
  if [ ! -f "$target" ]; then
    touch "$target"
  fi
}

ensure_db_file /data/main.db
ensure_db_file /data/invest.db

echo "[entrypoint] Ensuring SQLite databases…"
if [ ! -s /data/main.db ] || [ ! -s /data/invest.db ]; then
  npm run db:push
  node src/seed.js
  echo "[entrypoint] Database initialized and seeded."
else
  npm run db:push
  echo "[entrypoint] Databases present — schema synced."
fi

echo "[entrypoint] Syncing RBAC role defaults…"
cd /app/server
node --input-type=module <<'RBAC_EOF' || true
import { syncRolePermissionDefaults } from "./src/services/rbac.js";
await syncRolePermissionDefaults();
console.log("[entrypoint] RBAC defaults synced.");
RBAC_EOF

echo "[entrypoint] Ensuring mailbox configs (5 x main .com, 5 x invest .in)…"
cd /app/server
node --input-type=module <<'MAIL_EOF' || true
import { ensureAllEmailInfrastructure } from "./src/services/mailboxProvisioning.js";
const r = await ensureAllEmailInfrastructure({ provisionSmtp: Boolean(process.env.SMTP_PASS || process.env.INVEST_MAILBOX_SMTP_PASS || process.env.MAIN_MAILBOX_SMTP_PASS) });
console.log("[entrypoint] Mail provision:", JSON.stringify(r));
MAIL_EOF
cd /app

exec node server/src/index.js
