#!/bin/sh
set -e
cd /app/server

echo "[entrypoint] Ensuring SQLite databases…"
if [ ! -f prisma/main.db ] || [ ! -f prisma/invest.db ]; then
  npm run db:push
  node src/seed.js
  echo "[entrypoint] Database initialized and seeded."
else
  echo "[entrypoint] Databases present — skipping seed."
fi

cd /app
exec node server/src/index.js
