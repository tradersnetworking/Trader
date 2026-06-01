#!/bin/sh
set -e
CLIENT_ID="${1:?Usage: set-google-settings.sh CLIENT_ID}"
cd /opt/akshaya-exim
if grep -q '^GOOGLE_CLIENT_ID=' deploy/.env; then
  sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${CLIENT_ID}|" deploy/.env
else
  echo "GOOGLE_CLIENT_ID=${CLIENT_ID}" >> deploy/.env
fi
docker compose -f deploy/docker-compose.yml exec -T api node --input-type=module <<EOF
import { investDb } from "/app/server/src/db.js";
const id = "${CLIENT_ID}";
for (const [key, value] of [
  ["main_google_client_id", id],
  ["main_google_login_enabled", "true"],
]) {
  await investDb.investSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
console.log("ok");
EOF
