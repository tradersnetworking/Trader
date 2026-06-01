# Akshaya ExIm Invest — Hostinger VPS Deployment

Deploy **invest.akshayaexim.com** and **invest.akshayaexim.in** on Ubuntu 24.04 with Docker, Nginx, and Let's Encrypt SSL.

## Prerequisites

- Hostinger VPS (Ubuntu 24.04 LTS)
- DNS A records: `invest.akshayaexim.com`, `invest.akshayaexim.in` → VPS IP
- SMTP credentials (noreply@ / manager@)
- Payment gateway keys (Razorpay, Cashfree, etc.)

## 1. Server setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
```

## 2. Clone & configure

```bash
git clone <your-repo> /opt/akshaya-exim
cd /opt/akshaya-exim
cp deploy/.env.example deploy/.env
nano deploy/.env
```

## 3. Build & run (Docker)

```bash
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml exec api npm run seed
```

## 4. Nginx + SSL

```bash
sudo cp deploy/nginx/invest.conf /etc/nginx/sites-available/invest.akshayaexim.com
sudo ln -sf /etc/nginx/sites-available/invest.akshayaexim.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d invest.akshayaexim.com -d invest.akshayaexim.in
```

## 5. Smoke test

- `curl https://invest.akshayaexim.com/api/health`
- Register → KYC → deposit → invest → certificate → verify QR

## 6. Backups

```bash
docker compose -f deploy/docker-compose.yml exec api tar czf - /app/server/prisma/*.db > backup-$(date +%F).tar.gz
```

## 7. PostgreSQL (recommended)

See [deploy/postgres-migration.md](deploy/postgres-migration.md) for full steps.

```bash
docker compose -f deploy/docker-compose.postgres.yml up -d --build
```

## Seed logins (change in production)

- Super Admin: `superadmin@akshayaexim.com` / `Admin@12345`
- Investor: `investor@akshayaexim.com` / `Investor@123`

## E2E tests (Playwright)

```bash
npm install
npx playwright install chromium
# API on :4000, web on :5173 (or PLAYWRIGHT_SKIP_WEBSERVER=1 if already running)
npm run test:e2e
```

Optional authenticated test:

```bash
E2E_INVESTOR_EMAIL=investor@akshayaexim.com E2E_INVESTOR_PASSWORD=Investor@123 npm run test:e2e
```
