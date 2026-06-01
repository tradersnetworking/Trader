# Akshaya Exim — Full deployment (all domains)

Deploy **akshayaexim.com**, **akshayaexim.in**, **invest.akshayaexim.com**, and **invest.akshayaexim.in** on Ubuntu 24.04 (Hostinger VPS) with Docker, Nginx, and Let's Encrypt.

## Why sites may show "Work in progress" or 503

| Symptom | Cause | Fix |
|---------|--------|-----|
| `akshayaexim.com` shows Hostinger "Work in progress" | DNS points to **Website Builder**, not your VPS | [DNS setup](#1-dns-hostinger) below |
| `invest.akshayaexim.com` returns **503** | API container down or Nginx not proxying to `:4000` | [Docker + Nginx](#3-docker-api) below |
| Blank page after deploy | DB not initialized | Entrypoint runs `db:push` + seed on first start |

## 1. DNS (Hostinger)

In **Hostinger → Domains → DNS** for **both** `akshayaexim.com` and `akshayaexim.in`:

1. **Remove or disable** the Website Builder / parking page for the root domain.
2. Add **A records** pointing to your **VPS public IP**:

| Host / Name | Type | Points to |
|-------------|------|-----------|
| `@` | A | `YOUR_VPS_IP` |
| `www` | A | `YOUR_VPS_IP` |
| `invest` | A | `YOUR_VPS_IP` |

Repeat for both `.com` and `.in` zones.

Wait 5–30 minutes for DNS propagation, then verify:

```bash
dig +short akshayaexim.com
dig +short invest.akshayaexim.com
```

Both should return your VPS IP (not Hostinger builder IPs).

## 2. Server setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
# log out and back in
```

## 3. Docker API

```bash
git clone https://github.com/tradersnetworking/Trader.git /opt/akshaya-exim
cd /opt/akshaya-exim
cp deploy/.env.example deploy/.env
nano deploy/.env   # set JWT_SECRET, SMTP, payment keys
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f api   # wait for "API running"
curl -s http://127.0.0.1:4000/api/health
```

First boot creates SQLite databases and seeds marketplace + invest data automatically.

## 4. Nginx + SSL (all four domains)

```bash
sudo cp deploy/nginx/main.conf /etc/nginx/sites-available/akshayaexim-main
sudo cp deploy/nginx/invest.conf /etc/nginx/sites-available/akshayaexim-invest
sudo ln -sf /etc/nginx/sites-available/akshayaexim-main /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/akshayaexim-invest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx \
  -d akshayaexim.com -d www.akshayaexim.com \
  -d akshayaexim.in -d www.akshayaexim.in

sudo certbot --nginx \
  -d invest.akshayaexim.com -d invest.akshayaexim.in
```

## 5. Smoke test

```bash
curl -s https://akshayaexim.com/api/health
curl -s https://akshayaexim.com/api/main/categories | head -c 200
curl -s https://invest.akshayaexim.com/api/health
curl -s https://invest.akshayaexim.com/api/invest/public/plans | head -c 200
```

Open in browser:

- https://akshayaexim.com — marketplace home
- https://akshayaexim.in — same app (alternate TLD)
- https://invest.akshayaexim.com — invest portal
- https://invest.akshayaexim.in — invest portal (.in)

## 6. Updates

```bash
cd /opt/akshaya-exim
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

To re-seed marketplace catalog only (resets products/categories):

```bash
docker compose -f deploy/docker-compose.yml exec api sh -c "cd /app/server && node src/seed.js"
```

## 7. PostgreSQL (optional, invest DB)

See [deploy/postgres-migration.md](postgres-migration.md).

```bash
docker compose -f deploy/docker-compose.postgres.yml up -d --build
```

## Seed logins (change in production)

| Portal | Email | Password |
|--------|-------|----------|
| Both super admin | `superadmin@akshayaexim.com` | `Admin@12345` |
| Invest demo | `investor@akshayaexim.com` | `Investor@123` |
| Marketplace demo | `user@akshayaexim.com` | `User@123` |

## Local development

```bash
npm install
npm run setup && npm run seed
npm run dev:server   # :4000
npm run dev:web      # :5173 — marketplace at /, invest at /invest/
```

## E2E tests

```bash
npm run test:e2e
```
