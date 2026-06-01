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

cd /app
exec node server/src/index.js
