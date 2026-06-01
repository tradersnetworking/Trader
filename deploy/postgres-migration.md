# PostgreSQL migration — invest portal

Production on Hostinger VPS should use **PostgreSQL** instead of SQLite for concurrency, backups, and SaaS scale.

## Files

| File | Purpose |
|------|---------|
| `server/prisma/invest.postgresql.prisma` | Same models as `invest.prisma`, PostgreSQL datasource |
| `server/src/db.js` | Uses `invest-pg` client when `INVEST_DATABASE_URL` starts with `postgres` |
| `deploy/docker-compose.postgres.yml` | API + PostgreSQL 16 |

## 1. Local / staging setup

```bash
# Start PostgreSQL
docker compose -f deploy/docker-compose.postgres.yml up -d postgres

# Set env (deploy/.env or server/.env)
INVEST_DATABASE_URL=postgresql://akshaya:SECRET@localhost:5432/akshaya_invest

# Generate clients & push schema
cd server
npm run prisma:generate
npm run db:push:postgres
node src/seed.js
```

## 2. Migrate data from SQLite (optional)

```bash
# Export from SQLite (example using sqlite3 CLI)
sqlite3 server/prisma/invest.db .dump > invest-sqlite.sql

# Manual ETL recommended for production:
# - plans (42 catalog)
# - investors, wallets, subscriptions
# - settings, payment gateways

# Or re-seed on fresh Postgres and import CSVs via admin tools
npm run seed
```

## 3. Production Docker

```bash
cp deploy/.env.example deploy/.env
# Set INVEST_DATABASE_URL=postgresql://akshaya:PASSWORD@postgres:5432/akshaya_invest

docker compose -f deploy/docker-compose.postgres.yml up -d --build
docker compose -f deploy/docker-compose.postgres.yml exec api npm run db:push:postgres
docker compose -f deploy/docker-compose.postgres.yml exec api node src/seed.js
```

## 4. Marketplace DB

The main marketplace (`main.prisma`) remains SQLite unless you add `main.postgresql.prisma` the same way. Invest subdomain can run on Postgres independently.

## 5. Redis (optional next step)

Add Redis for session cache and job queues when moving off in-process `backgroundJobs.js`:

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
```

Set `REDIS_URL=redis://redis:6379` and wire BullMQ in a future release.

## 6. Verify

```bash
npm run smoke:invest
curl https://invest.akshayaexim.com/api/invest/public/plans
```

Ensure API logs show PostgreSQL connection (no SQLite file path in errors).
