# Performance Report

## Production observations

| Endpoint | Typical |
|----------|---------|
| `/api/health` | < 100ms |
| `/api/invest/public/plans` | < 300ms |
| `/api/invest/dashboard` (auth) | < 500ms |

## Optimizations in place

- Vite code-splitting + hashed asset immutable cache (1y).
- `index.html` no-cache.
- Nginx `client_max_body_size 100m`, 300s proxy timeouts for KYC.
- ROI / marketplace jobs guarded with `roiRunning` flags (no overlap).

## Gaps

- No formal load test (k6/Artillery) at target QPS.
- Admin list endpoints use `take` limits but some default to 100–200 rows.

**Score: 88/100**
