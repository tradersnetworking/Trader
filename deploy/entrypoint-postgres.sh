#!/bin/sh
set -e
cd /app/server
echo "[entrypoint-postgres] PostgreSQL invest DB + SQLite marketplace DB"
npm run db:push:postgres
npx prisma db push --schema prisma/main.prisma
if [ ! -f /app/data/.seeded ]; then
  node src/seed.js
  mkdir -p /app/data
  touch /app/data/.seeded
  echo "[entrypoint-postgres] Initial seed complete."
fi
cd /app
exec node server/src/index.js
