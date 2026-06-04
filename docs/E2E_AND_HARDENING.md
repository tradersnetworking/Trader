# E2E, load test, Redis, and ClamAV

## Commands

| Command | Purpose |
|---------|---------|
| `npm run audit:load` | 20s load test on public invest APIs |
| `npm run audit:full` | Unit + smoke + prod + load + workflow |
| `npm run e2e:fixture` | Generate `e2e/fixtures/kyc-sample.pdf` |
| `npm run test:e2e:prod` | Prod KYC **API** upload (Playwright) |
| `E2E_UI=1 npm run test:e2e:prod` | Includes UI upload test (needs deployed `data-testid`) |
| `npm run test:e2e:admin` | Admin API probe (requires env below) |

## Production admin E2E (set on VPS only)

Add to `deploy/.env` on the server (never commit real passwords):

```env
E2E_ADMIN_EMAIL=your-superadmin@akshayaexim.com
E2E_ADMIN_PASSWORD=your-actual-password
```

Then from your machine:

```powershell
$env:E2E_ADMIN_EMAIL="..."
$env:E2E_ADMIN_PASSWORD="..."
npm run test:e2e:admin
npm run audit:workflow
```

## Docker (Redis + ClamAV)

`deploy/docker-compose.yml` includes:

- **redis** — `REDIS_URL=redis://redis:6379` (default on API service)
- **clamscan** in API image — `KYC_VIRUS_SCAN_CMD=clamscan --no-summary {file}`

After deploy, first virus-db update runs in background via `freshclam` in entrypoint.

## Load test thresholds

- Fail rate &lt; 2%
- p95 latency &lt; 3000ms
- Default: 15 workers, 20s, `https://invest.akshayaexim.com`
