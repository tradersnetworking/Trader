# API Connectivity Report — Invest Portal

**Automated probe:** `npm run audit:workflow` (production)

## Public endpoints (all pass)

| Method | Path | Result |
|--------|------|--------|
| GET | `/api/health` | 200 `ok:true` |
| GET | `/api/invest/public/plans` | 200 (42 plans) |
| GET | `/api/invest/public/gateways` | 200 |
| GET | `/api/invest/public/deposit-accounts` | 200 |
| GET | `/api/invest/public/crypto-rates` | 200 |
| GET | `/api/invest/public/homepage` | 200 |

## Auth gates (401 without token — pass)

- `/api/invest/dashboard`
- `/api/invest/kyc`, `/api/invest/kyc/draft`, `/api/invest/wallet`
- `POST /api/invest/kyc/files/:fieldKey`

## Investor (demo account — pass)

| Path | Status |
|------|--------|
| `/api/invest/dashboard` | 200 |
| `/api/invest/wallet` | 200 |
| `/api/invest/kyc` | 200 |
| `/api/invest/kyc/draft` | 200 |
| `/api/invest/notifications` | 200 |
| `/api/invest/notifications/list` | 200 |
| `/api/invest/subscriptions` | 200 |
| `/api/invest/deposits` | 200 |
| `/api/invest/payouts` | 200 |
| `/api/invest/referral/stats` | 200 |
| `/api/invest/agreements` | 200 |

## Admin (production)

Skipped when `E2E_ADMIN_PASSWORD` not configured (custom prod passwords). Routes verified in code: `/api/invest/admin/*` with `authRequired` + `adminOnly` + `requirePermission`.

**Score: 94/100**

## Broken / unused

- No 404 mismatches on critical investor paths.
- `GET /api/invest/plans` does not exist (by design — use `/api/invest/public/plans`).
